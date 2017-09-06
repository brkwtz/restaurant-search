const appID = YOUR_APP_ID;
const apiKey = YOUR_API_KEY;

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

    // build dictionary from jsonifiedCSV (adding simplified ratings)
    info.forEach(restaurant => {
        infoDict[restaurant["objectID"]] = restaurant;
        infoDict[restaurant["objectID"]]["rounded_stars_count"] = parseInt(restaurant["stars_count"]);
    })

    infoFields.push("rounded_stars_count");

    // add contents of each restaurant entry in dictionary to json data
    list.forEach(restaurant => {
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
