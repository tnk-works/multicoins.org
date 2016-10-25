'use strict';

const crypto = require('crypto');
const utils = require('./utils.js');
const $ = require('jquery');
const alerts = require('./alerts');
const bitcoin = require('multicoinjs-lib');


exports.EncodeWallet = function(password)
{
    var jsonSavedKeyPairs = utils.getItem("KeyPairs").value || {};
    
    if (!Object.keys(jsonSavedKeyPairs).length || !password.length)
        return false;

    const hash1 = crypto.createHash("sha256")
                           .update(password)
                           .digest('base64');
    
    for (var key in jsonSavedKeyPairs)
    {
        const keyCurrent = key;
        const address = jsonSavedKeyPairs[keyCurrent].address;
        const private_key = jsonSavedKeyPairs[keyCurrent].private_key;
            
        const bip38 = utils.getBIP38(jsonSavedKeyPairs[keyCurrent].network);
        
        jsonSavedKeyPairs[keyCurrent].private_key = bip38.encrypt(private_key, hash1, address, function(status){console.log(status.percent)});
    }
    
    utils.setItem("KeyPairs", jsonSavedKeyPairs);
    return true;
};

exports.DecodeWallet = function(password)
{
    var jsonSavedKeyPairs = utils.getItem("KeyPairs").value || {};
    
    if (!Object.keys(jsonSavedKeyPairs).length)
        return true;
    
    if (!utils.isValidEncodePassword(password))
        return false;
        
    const hash1 = crypto.createHash("sha256")
                           .update(password)
                           .digest('base64');
    
    for (var key in jsonSavedKeyPairs)
    {
        const private_key = jsonSavedKeyPairs[key].private_key;
        
        const bip38 = utils.getBIP38(jsonSavedKeyPairs[key].network);
        
        jsonSavedKeyPairs[key].private_key = bip38.decrypt(private_key, hash1);
    }
    
    utils.setItem("KeyPairs", jsonSavedKeyPairs);
    return true;
    
};

exports.RefreshEncodeWalletTab = function()
{
    const savedPassword = utils.getSavedEncodePassword();

    $('#info_encrypt_status').removeClass('bg-danger');
    $('#info_encrypt_status').removeClass('info');
    if (savedPassword)
    {
        $('#info_encrypt_status').html('<h4>Your wallet is Encrypted!</h4>');
        $('#info_encrypt_note').html('Enter your password to Decrypt the wallet.');
        $('#submitEncryptWallet').html('Decrypt wallet');
        $('#divEncryptPassword2').hide();
        
        $('#divSignMessagePassword').show();
        $('#divNewKeyPairPassword').show();
        $('#divNewPivateKeyPassword').show();
        $('#divSendMoneyPassword').show();
        
        $('#info_encrypt_status').addClass('info');
    }
    else
    {
        $('#info_encrypt_status').html('<h4>Your wallet is Decrypted!</h4>');
        $('#info_encrypt_note').html('Enter your password to Encrypt the wallet.');
        $('#submitEncryptWallet').html('Encrypt wallet');
        $('#divEncryptPassword2').show();
        
        $('#divSignMessagePassword').hide();
        $('#divNewKeyPairPassword').hide();
        $('#divNewPivateKeyPassword').hide();
        $('#divSendMoneyPassword').hide();
        
        $('#info_encrypt_status').addClass('bg-danger');
    }
};

