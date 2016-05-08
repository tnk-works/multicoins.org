'use strict';

const bitcoin = require('multicoinjs-lib');
const utils = require('./utils.js');
const alerts = require('./alerts');
const $ = require('jquery');

exports.ChangeBalance = function(fNewBalance)
{
    if (fNewBalance < 1.e-12) fNewBalance = 0;
    
    $('#spanModalBalance').text(fNewBalance);
    
    $('.groupBalance').removeClass('has-error');
    $('.groupBalance').addClass('has-success');
    if (fNewBalance < 0)
    {
        $('.groupBalance').removeClass('has-success');
        $('.groupBalance').addClass('has-error');
    }
    
}

exports.onOpenDialog = function(network, address, strLabel, strCoinShortName)
{
    $('#inputModalSendAddressLabel').val(strLabel);
    $('#inputModalSendFee').val('');
    $("#inputModalSendAmount").val('');
    $('#spanModalAmountCoinName').text(strCoinShortName);
    $('#spanModalFeeCoinName').text(strCoinShortName);
    $('#spanModalBalance').text(utils.getSavedBalance(network));
            
    $('#inputModalSendNetwork').val(network);
    $('#inputModalSendAddress').val(address);
    
    function onChangeFee()
    {
        var sendFee = parseFloat($( '#inputModalSendFee' ).val());
        if (isNaN(sendFee))
            sendFee = parseFloat(utils.coinsInfo[network].fee.toPrecision(12));
        else
            sendFee = parseFloat(sendFee.toPrecision(12));

        $('#inputModalSendFee').val(sendFee);
        $('#inputModalSendFee')[0].placeholder = sendFee;
        $('.spanRecommendedFee').text('(recommended minimum '+sendFee+' )');

        var sendAmount = parseFloat($( "#inputModalSendAmount" ).val());
        if (isNaN(sendAmount))
            sendAmount = 0;

        exports.ChangeBalance(
            parseFloat( (utils.getSavedBalance(network)-sendAmount-sendFee).toPrecision(12)) );
    }
    
    $( "#inputModalSendFee" ).on('input', onChangeFee);
       
    onChangeFee();   

    jQuery('#send_coins_to').modal('show');
   
};

