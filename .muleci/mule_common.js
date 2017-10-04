// ===================================================================================
// === Author: Igor Repka @ MuleSoft                                               ===
// === Email: igor.repka@mulesoft.com                                              ===
// === version: 0.1					                                               ===
// === Description: 					                                           ===
//     Common functionality for environment management and application deployment. ===
// ===================================================================================

const exec = require('child_process').execSync; //Child process for calling anypoint-cli
const yaml = require('js-yaml');
const fs = require('fs');
const util = require('util');
const PROPERTIES_FOLDER = "app_properties/";
const PACKAGE_FOLDER = "packages/";

/*
 * Returns relative path to application properties for application passed as an input
 */
function get_property_file_path(app) {
	return PROPERTIES_FOLDER+app.name+"/"+app.properties;
}

/*
 * Exception handling
 */
function handle_error(e, message) {
	var msg = typeof message != 'undefined' ? message : "";
	console.log("Unknown error: " + msg + "\n" + e);
	console.log("Unknown error - stderr: " + e.stderr);
	console.log("Unknown error - stdout: " + e.stdout);	
	process.exit(-1);
}

/*
 * Function parses deployment descriptor config file.
 * Object with config details is returned.
 */
function parse_deployment_config_file(filename) {
	try {
    	const config = yaml.safeLoad(fs.readFileSync(filename, 'utf8'));
    	const indentedJson = JSON.stringify(config, null, 4);
    	console.log(indentedJson);
    	return JSON.parse(indentedJson);
	} catch (e) {
    	console.log(e);
    	process.exit(-1);
	}
}

/*
 * Downloads the package of application from provided repository
 */
function downloadPackage(filename, repoEndpoint, execSync) {
	console.log("Downloading the package for: " + filename);
	var command = util.format('curl -Lk --create-dirs -o %s%s ' +
		'%s%s', PACKAGE_FOLDER, filename, repoEndpoint, filename);
	console.log("Command is being executed: " + command);
	try {
		execSync(command);
	} catch (e) {
		handle_error(e, "Package downloading failed.");
	}
}

/*
 * Extract the file name of deployment configuration passed as argument
 */
function extractFilenameFromArguments() {
	var filename = process.argv[2];
	if(filename) {
		console.log('File contains all deployment config properties: ' + filename);
		return filename;
	} else {
		console.error('ERROR: File argument is misssing!');	
		process.exit(-1);
	}
}

/*
 * Functionality exported by this module
 */
module.exports.get_property_file_path 		= get_property_file_path;
module.exports.handle_error			  		= handle_error;
module.exports.parse_deployment_config_file = parse_deployment_config_file;
module.exports.downloadPackage 				= downloadPackage;
module.exports.extractFilenameFromArguments = extractFilenameFromArguments;
module.exports.PACKAGE_FOLDER				= PACKAGE_FOLDER;

module.exports.fs = fs;
module.exports.util = util;
module.exports.exec = exec;