exports.UpdateBalanceTable = function()
{
    var jsonSavedKeyPairs = utils.getItem("KeyPairs").value || {}; 
    const jsonSavedSettings = utils.getItem("Settings").value || {};
    
    $( "#tab_tab_balance" ).html('');
    for (var key in utils.coinsInfo)
    {
        if (key == 0x05)
            continue;
            
        const coin = key;

        if (!jsonSavedSettings["filterCoins"][utils.coinsInfo[key].name])
            jsonSavedSettings["filterCoins"][utils.coinsInfo[key].name] = "checked";
            
        const checked = jsonSavedSettings["filterCoins"][utils.coinsInfo[key].name];
        const tdCoin = $('<td><div class="checkbox"><label><input coin="'+key+'" type="checkbox" value="" '+checked+'>' + utils.coinsInfo[key].name+"</label></div></td>");
        const tdBalance = $('<td><div class="checkbox">' + utils.getSavedBalance(key)+"</div></td>");

        tdCoin[0].onclick = function() {
            var jsonSavedSettingsVar = utils.getItem("Settings").value;
            
            if ($("input[coin='"+coin+"']")[0].checked)
                jsonSavedSettingsVar["filterCoins"][utils.coinsInfo[coin].name] = "checked";
            else
                jsonSavedSettingsVar["filterCoins"][utils.coinsInfo[coin].name] = "false";
                
            utils.setItem("Settings", jsonSavedSettingsVar);
            
            //if ($("#tab_request_money").is(':visible'))
                exports.UpdateKeyPairsTableHTML();
                
            //if ($("#tab_transactions").is(':visible'))
                exports.UpdateTransactionsTableHTML();
                
           // if ($("#tab_send_money").is(':visible'))
                exports.UpdatePublicKeysTableHTML();
        };

        $( "#tab_tab_balance" ).append($("<tr></tr>").append(
            tdCoin, tdBalance ));
    }
};

exports.UpdateKeyPairsTableHTML = function()
{
    var jsonSavedKeyPairs = utils.getItem("KeyPairs").value || {}; 
    const jsonSavedSettings = utils.getItem("Settings").value || {};
    
    $( "#keypairs" ).html('');
    for (var key in jsonSavedKeyPairs)
    {
        //console.log('jsonSavedKeyPairs[key].network]='+jsonSavedKeyPairs[key].network);
        if (utils.coinsInfo[jsonSavedKeyPairs[key].network] == undefined)
            continue;
            
        const checked = jsonSavedSettings["filterCoins"][utils.coinsInfo[jsonSavedKeyPairs[key].network].name];
        if (checked == "false")
            continue;

        const address = jsonSavedKeyPairs[key].address;
        const privkey = jsonSavedKeyPairs[key].private_key;
         
        //console.log('key='+key+'; address='+address);
        //console.log('jsonSavedKeyPairs[key].network='+jsonSavedKeyPairs[key].network);
        
        const tdCoin = $('<td>' + utils.coinsInfo[jsonSavedKeyPairs[key].network].name+"</td>");
        const tdPublic = $('<td><a href="#">'+address+"</a></td>");
        const tdBalance = $('<td>'+jsonSavedKeyPairs[key].balance +"</td>");
        const tdPrivate = $('<td><a href="#">'+jsonSavedKeyPairs[key].private_key+"</a></td>");
        
        tdPublic[0].onclick = function() {
            if (utils.getSavedEncodePassword())
                alerts.Alert("Your uncompressed public key", "To get uncompressed public key please decrypt your wallet");
            else
                alerts.Alert("Your uncompressed public key", "<div class='row' style='overflow: auto'><div class='col-md-12'>"+utils.getKeyPairFromWIF(privkey).Q.getEncoded(false).toString('hex')+"</div></div>");
        };
        
        tdPrivate[0].onclick = function() {
            if (utils.getSavedEncodePassword())
                alerts.Alert("Your encoded private key", privkey);
            else
                alerts.Alert("Your private key", privkey);
        };
 
        var btnClose = $('<button type="button" class="btn btn-default" aria-label="Left Align"><span class="glyphicon glyphicon-remove" aria-hidden="true"></span></button>');
        btnClose[0].onclick = function(){
            utils.deleteKey("KeyPairs", address);
            exports.UpdateKeyPairsTableHTML();
        };
        const tdDelete = $("<td></td>").append(btnClose);
        
        $( "#keypairs" ).append($("<tr></tr>").append(
            tdCoin, tdPublic, tdBalance, tdPrivate, tdDelete ));
    }
    
    exports.UpdateBalanceTable();
};

