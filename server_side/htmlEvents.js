'use strict';

const app = require('./app');
const bitcoin = require('multicoinjs-lib');
const utils = require('./utils.js');    
const Firebase = require("firebase");
const crypto = require('crypto');
const alerts = require('./alerts');
const $ = require('jquery');

$(function() {
    utils.HideSpinner();
    
    $("#top_nav a").each(function(index) {
       $('#'+$(this).attr('open-id')).hide();
    });
    
    if ((!utils.getItem("KeyPairs").value || !Object.keys(utils.getItem("KeyPairs").value).length) && utils.isValidEncodePassword(""))
    {
        //For new users shgenerate random bitcoin address
        for (var key in utils.coinsInfo)
        {
            const network = bitcoin.networks[utils.coinsInfo[key].name];
            const keyPair = bitcoin.ECPair.makeRandom({network : network});
           
            app.AddKeyPair(keyPair, "");
            break;
        }
    }

///////////////////////////////////////////////////////////////////////////    
    //Init Settings
    var jsonSavedSettings = utils.getItem("Settings").value || {}; 
    
    if (!jsonSavedSettings["filterCoins"])
        jsonSavedSettings["filterCoins"] = {};
    
    utils.setItem("Settings", jsonSavedSettings);
///////////////////////////////////////////////////////////////////////////    

    app.RefreshKeyPairsBalance();
    app.UpdatePublicKeysTableHTML();
    app.RefreshEncodeWalletTab();
    
    $('#tab_trade_top').show();
});

$("#top_nav a").on("click", function(e){
    e.preventDefault();
    $("#top_nav").find(".active").removeClass("active");
    $(this).parent().addClass("active");
   
    $("#top_nav a").each(function(index) {
       $('#'+$(this).attr('open-id')).hide();
    });
    $('#'+$(this).attr('open-id')).show();
});

$('#submitSignMessage').click(function(e) {
    e.preventDefault();
    const password = $('#inputSignMessagePassword').val();
    
    const keyPair = utils.getKeyPairFromWIF(utils.getPrivateKey($('#inputPybKeyForSign').val(), password));
  
    if (!keyPair)
    {
        alerts.Aert('Error', 'Invalid private key or wallet password!');
        return;
    }
    
    const network = keyPair.network;
    console.log("keyPair.network="+JSON.stringify(network));    
    $('#textSignature').val(bitcoin.message.sign(keyPair, $('#textForSign').val(), network).toString('base64'));
});

$('#submitEncryptWallet').click(function(e){
    e.preventDefault();
    
    const savedPassword = utils.getSavedEncodePassword();
    const password = $('#inputEncryptPassword').val();
    
    $('#divEncryptPassword2').removeClass('has-error');
    if ((password.localeCompare($('#inputEncryptPassword2').val()) != 0 || !password.length ) && !savedPassword.length)
    {
        alerts.Alert("Error", 'Passwords do not match or empty');
        $('#divEncryptPassword2').addClass('has-error');
        return;
    }
    
    //utils.ShowSpinner();
    
    if (!savedPassword)
    {
        if (app.EncodeWallet(password))
            utils.setEncodePassword(password);
        else
            alerts.Alert('Error', 'Encrypt error!');
    }
    else
    {
        if (app.DecodeWallet(password))
            utils.setEncodePassword("");
        else
            alerts.Alert('Error', 'Decrypt error!');
    }
   // utils.HideSpinner();
    
    app.UpdateKeyPairsTableHTML();
    app.RefreshEncodeWalletTab();
});

