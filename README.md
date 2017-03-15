# multicoins.org
Open source JavaScript Bitcoin, Testnet and Litecoin wallet

To start server:

1. npm install multicoins

2. cd ./node_modules/multicoins

3. node main.js


"/node_modules/multicoins/main.js" - web server

"/node_modules/multicoins/constants.js" - http and https ports (you can change it)

"/node_modules/multicoins/site/index.html" - main page

"/node_modules/multicoins/site/js/wallet.js" - main javascript. This script generate from "server_side" folder by command: 

"browserify --debug /node_modules/multicoins/server_side/htmlEvents.js /node_modules/multicoins/server_side/modalEvents.js -s htmlEvents > /node_modules/multicoins/site/js/wallet.js"

Life version: https://multicoins.org

Offline version: https://github.com/3s3s/multicoins.org/tree/gh-pages