exports.UpdatePublicKeysTableHTML = function()
{
    var jsonSavedPublicKeys = utils.getItem("PublicKeys").value || {}; 
    const jsonSavedSettings = utils.getItem("Settings").value || {};
    
    $( "#addresses_to_send" ).html('');
    for (var key in jsonSavedPublicKeys)
    {
        const address = jsonSavedPublicKeys[key].address;
        const network = jsonSavedPublicKeys[key].network;
        
        if (!utils.coinsInfo[network])
            continue;
        
        const strCoinShortName = utils.coinsInfo[network].Shortname;
        const strLabel = jsonSavedPublicKeys[key].label;

        const checked = jsonSavedSettings["filterCoins"][utils.coinsInfo[network].name];
        if (checked == "false")
            continue;
            
        //console.log('jsonSavedPublicKeys[key]='+JSON.stringify(jsonSavedPublicKeys[key]));
        //console.log('jsonSavedPublicKeys[key].network='+JSON.stringify(network));
        
        const tdCoin = $('<td >' + utils.coinsInfo[network].name + "</td>");
        const tdPublic = $("<td >"+address+"</td>");
        const tdLabel = $("<td >"+strLabel +"</td>");
        
        //button "Edit"
        var btnEdit = $('<button type="button" class="btn btn-default" aria-label="Left Align"><span class="glyphicon glyphicon-pencil" aria-hidden="true"></span></button>');
         btnEdit[0].onclick = function(){
             require('./modalEvents').onEditSendToAddressLabel(network, address, strLabel, strCoinShortName);
        };
        const tdEdit= $("<td ></td>").append(btnEdit);
        
        //button "Send"
        var btnSend = $('<button type="button" class="btn btn-default" aria-label="Left Align"><span class="glyphicon glyphicon-send" aria-hidden="true"></span></button>');
         btnSend[0].onclick = function(){
             require('./sendTransaction').onOpenDialog(network, address, strLabel, strCoinShortName);
        };
        const tdSend= $("<td ></td>").append(btnSend);

        //button "Delete"
        var btnClose = $('<button type="button" class="btn btn-default" aria-label="Left Align"><span class="glyphicon glyphicon-remove" aria-hidden="true"></span></button>');
        btnClose[0].onclick = function(){
            utils.deleteKey("PublicKeys", address);
            exports.UpdatePublicKeysTableHTML();
        };
        const tdDelete = $("<td ></td>").append(btnClose);
        
        $( "#addresses_to_send" ).append($("<tr></tr>").append(
            tdCoin, tdPublic, tdLabel, tdEdit, tdSend, tdDelete ));
    }
};

exports.UpdateTransactionsTableHTML = function()
{
    $( "#transactions" ).html('');

    var jsonSavedKeyPairs = utils.getItem("KeyPairs").value || {}; 
    const jsonSavedSettings = utils.getItem("Settings").value || {};
    
    var arrayTXs = [];
    
    for (var key in jsonSavedKeyPairs)
    {
        const txs = jsonSavedKeyPairs[key].txs || 0;
        if (!txs) continue;
            
        const checked = jsonSavedSettings["filterCoins"][utils.coinsInfo[jsonSavedKeyPairs[key].network].name];
        if (checked == "false")
            continue;

        jsonSavedKeyPairs[key].txs.forEach(function(transaction) {
            const tx = {
                "network" : utils.coinsInfo[jsonSavedKeyPairs[key].network].name,
                "address" : key,
                "transaction" : transaction
                };
            arrayTXs.push(tx);
        });
    }
    
    arrayTXs.sort(function(tx1, tx2) {
        return new Date(tx2.transaction.time_utc).getTime() - new Date(tx1.transaction.time_utc).getTime();
    });
    
    var groupTXs = {};
    arrayTXs.forEach(function(tx) {
        if (groupTXs[tx.transaction.tx])
        {
            groupTXs[tx.transaction.tx].transaction.amount = 
                (parseFloat(groupTXs[tx.transaction.tx].transaction.amount) + parseFloat(tx.transaction.amount)).toFixed(8);
        }
        else
        {
            groupTXs[tx.transaction.tx] = tx;
        }
            
    });
    for (var key in groupTXs)
    {
        const tx = groupTXs[key];
        
        const tdCoin = $("<td>"+ tx.network+"</td>");
        const tdStatus = $("<td>" + (tx.transaction.confirmations || 0) + "</td>");
        const tdDate = $("<td>" + tx.transaction.time_utc + "</td>");
        const tdDescription = $("<td>" + tx.transaction.tx + "</td>");

        var tdAmountClass = 'success';
        if (parseFloat(tx.transaction.amount) < 0)
            tdAmountClass = 'danger';
            
        const tdAmount = $("<td class='"+tdAmountClass+"'>"+ parseFloat(tx.transaction.amount).toFixed(8) + "</td>");
                

        $( "#transactions" ).append($("<tr></tr>").append(
            tdCoin, tdStatus, tdDate, tdDescription, tdAmount ));
    }
};