function onBackupOrRestore()
{
    const user= $('#inputBackupWalletLogin').val();
    const password = $('#inputBackupWalletPassword').val();
    
    $('#divBackupWalletLogin').removeClass('has-error');
    if (!user.length)
    {
        alerts.Alert('Error', 'Wallet name is empty!');
        $('#divBackupWalletLogin').addClass('has-error');
        return 0;
    }
    
    $('#divBackupWalletPassword2').removeClass('has-error');
    if (password.localeCompare($('#inputBackupWalletPassword2').val()) != 0 || !password.length )
    {
        alerts.Alert('Error', 'Passwords do not match or empty');
        $('#divBackupWalletPassword2').addClass('has-error');
        return 0;
    }
    
    const myFirebaseRef = new Firebase("https://dazzling-inferno-2292.firebaseio.com/");

    const uid = crypto.createHash("sha256")
                           .update(user+password)
                           .digest('hex');
    
    try {
        return {"ref" : myFirebaseRef.child("users/"+uid ), "uid" : uid};
    }                       
    catch(e){
        alerts.Alert('Error', e.message);
        return 0;
    }
    
}

$('#submitBackup').click(function(e){
    e.preventDefault();
    
    const savedPassword = utils.getSavedEncodePassword();
    
    if (!savedPassword.length)
    {
        alerts.Alert('Error', "You can not save decrypted wallet!");

        jQuery('.nav-tabs a[href="#tab_encrypt_wallet"]').tab('show');
        
        return;
    }
    
    const db = onBackupOrRestore();
    if (!db) return;
    
    alerts.Alert(
        'Warning', 
        '<p class="bg-danger">This action will destroy the previous backup! </p><b>Аre you sure?</b> ',
        function() {
            var jsonSavedKeyPairs = utils.getItem("KeyPairs").value || {};
            
            for (var key in jsonSavedKeyPairs)
                jsonSavedKeyPairs[key].txs = [];
        
            utils.ShowSpinner();
            
            db.ref.set({
        	  uid: db.uid,
        	  keypairs: jsonSavedKeyPairs,
        	  pubkeys: utils.getItem("PublicKeys").value || {},
        	  security: utils.getItem("Security").value || {}
            }, function(error) {
                if (error) {
                    alerts.Alert("Error !", "Data could not be saved." + error);
                } else {
                    alerts.Alert("Success !", "Data saved successfully.");
                }  
                utils.HideSpinner();
            });
        },
        function() {});
    
});

$('#submitRestore').click(function(e){
    e.preventDefault();
    
    const db= onBackupOrRestore();
    if (!db) return;
    
    utils.ShowSpinner();

    db.ref.once("value", function(snapshot) {
        utils.setItem("KeyPairs", snapshot.val().keypairs);
        utils.setItem("PublicKeys", snapshot.val().pubkeys);
        utils.setItem("Security", snapshot.val().security);
        
        app.RefreshKeyPairsBalance();
        app.UpdatePublicKeysTableHTML();
        app.RefreshEncodeWalletTab();
        
        alerts.Alert("Success !", "Data restored successfully.");
        
        utils.HideSpinner();
    }, function (errorObject) {
        alerts.Alert("Error !", "The read failed: " + errorObject.code);
        
        utils.HideSpinner();
    });
    
});

$('#submitSignMessageVerify').click(function(e) {
    e.preventDefault();
    
    const address = $("#inputPybKeyForSignVerify").val();
    const addrType = parseInt(utils.get_address_type($('#inputPybKeyForSign').val()), 16);
    const networkName = utils.coinsInfo[addrType].name;
    const network = bitcoin.networks[networkName];
    
    console.log("address="+address+";  addrType="+addrType+"; networkName="+networkName+"; \nnetwork="+JSON.stringify(network));
    
    const result = bitcoin.message.verify(address, $('#textSignatureVerify').val(), $('#textForSignVerify').val(), network);
    
    if (result)
        alerts.Alert('Success', "coin:" + networkName+ " message Verify OK");
    else
        alerts.Alert('Error', "coin:" + networkName+ " message Verify FALSE");
});

$('#tab_trade_top a').click(function () {
    if (this.hash.localeCompare('#tab_transactions') == 0)
    {
        utils.updateTransactions(app.UpdateTransactionsTableHTML);
    }
    if (this.hash.localeCompare('#tab_request_money') == 0)
    {
        app.RefreshKeyPairsBalance();
    }
});


