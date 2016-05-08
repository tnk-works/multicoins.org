'use strict';

const crypto = require('crypto');
const Bip38 = require('bip38');
const base58 = require('./base58');
const bitcoin = require('multicoinjs-lib');
const alerts = require('./alerts');
const $ = require('jquery');

exports.coinsInfo = {
        0x00 : require("./coinAPI/bitcoin"),
        0x30 : require("./coinAPI/litecoin"), 
        0x1e : require("./coinAPI/dogecoin"),
        0x6f : require("./coinAPI/bitcoin_test"), 
        0x37 : require("./coinAPI/peercoin"),
        0x08 : require("./coinAPI/novacoin")
    };

exports.scryptParams = {
          N: 8, 
          r: 8, 
          p: 8
        };

exports.getBIP38 = function(networkID)
{
    const network = bitcoin.networks[exports.coinsInfo[networkID].name];
        
    var bip38 = new Bip38();
    bip38.versions = {
        private: network.wif, 
        public: network.pubKeyHash
    };
    bip38.scryptParams = exports.scryptParams;
    
    return bip38;
};

exports.getKeyPairFromWIF = function(wif)
{
    console.log('getKeyPairFromWIF wif='+wif);
    if (!wif || !wif.length)
        return 0;
        
    for (var network in bitcoin.networks)
    {
      try
      {
        return bitcoin.ECPair.fromWIF(wif, bitcoin.networks[network]);
      }
      catch(e)
      {
      }
    }
    return 0;   
};

exports.getSavedBalance = function(network)
{
    var jsonSavedKeyPairs = exports.getItem("KeyPairs").value || {}; 

    var ret = 0.0;
    for (var key in jsonSavedKeyPairs)
    {
        if (exports.coinsInfo[jsonSavedKeyPairs[key].network] != exports.coinsInfo[network])
            continue;
            
        const nextBalance = parseFloat(jsonSavedKeyPairs[key].balance);
        if (!isNaN(nextBalance))
            ret += nextBalance;
    }
    return parseFloat(ret.toPrecision(12));
};

exports.getSavedEncodePassword = function()
{
    var jsonSecurity = exports.getItem("Security").value || {};
    
    return jsonSecurity['passwordEncodeWallet'] || "";
};

exports.setEncodePassword = function(password)
{
    var sec = exports.getItem("Security").value || {};
    
    if (password && password.length)
    {
        const hash1 = crypto.createHash("sha256")
                           .update(password)
                           .digest('hex');
        
        sec['passwordEncodeWallet'] = crypto.createHash("sha256")
                           .update(hash1)
                           .digest('hex');
    }
    else
        sec['passwordEncodeWallet'] = "";

    exports.setItem("Security", sec);
};

exports.isValidEncodePassword = function(password)
{
    const savedPassword = exports.getSavedEncodePassword();
    if (!savedPassword.length)
        return true;
    
    if (!password || !password.length)
        return false;

    const hash1 = crypto.createHash("sha256")
                           .update(password)
                           .digest('hex');
        
    const hash2 = crypto.createHash("sha256")
                           .update(hash1)
                           .digest('hex');
    
    if (savedPassword.localeCompare(hash2) != 0)
        return false;
        
    return true;
};

exports.getPrivateKey = function(publicKey, password)
{
    console.log("getPrivateKey publicKey="+publicKey);
    var jsonSavedKeyPairs = exports.getItem("KeyPairs").value || {}; 

    for (var key in jsonSavedKeyPairs)
    {
        if (jsonSavedKeyPairs[key].address.localeCompare(publicKey) == 0)
        {
            if (!exports.isValidEncodePassword(password) || !password.length)
                return jsonSavedKeyPairs[key].private_key;
                
            const bip38 = exports.getBIP38(jsonSavedKeyPairs[key].network);

            const hash1 = crypto.createHash("sha256")
                                   .update(password)
                                   .digest('base64');
            return bip38.decrypt(jsonSavedKeyPairs[key].private_key, hash1);
        }
    }
    return '';
};

exports.get_address_type = function(address) {
    function sha256_digest(payload) {
    	 return crypto.createHash('sha256').update(payload).digest();
    }

	var decoded_hex;
    try {
        decoded_hex = base58.decode(address);
    } catch (e) {
        // if decoding fails, assume invalid address
        return null;
    }
    
    console.log('address='+address+'; decoded_hex='+decoded_hex);
    
    // make a usable buffer from the decoded data
    var decoded = new Buffer(decoded_hex, 'hex');
    
    // should be 25 bytes per btc address spec
    if (decoded.length != 25) {
        return null;
    }
    
    var length = decoded.length;
    var cksum = decoded.slice(length - 4, length).toString('hex');
    console.log('cksum='+cksum);
    
    var body = decoded.slice(0, length - 4);
    
    var good_cksum = sha256_digest(sha256_digest(body)).toString('hex').substr(0,8);
    console.log('good_cksum='+good_cksum);

    return (cksum.localeCompare(good_cksum) == 0 ? decoded_hex.slice(0, 2) : null);
}

