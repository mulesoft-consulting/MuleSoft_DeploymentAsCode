console.log('--- Anypoint API is being invoked');

//load libraries
const yaml = require('js-yaml');
const fs = require('fs');

//get filename - passed as argument
var filename = process.argv[2];
if(filename) {
	console.log('File contains all deployment config properties: ' + filename);
} else {
	console.error('ERROR: File argument is misssing!');	
	process.exit(-1);
}

//parse config file
try {
    const config = yaml.safeLoad(fs.readFileSync(filename, 'utf8'));
    const indentedJson = JSON.stringify(config, null, 4);
    console.log(indentedJson);
} catch (e) {
    console.log(e);
    process.exit(-1);
}


//call anypoint cli API and parse results
var exec = require('child_process').execSync;

var result = exec('anypoint-cli --username=$anypoint_username --password=$anypoint_password --output json account user describe');

console.log('Reuslt: ' + result);

//convert to JSON
var objResult = JSON.parse(result);

console.log('Result obj email: ' + objResult.Email);
console.log('Result obj user name: ' + objResult["User name"]);

console.log('--- Anypoint API: all changes applied successfully');