$('#btnSendCoinsReady').click(function () {
    console.log('btnSendCoinsReady click');
    const password = $('#inputSendMoneyPassword').val();
    if (utils.getSavedEncodePassword().length && !utils.isValidEncodePassword(password))
    {
        console.log('Invalid send password: ' + password);
        alerts.Alert('Error', 'Invalid password!');
        return;
    }
    jQuery('#send_coins_to').modal('hide');
    
    var rowSentInfo = [];
    var dFullSentAmount = 0.0;
    for (var i=0; i<$('.rowAddressSendTo').length; i++)
    {
        const row = $('.rowAddressSendTo')[i];
        const sendAmount = parseFloat($(row).find('#inputModalSendAmount').val());
        if (isNaN(sendAmount) || sendAmount <= 0)
        {
            alerts.Alert('Error', 'Bad send amount');
            return;
        }
        dFullSentAmount += sendAmount;
        
        rowSentInfo.push({addressSendTo : $(row).find('.spanAddressTo').text(), sendAmount : sendAmount});
    }
    
    console.log('btnSendCoinsReady sent amount checked');

    /*const addressSendTo = $('.spanAddressTo')[0].textContent;

    const sendAmount = parseFloat($( "#inputModalSendAmount" ).val());
    if (isNaN(sendAmount) || sendAmount <= 0)
    {
        alert('ERROR: bad send amount');
        return;
    }*/
    
    var sendFee = parseFloat($( '#inputModalSendFee' ).val());
    if (isNaN(sendFee) || sendFee < 0)
        sendFee = 0.0;
        
    const network = $('#inputModalSendNetwork').val();
   // require('./app').RefreshKeyPairsBalance(network);
    
    var jsonSavedKeyPairs = utils.getItem("KeyPairs").value || {}; 

    var addresses = [];
    for (var key in jsonSavedKeyPairs)
    {
        if (utils.coinsInfo[jsonSavedKeyPairs[key].network] != utils.coinsInfo[network])
            continue;
            
        if (parseFloat(jsonSavedKeyPairs[key].balance) <= 0.0)
            continue;
            
        addresses.push(jsonSavedKeyPairs[key].address);
    }

    if (!addresses.length)
    {
        alerts.Alert("Error", "Bad balance or network.<br>Please check balance for the '"+utils.coinsInfo[network].name+"' network.");
        return;
    }
    
    console.log('call getUnspentTransactions');
    utils.getUnspentTransactions(network, addresses, function(netID, data) {
        if (!data || !data.status || data.status.localeCompare('success') != 0)
        {
            console.log("getUnspentTransaction failed data="+(data?JSON.stringify(data):"null"))
            alerts.Alert("Error", "Сan not find unspent transaction for the '"+utils.coinsInfo[network].name+"' network. Please try again later.");
            require('./app').RefreshKeyPairsBalance(network);
            return;
        }
        console.log("getUnspentTransactions success. data="+JSON.stringify(data));
        const networkCurrent = bitcoin.networks[utils.coinsInfo[network].name];
        
        var new_transaction = new bitcoin.TransactionBuilder(networkCurrent);
        
        //Inputs
        var address_for_change = "";
        var current_amount = 0.0;
        var aSignArray = [];
        //var mapIndexToPrivateKey = {};
        //var txIndex = 0;
        //console.log('data.data='+JSON.stringify([].concat(data.data)));
        var unspent = [].concat(data.data);
        for (var n=0; n<unspent.length; n++)
        {
            const element = unspent[n];

            console.log('element='+JSON.stringify(element));
           
            const keyPrivate = utils.getPrivateKey(element.address, password);
            const keyPair = bitcoin.ECPair.fromWIF(keyPrivate, networkCurrent);
           
            for (var i=0; i<element.unspent.length; i++)
            {
                if (!address_for_change.length)
                    address_for_change = element.address;
                    
                new_transaction.addInput(element.unspent[i].tx, element.unspent[i].n);

                aSignArray.push(keyPair);

                current_amount += parseFloat(element.unspent[i].amount);
                if (current_amount >= dFullSentAmount+sendFee)
                {
                    //console.log("current_amount >= sendAmount+sendFee: " + current_amount + " >= " + sendAmount+sendFee);
                    break;
                }
            }
            if (current_amount >= dFullSentAmount+sendFee)
                break;
        }
        
        dFullSentAmount = utils.MakeFloat(dFullSentAmount);
        sendFee = utils.MakeFloat(sendFee);
        current_amount = utils.MakeFloat(current_amount);
        
        console.log('current_amount='+current_amount);
        
        if (current_amount < dFullSentAmount+sendFee)
        {
            alerts.Alert('Error', 'Bad (too big) send amount!');
            require('./app').RefreshKeyPairsBalance(network);
            return;
        }
        
       // privateKeys.forEach(function(element) {
       //     new_transaction.addInput(element.tx, 0);
       // });
        
        //Output
        var fRealSendAmount = 0.0;
        rowSentInfo.forEach(function(item){
            const amount = utils.coinsInfo[network].GetOutTxAmount(item.sendAmount);
            //new_transaction.addOutput(item.addressSendTo, parseInt(parseFloat(item.sendAmount)/0.00000001));
            new_transaction.addOutput(item.addressSendTo, amount);
            fRealSendAmount += parseFloat(item.sendAmount);
        });
        
        fRealSendAmount = utils.MakeFloat(fRealSendAmount);
        
        if (fRealSendAmount > current_amount)
            fRealSendAmount = current_amount;
            
        const fChange = utils.MakeFloat(parseFloat(current_amount) - fRealSendAmount - parseFloat(sendFee));
        
        if (fChange > 1.e-10 && address_for_change.length)
        {
            const amount = utils.coinsInfo[network].GetOutTxAmount(fChange);
            new_transaction.addOutput(address_for_change, amount);
        }

        //Sign
        for (var i=0; i<aSignArray.length; i++)
        {
            new_transaction.sign(i, aSignArray[i]);
        }
        
        utils.pushTransaction(network, new_transaction.build().toHex(), sendFee, function(e) {
            if (!e)
                jQuery('#send_coins_to').modal('show');
        });
    });
});