$('#btnPrivateKeyReady').click(function (e) {
    e.preventDefault();
    
    jQuery('#add_private_key').modal('hide');
    const password = $('#inputNewPivateKeyPassword').val();
  
    if (!utils.isValidEncodePassword(password))
    {
        alerts.Alert('Error', 'Invalid wallet password!');
        return false;
    }

    const keyPair = utils.getKeyPairFromWIF($('#inputNewPivateKey').val());
  
    if (!keyPair)
        return;
  
    app.AddKeyPair(keyPair, password);
});

$('#btnNewKeyPairReady').click(function (e) {
    e.preventDefault();
    
    jQuery('#add_new_keypair').modal('hide');
    const password = $('#inputNewKeyPairPassword').val();
    
    if (!utils.isValidEncodePassword(password))
    {
        alerts.Alert('Error', 'Invalid wallet password!');
        return false;
    }
        
    const network = bitcoin.networks[$( "#add_new_keypair  input:checked" ).val()];

    console.log('creating network: ' + network);
    const keyPair = bitcoin.ECPair.makeRandom({network : network});
    
    app.AddKeyPair(keyPair, password);
});

$('#btnPublicKeyReady').click(function () {
    jQuery('#add_new_address').modal('hide');
    
    app.AddPublicKey($('#inputNewPublicKey').val(), $('#inputNewPublicKeyLabel').val());
    

});

function InitNavTab(id)
{
    $("#top_nav").find(".active").removeClass("active");
    $("a[open-id='"+id+"']").parent().addClass("active");

    $("#top_nav a").each(function(index) {
       $('#'+$(this).attr('open-id')).hide();
    });
    $("#"+id).show();
    
}

$('#toolButtonSend').click(function () {
    InitNavTab("tab_trade_top");

    jQuery('.nav-tabs a[href="#tab_send_money"]').tab('show');
});
$('#toolButtonRequest').click(function () {
    InitNavTab("tab_trade_top");

    jQuery('.nav-tabs a[href="#tab_request_money"]').tab('show');
});
$('#toolButtonTransactions').click(function () {
    InitNavTab("tab_trade_top");
    
    utils.updateTransactions(app.UpdateTransactionsTableHTML);

    jQuery('.nav-tabs a[href="#tab_transactions"]').tab('show');
});

$('#toolButtonSignMessage').click(function () {
    InitNavTab("tab_tools");

    jQuery('.nav-tabs a[href="#tab_sign_message"]').tab('show');
});
$('#toolButtonCheckMessage').click(function () {
    InitNavTab("tab_tools");

    jQuery('.nav-tabs a[href="#tab_verify_message"]').tab('show');
});

$('#toolButtonEncodeWallet').click(function () {
    InitNavTab("tab_security");

    jQuery('.nav-tabs a[href="#tab_encrypt_wallet"]').tab('show');
    
    
});
$('#toolButtonSaveWallet').click(function () {
    InitNavTab("tab_security");

    jQuery('.nav-tabs a[href="#tab_backup_wallet"]').tab('show');
});

$('#submitStartAddrGen').click(function () {
    const mask = jQuery('#inputAddrGenMask').val();
    if (!mask.length)
        return;
        
    var test = {};
    var i = 0;
    const timerId = setInterval(function() {
        i++;
        const keyPair = bitcoin.ECPair.makeRandom({network : bitcoin.networks['bitcoin']});
        const addr = keyPair.getAddress();
        
        if (parseInt(i/10000)*10000 == i)
            jQuery('#inputResultAddrGen').val(addr);
        
       // if (!test[addr[2]]) test[addr[2]] = 0;
       // test[addr[2]]++;
        
        if (addr.indexOf(mask) == 0)
        {
            clearInterval(timerId);
            alert('ok');
        }
    }, 1);
    
});


//browserify ~/workspace/server_side/htmlEvents.js ~/workspace/server_side/modalEvents.js | uglifyjs -s htmlEvents > ~/workspace/site/js/wallet.js

//browserify --debug ~/workspace/server_side/htmlEvents.js ~/workspace/server_side/modalEvents.js -s htmlEvents > ~/workspace/site/js/wallet.js