'use strict';

const utils = require('../utils.js');
const alerts = require('../alerts');
const $ = require('jquery');

exports.netID = 0x08;
exports.name = "novacoin";
exports.Shortname = "NVC";
exports.fee = 0.0001;

const urlAPI = "/api/v1/address/";

exports.getBalance = function(arrayAddr, callback)
{
    console.log('get balance ' + urlAPI + "balance/" + arrayAddr.toString());
    $.getJSON( urlAPI + "balance/nvc/" + arrayAddr.toString(), function(data) {
        data = [].concat(data.result);
        data.forEach(function(element) {
            element.balance = utils.MakeFloat((parseFloat(element.balance)/1000000.0).toFixed(8));
        });
        callback({status: 'success', data: data});    
    })
    .fail(function() {
        callback(utils.JSONreturn('false', 'error'));
    });      

};

exports.pushTransaction = function(hexTX, callback)
{
    var pushtx = {
      tx: hexTX
    };
//    console.log('pushTransaction' + hexTX);
 //   alert(hexTX)
    $.post( 'https://api.blockcypher.com/v1/doge/main/txs/push', JSON.stringify(pushtx))
      .done(function( data ) {
        callback(utils.JSONreturn('success', {txHash: data.tx.hash}));
      })
      .fail(function(e) {
        //alert( "error " + JSON.stringify(e));
        alerts.OnTransactionSent(e);
      });   
};

exports.getTransactions = function(arrayAddr, callback)
{
    var addrs = "";
    arrayAddr.forEach(function(addr, i, array) {
        if (i < array.length-1) addrs += addr + ";";
        else addrs += addr;
    });

    $.getJSON( 'https://api.blockcypher.com/v1/doge/main/addrs/'+addrs + token + "&confirmations=0", function(data) {
        data = [].concat(data);
        data.forEach(function(element) {
            element.balance = (parseFloat(element.final_balance)/100000000.0).toFixed(8);
            element.txs = element.txrefs || [];
            
            if (element.unconfirmed_txrefs)
                element.txs = element.txs.concat(element.unconfirmed_txrefs);
                
            element.txs.forEach(function(tx) {
                tx.tx = tx.tx_hash;
                tx.time_utc = tx.confirmed || tx.received;
                tx.amount = (parseFloat(tx.value)/100000000.0).toFixed(8);
                if (tx.tx_output_n < 0)
                    tx.amount = -1.0*tx.amount;
            });
        });
        callback(exports.netID, data);
        
    }).fail(function() {
        callback(exports.netID, utils.JSONreturn(false, 'error'));
    });   
    
}

exports.getUnspentTransactions = function(arrayAddr, callback)
{
    var addrs = "";
    arrayAddr.forEach(function(addr, i, array) {
        if (i < array.length-1) addrs += addr + ";";
        else addrs += addr;
    });

    $.getJSON( 'https://api.blockcypher.com/v1/doge/main/addrs/'+addrs + token + '&unspentOnly=true', function(data) {
        data = [].concat(data);
        data.forEach(function(element) {
            element.unspent = element.txrefs || [];
            element.unspent.forEach(function(tx) {
                tx.tx = tx.tx_hash;    
                tx.amount = (parseFloat(tx.value)/100000000.0).toFixed(8);
                tx.n = tx.tx_output_n;
            });
        }); 
        callback(exports.netID, {status: 'success', data: data});
    }).fail(function(e) {
        console.log("getUnspentTransactions fail e=" + (e?JSON.stringify(e):'null'));
        callback(exports.netID, utils.JSONreturn('false', 'error'));    
    });
};

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
