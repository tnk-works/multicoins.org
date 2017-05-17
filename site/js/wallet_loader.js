
var jsUrls = [
    //'https://raw.githubusercontent.com/3s3s/multicoins.org/master/site/js/wallet.js'];
    '/js/wallet.js'];
    
var g_loaded = 0.0;
var g_total = 1024*1024*25;

function LoadScript(url, onEnd)
{
    var xmlhttp = new XMLHttpRequest();
    xmlhttp.open('GET', url, true);
    xmlhttp.onreadystatechange = function() {
        if (xmlhttp.readyState == 4) {
            if(xmlhttp.status == 200) {
                var script = document.createElement( 'script' );
                script.type = 'text/javascript';
                script.innerHTML = xmlhttp.responseText;
                document.body.appendChild(script);
                onEnd();
            }
        }
    };
    xmlhttp.onprogress = function(event) {
        var total = 1024*1024*4;
        if (event.total)
            total = event.total;
            
        var loaded = parseFloat(event.loaded);
        document.getElementById('page-preloader-info').innerHTML = parseFloat(100.0*parseFloat(loaded)/parseFloat(total)).toFixed(1) + "%";
    };
    xmlhttp.send(null);
}

LoadScript(jsUrls[0], function() {});

