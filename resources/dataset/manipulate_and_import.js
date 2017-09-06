const appID = require('./secrets.js').YOUR_APP_ID;
const apiKey = require('./secrets.js').YOUR_API_KEY;

const algoliasearch = require('algoliasearch');
const client = algoliasearch(appID, apiKey);
const index = client.initIndex('restaurants_list');

const Promise = require('bluebird');
const fs = require('fs');
const readFile = Promise.promisify(require("fs").readFile);
const restInfo = require('./restaurants_info.json');
const restList = require('./restaurants_list.json');

// csv to json converter
function csvToJSON(err, buffer) {
  if (err) {
      console.log(err);
  }

  const csv = buffer.toString();
  const lines = csv.split("\n");
  const headers = lines[0].split(';');
  const result = [];

  for (let i = 1; i < lines.length; i++) {
	  const obj = {};
	  const currentline = lines[i].split(';');

	for (let j = 0; j < headers.length; j++) {
	    obj[headers[j]] = currentline[j];
    }

	result.push(obj);
  }
  
  fs.writeFile('./restaurants_info.json', JSON.stringify(result), (err) => {
    if (err) throw err;
    console.log('The file has been JSON-ified!');
  });
}

// json cleaner and parser to catch any formatting errors in data
function cleanAndParseJSON(json) {
    const stringified = JSON.stringify(json);
    return JSON.parse(stringified);
}

// function to merge data from two files
function interpolateDiningStyle(jsonifiedCSV, json) {
    const info = cleanAndParseJSON(jsonifiedCSV);
    const list = cleanAndParseJSON(json);
    const infoDict = {};
    const infoFields = Object.keys(info[0]);
    infoFields.push("rounded_stars_count");

    // build dictionary from jsonifiedCSV
    info.forEach(restaurant => {
        infoDict[restaurant["objectID"]] = restaurant;
        // add simplified ratings
        infoDict[restaurant["objectID"]]["rounded_stars_count"] = parseInt(restaurant["stars_count"]);
    })

    list.forEach(restaurant => {
        // group JCB, Carte Blanche, Diners Club with Discover
        let paymentOpts = restaurant.payment_options;
        const paymentOptsCopy = [];
        let discover, jcb, dinersClub, carteBlanche;
        for(let i = 0; i < paymentOpts.length; i++) {
            if(paymentOpts[i] === 'Discover') discover = true;
            else if(paymentOpts[i] === 'JCB') jcb = true;
            else if(paymentOpts[i] === 'Carte Blanche') carteBlanche = true;
            else if(paymentOpts[i] === 'Diners Club') dinersClub = true;
            else paymentOptsCopy.push(paymentOpts[i]);
        }
        if(discover || jcb || carteBlanche || dinersClub) paymentOptsCopy.push('Discover');
        restaurant.payment_options = paymentOptsCopy;

        // add contents of each restaurant entry in dictionary to json data
        if(infoDict[restaurant["objectID"]]) {
            infoFields.forEach(attribute => {
                restaurant[attribute] = infoDict[restaurant["objectID"]][attribute];
            })
        }
    })
    return list;
}

// convert CSV to JSON
readFile('./restaurants_info.csv', csvToJSON)
// add relevant info from CSV to JSON file
.then(() => {
    return interpolateDiningStyle(restInfo, restList);
})
// add records to algolia index
.then((completeList) => {
    index.addObjects(completeList, function(err, content) {
        console.log(content);
    })
})