exports.updateTransactions = function(callback)
{
    var jsonSavedKeyPairs = exports.getItem("KeyPairs").value || 0; 
    if (!jsonSavedKeyPairs) 
    {
        callback();
        return;
    }
    
    var coins = {}; 
    for (var key in exports.coinsInfo)
        coins[key] = [];

    for (var key in jsonSavedKeyPairs)
    {
        coins[jsonSavedKeyPairs[key].network].push(jsonSavedKeyPairs[key].address);
        jsonSavedKeyPairs[jsonSavedKeyPairs[key].address].txs = [];
    }
    exports.setItem("KeyPairs", jsonSavedKeyPairs);
   
    function SaveTransactions (netID, data)
    {
        var jsonSavedKeyPairs = exports.getItem("KeyPairs").value || 0; 
        if (!jsonSavedKeyPairs) 
        {
            callback();
            return;
        }
        
        if (data instanceof Array)
        {
            data.forEach(function(element) {
                if (jsonSavedKeyPairs[element.address])
                {
                    if (element.txs)
                        jsonSavedKeyPairs[element.address].txs = jsonSavedKeyPairs[element.address].txs.concat(element.txs);
                    else 
                    {
                        if (element.unconfirmed)
                        {
                            element.unconfirmed.forEach(function(item) {
                                jsonSavedKeyPairs[element.address].txs.push(item);
                            });
                        }
                    }
                }
            });
        }
        else
        {
            if (jsonSavedKeyPairs[data.address])
            {
                if (data.txs)
                    jsonSavedKeyPairs[data.address].txs = jsonSavedKeyPairs[data.address].txs.concat(data.txs);
                else
                {
                    if (data.unconfirmed)
                    {
                        data.unconfirmed.forEach(function(element) {
                            //jsonSavedKeyPairs[element.address].txs.push(element);
                            const address = element.address || data.address;
                            jsonSavedKeyPairs[address].txs.push(element);
                        });
                    }
                }
            }
        }

        exports.setItem("KeyPairs", jsonSavedKeyPairs);
        callback();
    }
    
    var count = 0;
    for (var netID in coins)
    {
        if (coins[netID].length) 
        {
            exports.getTransactions(netID, coins[netID], SaveTransactions);
            count++;
        }
    }
    
    if (!count) callback();
    
};

exports.getBalance = function(netID, arrayAddr, callback)
{
    exports.coinsInfo[netID].getBalance(arrayAddr, callback);
};

exports.pushTransaction = function(netID, hexTX, fee, callback)
{
    console.log("pushTransaction hex=" + hexTX);
    
    exports.coinsInfo[netID].CheckFee(hexTX, fee, function(e) {
        if (!e) 
        { 
            callback(false);
            return;
        }
        
        const hexTransaction = exports.coinsInfo[netID].CheckHexTransaction(hexTX);
        //alert(hexTransaction); return;
        exports.coinsInfo[netID].pushTransaction(hexTransaction, function(data) {
            if (!data || !data.status || !data.message || !data.message.txHash)
                return;
                
            alerts.OnTransactionSent({status: data.status, data: data.message.txHash});
        });
        
        callback(true);
    });
};

exports.getTransactions = function(netID, arrayAddr, callback)
{
    exports.coinsInfo[netID].getTransactions(arrayAddr, callback);
};

exports.getUnspentTransactions = function(netID, arrayAddr, callback)
{
    exports.coinsInfo[netID].getUnspentTransactions(arrayAddr, callback);
};

exports.getItem = function (key)
{
    var storage;
    if (window.content != undefined)
        storage = window.content.localStorage;
    else
        storage = localStorage;

    var str = storage.getItem(key);
    if (str == undefined)
        return exports.JSONreturn('false', '');
    
    try {
        return JSON.parse(str);
    }
    catch(e) {
        return exports.JSONreturn('false', e.message);
    }
};

exports.setItem = function (key, value)
{
    //console.log('setItem key='+key+'; value='+JSON.stringify(value));
    var oldValue = exports.getItem(key);
    
    oldValue.status = 'success';
    oldValue.value = value;
    
    var storage;
    if (window.content != undefined)
        storage = window.content.localStorage;
    else
        storage = localStorage;

    //storage.clear();
	storage.setItem(key, JSON.stringify(oldValue));
};

exports.deleteKey = function(parent, key)
{
    var jsonSaved =exports.getItem(parent).value || {}; 

    if (jsonSaved[key] == undefined)
        return;
        
    delete jsonSaved[key];

    exports.setItem(parent, jsonSaved);
};


exports.JSONreturn = function(success, message)
{
    return {status: success, message: message};
};

exports.HideSpinner = function()
{
   /* var $preloader = $('#page-preloader'),
        $spinner   = $preloader.find('.spinner');
    $spinner.fadeOut();
    $preloader.delay(350).fadeOut('slow');*/
    $('#page-preloader').hide();
    $('#page-preloader-info').hide();
};

exports.ShowSpinner = function()
{
   /* var $preloader = $('#page-preloader'),
        $spinner   = $preloader.find('.spinner');
    $spinner.show();
    $preloader.show();*/
    $('#page-preloader').show();
};

exports.MakeFloat = function(str)
{
    const f = parseFloat(str);
    if (isNaN(f) || Math.abs(f) < 1.e-12)
        return 0;
        
    const ret = parseFloat(f.toPrecision(12));
    if (Math.abs(ret) < 1.e-12)
        return 0;
    return ret;
}
