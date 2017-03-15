'use strict';

const utils = require('../utils.js');
const alerts = require('../alerts');
const $ = require('jquery');

const urlAPI = "https://smailblock.info/api/v1/address/"; //"https://blockexplorer-kzv.c9users.io/api/v1/address/"; //"https://198.54.121.57:9443/api/v1/address/";
const urlAPIpush = "https://smailblock.info/api/v1/tx/push"; //"https:///blockexplorer-kzv.c9users.io/api/v1/tx/push";

exports.netID = 63;
exports.name = "smailcoin";
exports.Shortname = "SML";
exports.fee = 0.00001;

exports.getBalance = function(arrayAddr, callback)
{
    console.log('get balance ' + urlAPI + "balance/" + arrayAddr.toString() + "?confirmations=1");
    $.getJSON( urlAPI + "balance/" + arrayAddr.toString() + "?confirmations=1", function(data) {
        callback(data);
    })
      .fail(function() {
          callback(utils.JSONreturn('false', 'error'));
      });      
};

exports.pushTransaction = function(hexTX)
{
    console.log('pushTransaction' + hexTX);
    $.post( urlAPIpush, { "hex": hexTX })
      .done(function( data ) {
        alerts.OnTransactionSent(data);
      })
      .fail(function(e) {
        alerts.OnTransactionSent(e);
      });   
};

function GetUnconfirmedTransactions(arrayAddr, callback)
{
    $.getJSON( urlAPI + "unconfirmed/" + arrayAddr.toString(), function(data2) {
        callback(exports.netID, data2.data);
    }).fail(function() {
        callback(exports.netID, utils.JSONreturn(false, 'error'));
    });      
}

exports.getTransactions = function(arrayAddr, callback)
{
    $.getJSON( urlAPI  + "txs/" + arrayAddr.toString(), function(data) {
        callback(exports.netID, data.data);
        
        GetUnconfirmedTransactions(arrayAddr, callback);
    }).fail(function() {
        callback(exports.netID, utils.JSONreturn(false, 'error'));
    });   
    
}

exports.getUnspentTransactions = function(arrayAddr, callback)
{
    console.log('getUnspentTransactions: ' + urlAPI + "unspent/" + arrayAddr.toString());
    $.getJSON( urlAPI + "unspent/" + arrayAddr.toString(), function(data) {
        callback(exports.netID, data);
    })
      .fail(function(e) {
          callback(exports.netID, utils.JSONreturn('false', 'error'));
      });      
}

exports.CheckFee = function(hexTX, fee, callback)
{
    var bRet = false;
    const fRecommended = Math.max(exports.fee, exports.fee/(1+hexTX.length/(2*1024)));
    if (parseFloat(fee) < fRecommended)
    {
        alerts.Alert(
            'Warning', 
            'Your transaction fee is too small (recommended "'+exports.fee +'")<BR>Push transaction anyway (press OK button) ?', 
            function() {callback(true);},
            function() {callback(false);});
    }
    else 
        callback(true);
}

exports.CheckHexTransaction = function(hex) {return hex;};
exports.GetOutTxAmount = function(amount) {return parseInt(parseFloat(amount)/0.00000001);};
