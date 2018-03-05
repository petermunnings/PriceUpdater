var fs = require('fs');
var readline = require('readline');
var google = require('googleapis');
var googleAuth = require('google-auth-library');
var fetch = require('node-fetch');
var g_auth=null;

// If modifying these scopes, delete your previously saved credentials
// at ~/.credentials/sheets.googleapis.com-nodejs-quickstart.json
var SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
var TOKEN_DIR = (process.env.HOME || process.env.HOMEPATH ||
    process.env.USERPROFILE) + '/.credentials/';
var TOKEN_PATH = TOKEN_DIR + 'sheets.googleapis.com-nodejs-quickstart.json';

// Load client secrets from a local file.
fs.readFile('client_secret.json', function processClientSecrets(err, content) {
  if (err) {
    console.log('Error loading client secret file: ' + err);
    return;
  }
  // Authorize a client with the loaded credentials, then call the
  // Google Sheets API.
  authorize(JSON.parse(content), repeatUpdate);
});

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 *
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
  var clientSecret = credentials.installed.client_secret;
  var clientId = credentials.installed.client_id;
  var redirectUrl = credentials.installed.redirect_uris[0];
  var auth = new googleAuth();
  var oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl);

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, function(err, token) {
    if (err) {
      getNewToken(oauth2Client, callback);
    } else {
      oauth2Client.credentials = JSON.parse(token);
      callback(oauth2Client);
    }
  });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 *
 * @param {google.auth.OAuth2} oauth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback to call with the authorized
 *     client.
 */
function getNewToken(oauth2Client, callback) {
  var authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES
  });
  console.log('Authorize this app by visiting this url: ', authUrl);
  var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  rl.question('Enter the code from that page here: ', function(code) {
    rl.close();
    oauth2Client.getToken(code, function(err, token) {
      if (err) {
        console.log('Error while trying to retrieve access token', err);
        return;
      }
      oauth2Client.credentials = token;
      storeToken(token);
      callback(oauth2Client);
    });
  });
}

/**
 * Store token to disk be used in later program executions.
 *
 * @param {Object} token The token to store to disk.
 */
function storeToken(token) {
  try {
    fs.mkdirSync(TOKEN_DIR);
  } catch (err) {
    if (err.code != 'EEXIST') {
      throw err;
    }
  }
  fs.writeFile(TOKEN_PATH, JSON.stringify(token));
  console.log('Token stored to ' + TOKEN_PATH);
}

function fetchJson(url, cb){
  fetch(url)
    .then(function(res) {
        return res.json();
    }).then(function(json) {
        cb(json);
    });
}


function updateSheet(auth, sheetId, cell, body){
  var sheets = google.sheets('v4');
  sheets.spreadsheets.values.update({
    auth: auth,
    spreadsheetId: sheetId,
    range: cell,
    valueInputOption: 'USER_ENTERED',
    resource: body
    
  }, function(err, response) {
    if (err) {
      console.log('The API returned an error: ' + err);
      return;
    }
  });

}

function updateValues(auth, url, cell, desc, updateBonsma) {
  fetchJson(url, function(response){
    var value = 0;
    if(response.result){
      value = response.result.price;
    } else if(desc=='grid'){
      value = response[0].price_btc;
    } else {
      value = response.last_trade;
    }
    console.log(desc + ' ' +  value);
    var values = [
      [
        value
      ]
    ];
    var body = {
      values: values
    };
    if(updateBonsma == true){
      updateSheet(auth, '10_pSVvYywyvIvD3jevi-GoPoPHg4tvOR9duxeoD2-PA', cell, body)
    }
    updateSheet(auth, '1wQOdEI9ZhE2FcrES2YRGvK8Uha45hQCVL3SXEMRwG04', cell, body)
  })
}

function updateSpreadsheet(){
  var readableDate = new Date().toISOString().
    replace(/T/, ' ').      // replace T with a space
    replace(/\..+/, '');
  console.log('Date:', readableDate);
  updateValues(g_auth, 'https://api.cryptowat.ch/markets/bitstamp/ltcbtc/price', 'Rates!E4:E4', 'ltc', true)
  updateValues(g_auth, 'https://api.cryptowat.ch/markets/bitstamp/ethbtc/price', 'Rates!C4:C4', 'eth', true)
  updateValues(g_auth, 'https://api.cryptowat.ch/markets/poloniex/zecbtc/price', 'Rates!D4:D4', 'zec', true)
  updateValues(g_auth, 'https://api.cryptowat.ch/markets/bitstamp/btcusd/price', 'Rates!B9:B9', 'btcusd', false)
  updateValues(g_auth, 'https://api.mybitx.com/api/1/ticker?pair=XBTZAR', 'Rates!B6:B6', 'btc', true)
  updateValues(g_auth, 'https://api.coinmarketcap.com/v1/ticker/grid/', 'Rates!G4:G4', 'grid', false)
}

function repeatUpdate(auth){
  g_auth=auth;
  updateSpreadsheet();
  setInterval(updateSpreadsheet, 60000);
}
