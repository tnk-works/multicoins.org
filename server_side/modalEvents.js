'use strict';

//const alerts = require('./alerts');
const utils = require('./utils.js');
const $ = jQuery;

var g_rowID = 0;

function MakeInputAddress(network)
{
    var jsonSavedPublicKeys = utils.getItem("PublicKeys").value || {}; 

    var aAddress = [];
    for (var key in jsonSavedPublicKeys)
    {
        if (network.localeCompare(jsonSavedPublicKeys[key].network + "") != 0)
            continue;
            
        aAddress.push(jsonSavedPublicKeys[key].address);
    }
    
    if (aAddress.length == 0)
        return "";
        
    var list = "";
    aAddress.forEach(function(addr){
        list += '<li><a href="#" class="aAddressToSendCoins">'+addr+'</a></li>';
    });
    
    const idSpanAddress = "spanAddressTo" + g_rowID;
    
    var UL = $('<ul class="dropdown-menu " aria-labelledby="dropdownMenu'+g_rowID+'"></ul>').append(list);
    UL.children().click(function() {
        $('.'+idSpanAddress).text($(this).text());
    });
    
    const strCurrentAddress = $('#inputModalSendAddress').val() || aAddress[0];
        
    var ret = 
            $('<div class="dropdown"></div>').append(
                '<button class="btn btn-default dropdown-toggle" type="button" id="dropdownMenu'+g_rowID+'" data-toggle="dropdown" aria-haspopup="true" aria-expanded="true">' + 
                  '<span class="spanAddressTo '+idSpanAddress+'">' + strCurrentAddress + '</span>' + 
                  '<span class="caret"></span>' + 
                '</button>', 
                UL
                )
            ;
    return ret;
}

$('#send_coins_to').on('show.bs.modal', function () {
    $('.tableSendAddressGroup').empty();

    const network = $('#inputModalSendNetwork').val();
    const strCoinShortName = $('#spanModalFeeCoinName').text();
    function AddNewAddress()
    {
        $('.buttonPlusAddressForSendTo').remove();

        var inputAddr = MakeInputAddress(network); //$('<input type="text" class="form-control inputModalSendAddress">');
        
        var inputAmount = $('<input type="text" class="form-control" id="inputModalSendAmount" placeholder="0.0">');
        inputAmount[0].oninput = function() {
            var sendAmount = parseFloat($( this ).val());
            if (isNaN(sendAmount))
                sendAmount = 0;
                        
            var sendFee = parseFloat($( '#inputModalSendFee' ).val());
            if (isNaN(sendFee))
                sendFee = 0;
            else
                sendFee = parseFloat(sendFee.toPrecision(12));
            
            require('./sendTransaction').ChangeBalance(
                parseFloat( (utils.getSavedBalance(network)-sendAmount-sendFee).toPrecision(12)) );
        }
        
        var btnAdd = $('<button type="button" class="btn btn-default buttonPlusAddressForSendTo" aria-label="Left Align"><span class="glyphicon glyphicon-plus" aria-hidden="true"></span></button>');
        btnAdd[0].onclick = AddNewAddress;
    
        const rowID = 'rowID' + g_rowID++;

        var btnDel = $('<button type="button" class="btn btn-default" aria-label="Left Align"><span class="glyphicon glyphicon-remove" aria-hidden="true"></span></button>');
        btnDel[0].onclick = function() {
            $("." + rowID).remove();
            $('.buttonPlusAddressForSendTo').remove();
            
            var rows = $('.tableSendAddressGroup').children();
            if (!rows.length) return;
            
            var colsLast = $(rows[rows.length-1]).children();
            if (colsLast.length != 4) return;
            
            $(colsLast[3]).append(btnAdd);
        };
        
        if (!$('.rowAddressSendTo').length)
        {
            $( ".tableSendAddressGroup" ).append($("<tr class='rowAddressSendTo "+rowID+"'></tr>").append(
                $("<td style='overflow: visible!important'></td>").append(inputAddr),
                $("<td></td>").append(inputAmount),
                $("<td></td>"),
                $("<td></td>").append(btnAdd)));
        }
        else
            $( ".tableSendAddressGroup" ).append($("<tr class='rowAddressSendTo "+rowID+"'></tr>").append(
                $("<td style='overflow: visible!important'></td>").append(inputAddr),
                $("<td></td>").append(inputAmount),
                $("<td></td>").append(btnDel),
                $("<td></td>").append(btnAdd)));
    }
    
    AddNewAddress();
});

exports.onEditSendToAddressLabel = function(network, address, strLabel, strCoinShortName)
{
    const body = 
            '<form class="form-horizontal">'+
              '<div class="form-group">'+
                '<label for="inputEditPublicKey" class="col-sm-2 control-label">Address</label>'+
                '<div class="col-sm-10">'+
                  '<input readonly id=\'inputEditPublicKey\' type="text" class="form-control" placeholder="1CHeYxfYo6zVmHSm7B1KztA5f7ZKcMsEWA" size="40">'+
                '</div>'+
              '</div>'+
              '<div class="form-group">'+
                '<label for="inputEditPublicKeyLabel" class="col-sm-2 control-label">Label</label>'+
                '<div class="col-sm-10">'+
                  '<input id=\'inputEditPublicKeyLabel\' type="text" class="form-control" placeholder="Multicoin Donate" size="40">'+
                '</div>'+
              '</div>'+
            '</form>'
    ;
    
    var dialog = require("./alerts").ModalDialog("onEditSendToAddressLabel", "Edit Label", body, function(){
        var jsonSavedPublicKeys = utils.getItem("PublicKeys").value || {}; 
        
        const address = $('#inputEditPublicKey').val();
        if (jsonSavedPublicKeys[address] == undefined)
            return;
            
        jsonSavedPublicKeys[address].label = $('#inputEditPublicKeyLabel').val();
        
        utils.setItem("PublicKeys", jsonSavedPublicKeys);
        
        require('./app.js').UpdatePublicKeysTableHTML();
    });
    
    $('#inputEditPublicKey').val(address);
    $('#inputEditPublicKeyLabel').val(strLabel);
    
    dialog.modal('show');
};

