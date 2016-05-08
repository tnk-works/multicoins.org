'use strict';

var utils = require("./utils");

exports.handle = function(app)
{
    app.get('/', function (req, res) {res.render('index.html');});

    app.post('/api/v1/tx/push/ppc', function (req, res) {
        var strJSON = '{"jsonrpc": "1.0", "id":"curltest", "method": "sendrawtransaction", "params": ["'+req.body.hex+'"] }';
        utils.postString("multicoins.org", 9902, "/", {'Content-Type': 'text/plain', 'Authorization': 'Basic a3p2OnEyMjEw'}, strJSON, function(result) {
            if (result.data)
            {
                try {
                    if (result.success)
                        result.data = JSON.parse(result.data);
                    if (result.data.error && result.data.error.message)
                        result.message = result.data.error.message+"<br>";
                    
                    if (result.data.result)
                        result.data = result.data.result
                    else
                        result.success = false; 
                }
                catch(e) {}
            }
            else
            {
                result.success = false;
            }

            const ret = result.success ? 
                        {status: result.success, message: result.message || "", data: result.data || ""} :
                        {status: result.success, message: 0, data: result.message || ""};
            res.end(JSON.stringify(ret));
        });
    });
    
    app.get('/api/v1/address/balance/nvc/:addr_array', function (req, res) {
        if (!req.params.addr_array.length)
        {
            res.end(JSON.stringify({status: false, message: "bad request"}));
            return;
        }
        
        const arrayAddr = req.params.addr_array.split(',');
        var retArray = [];
        
        arrayAddr.forEach(function(addr, i, array) {
            const address = addr;
            console.log("GetBalance NVC adress: "+address);
            utils.getJSONssl( 'https://api.novaco.in/getbalance/'+address+'/full', function(data) {
                //data = [].concat(data);
                //data.forEach(function(element) {
                //    element.balance = (parseFloat(element.final_balance)/100000000.0).toFixed(8);
                //});
                //callback({status: 'success', data: data});
                data.address = address;
                console.log(JSON.stringify(data));
                retArray.push(data);
                
                if (retArray.length == arrayAddr.length)
                    res.end(JSON.stringify({status: 'success', result: retArray}));
            });      

        });
        
    });
};