exports.AddKeyPair = function(keyPair, password)
{
    var jsonSavedKeyPairs = utils.getItem("KeyPairs").value || {}; 
    
    if (password.length && !utils.isValidEncodePassword(password))
        return;
    
    const hash1 = password.length ? crypto.createHash("sha256")
                           .update(password)
                           .digest('base64') : "";

    const bip38 = utils.getBIP38(keyPair.network.pubKeyHash);
        
    utils.getBalance(keyPair.network.pubKeyHash, [keyPair.getAddress()], function(data) {
        if (!data || !data.status || data.status.localeCompare('success') != 0)
        {
            console.log("getBalance error: " + (data ? JSON.stringify(data) : "data = null"));
            return;
        }
            
        [].concat(data.data).forEach(function(element) {
            
            if (element.address.localeCompare(keyPair.getAddress()) == 0)
            {
               // element.private_key = keyPair.toWIF();
                
                element.private_key = hash1.length ? 
                    bip38.encrypt(keyPair.toWIF(), hash1, keyPair.getAddress(), function(status){console.log(status.percent)}) :
                    keyPair.toWIF();
            }
                
            element.network = keyPair.network.pubKeyHash;
                
            jsonSavedKeyPairs[element.address] = element;

        });
        
        utils.setItem("KeyPairs", jsonSavedKeyPairs);
        exports.UpdateKeyPairsTableHTML();
    });
};

exports.AddPublicKey = function(key, label)
{
    var network = utils.get_address_type(key);

    if (!network || (!network.length))
        return;
    
    var jsonSavedPublicKeys = utils.getItem("PublicKeys").value || {}; 
    
    jsonSavedPublicKeys[key] = {'address' : key, 'label' : label, 'network' : parseInt(network, 16)};

    utils.setItem("PublicKeys", jsonSavedPublicKeys);
    
    exports.UpdatePublicKeysTableHTML();
};

exports.RefreshKeyPairsBalance = function(network)
{
    var jsonSavedKeyPairs = utils.getItem("KeyPairs").value || {}; 
    
    var pairs = {};
    for (var key in jsonSavedKeyPairs)
    {
        if (utils.coinsInfo[jsonSavedKeyPairs[key].network] == undefined)
            continue;
            
        if (pairs[jsonSavedKeyPairs[key].network] == undefined)
            pairs[jsonSavedKeyPairs[key].network] = [];
         
        if (network && utils.coinsInfo[jsonSavedKeyPairs[key].network] != utils.coinsInfo[network])  
            continue;
            
        pairs[jsonSavedKeyPairs[key].network].push( jsonSavedKeyPairs[key].address );
    }
    
    for (var keyHash in pairs)
    {
        utils.getBalance(keyHash, pairs[keyHash], function(data) {
            
            if (!data || !data.status || data.status.localeCompare('success') != 0)
            {
                console.log("ERROR: getBalance failed: " + (data ? JSON.stringify(data) : "data=null"));
                return;
            }
                
            [].concat(data.data).forEach(function(element) {
                if (jsonSavedKeyPairs[element.address] == undefined)
                    return;
                
                console.log('set balance for '+ element.address + ": " + element.balance);    
                jsonSavedKeyPairs[element.address].balance = element.balance;
            });
            utils.setItem("KeyPairs", jsonSavedKeyPairs);
            exports.UpdateKeyPairsTableHTML();
        });
    }
};
