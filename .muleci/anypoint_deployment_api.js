// ===================================================================================
// === Author: Igor Repka @ MuleSoft                                               ===
// === Email: igor.repka@mulesoft.com                                              ===
// === version: 0.1					                                               ===
// === Description: 					                                           ===
//     Script manages CloudHub deployment of applications configured in deployment ===
//     descriptor configuration file.	 										   ===
// ===================================================================================

console.log('--- Anypoint API is being invoked');

//load libraries
const yaml = require('js-yaml');
const fs = require('fs');
const util = require('util');

const PACKAGE_FOLDER = "packages/";
const PROPERTIES_FOLDER = "app_properties/";

//Child process for calling anypoint-cli
var exec = require('child_process').execSync;

//get filename - passed as argument
var filename = process.argv[2];
if(filename) {
	console.log('File contains all deployment config properties: ' + filename);
} else {
	console.error('ERROR: File argument is misssing!');	
	process.exit(-1);
}

var objConfig = parse_deployment_config_file(filename);
const ENV = objConfig.CloudHub.Env;
const ORGID = objConfig.CloudHub.Orgid;
console.log("Deployment is running for environment: %s, Organisation: %s", ENV, ORGID);

//run deployment logic for every application in config file
for (const app of objConfig.CloudHub.Applications) {
	deploy(app);
}

console.log('--- Anypoint API: all changes applied successfully');

// ====================================
// === function declaration section ===
// ====================================

/*
 * Main function for deployment logic.
 * Deploys or redeploys application on CloudHub
 */
function deploy(application) {
	console.log("\u001b[33m### Running deployment of application\u001b[39m: " + application.name);
	var cloudAppDetails = get_application_details(application.name, exec);
	
	if(cloudAppDetails == null) { //trigger new application deployment
		console.log("Deploying: " + application.name);
		deploy_new_application(application, exec); 		
	} else if(is_application_update_required(application, cloudAppDetails)) { //redeploy or modify application
		console.log("Updating: " + application.name);
		redeploy_or_modify_application(application, exec);
	} else {
		console.log("Application does NOT require any updates " +
			"- the version on the CloudHub is the same as info available in deployment descriptor file: " +
			filename);
	}
	console.log("\u001b[33m### Application deployment logic has finished successfully\u001b[39m: " + application.name);
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
 * Function returns application details from CloudHub. 
 * If this is the first deployment of application null is returned.
 */
function get_application_details(appName, execSync) {
	var command = util.format('anypoint-cli ' + 
			'--username=$anypoint_username --password=$anypoint_password ' + 
			'--environment=%s ' +
			'--organization=%s ' +
			'--output json ' +
			'runtime-mgr cloudhub-application describe-json %s', ENV, ORGID, appName);

	try {
		var result = execSync(command);
		console.log("Application details returned from CloudHub: " + result);

//hack has to be implemented because response from anypoint-cli 'runtime-mgr cloudhub-application describe-json' is not a valid JSON.
		result = result+"";
		result = result.replace(/\s/g, ""); 			//remove all white spaces
		result = result.replace(/'/g, "\""); 			//replace all ' by "
		result = result.replace(/:/g, "\":");			//replace all : by ":
		result = result.replace(/{(?:(?!}))/g, "{\"");  //replace {(?:(?!})) by {"
		result = result.replace(/,/g, ",\""); 			//replace all , by ," 
		result = result.replace(/\u001b\[32m/g, "");	//remove ansi escape sequence \u001b[32m
		result = result.replace(/\u001b\[33m/g, "");	//remove ansi escape sequence \u001b[39m
		result = result.replace(/\u001b\[39m/g, "");	//remove ansi escape sequence \u001b[33m
		//console.log("JSON prepared: " + result);

		return JSON.parse(result);
	} catch (e) {
		const appNotFoundPattern = 'Error: No application with domain ' + appName + ' found.\n';
		var tmpStdOut = e.stdout+"";

		if(appNotFoundPattern == tmpStdOut) { //Application Not Found Error triggers a fresh deployment of new application
			console.log("The deployment is running for application that has never been deployed before.");
			return null;
		} else { //unknown error
			handle_error(e);
		}
	}
}

/*
 * Function checks if there are any changes that would require application update.
 * Function compares details in deployment descriptor with details obtained from CloudHub.
 */
function is_application_update_required(app, cloudAppDetails) {	
	const workerSize = cloudAppDetails.workers.type.weight;
	const numberOfWorkers = cloudAppDetails.workers.amount;
	const runtime = cloudAppDetails.muleVersion.version;
	const region = cloudAppDetails.region;
	const properties = cloudAppDetails.properties;
	const filename = cloudAppDetails.fileName;

	//version of application deployed on Cloudhub is extracted from its file name
	const regexVersion = new RegExp(app["version"] + "$", "g");
	if(!regexVersion.test(filename.substring(0,filename.lastIndexOf(".")))) {
		console.log("Difference in application version detected!");
		return true;
	}
	if(app["worker-size"] != workerSize) {
		console.log("Difference in Worker size detected!");
		return true;
	}
	if(app["num-of-workers"] != numberOfWorkers) {
		console.log("Difference in number of Workers detected!");
		return true;	
	} 
	if(app["runtime"] != runtime) {
		console.log("Difference in runtime detected!");
		return true;
	}
	if(app["region"] != region) {
		console.log("Difference in region detected!");
		return true;
	}

	//compare properties
	const propertiesFile = get_property_file_path(app);	
	try {  
    	//check if properties file exists in repo and if properties exit on CloudHub
    	if (!fs.existsSync(propertiesFile) && properties != null && typeof properties != 'undefined') {
    		console.log("Properties file has not been found! Properties will NOT be updated despite there are properties " +
    			"detected on CloudHub.");
    		return false;
		}

    	var propertiesData = fs.readFileSync(propertiesFile, 'utf8');
    	if(propertiesData != null && propertiesData != "") {
    		console.log("Properties from property file %s:\n%s\n", propertiesFile, propertiesData);    
    		var propertiesArray = propertiesData.split("\n");
    		
    		//if the number of properties in property file is different then number of properties on CloudHub
    		//properties must be updated
    		if(propertiesArray.length != Object.keys(properties).length) {
    			console.log("Difference in properties detected!");
    			return true;
    		}

    		//compare data in property file in repo with properties currently set up on CloudHub
    		for(const property of propertiesArray) {
    			var keyValue = property.split(":");    			
    			if(properties[keyValue[0]] != keyValue[1]) {
    				console.log("Difference in properties detected!");
    				return true;
    			}
    		}

    	} else {
    		console.log("Property file: %s is empty.", propertiesFile);
    	}    	
	} catch(e) {
    	handle_error(e, "Enable to ready property file for application: " + app.name);
	}

	return false;
}

/*
 * Function deploys new application on CloudHub
 */
function deploy_new_application(app, execSync) {
	downloadPackage(app.filename, app.repo_endpoint, exec);

	var command = util.format(
		'anypoint-cli ' + 
			'--username=$anypoint_username --password=$anypoint_password ' + 
			'--environment=%s ' +
			'--organization=%s ' +
			//'--output json ' +
			'runtime-mgr cloudhub-application deploy %s %s%s ' + 
			'--workers %s --workerSize %s --region %s --runtime %s',
			ENV, ORGID, app.name, PACKAGE_FOLDER, app.filename, app["num-of-workers"], app["worker-size"],
			app.region, app.runtime);

	//if properties file exists attach it to the command to update CloudHub
	if(fs.existsSync(get_property_file_path(app))) {
		command = util.format(command + " --propertiesFile %s", get_property_file_path(app));
	}

	try {
		var result = execSync(command);
	} catch (e) {
		handle_error(e, "Cannot deploy new application: " + app.name);
	}
}

/*
 * Modifies / redeploys the application on CloudHub
 */
function redeploy_or_modify_application(app, execSync) {
	downloadPackage(app.filename, app.repo_endpoint, exec);

	var command = util.format(
		'anypoint-cli ' + 
			'--username=$anypoint_username --password=$anypoint_password ' + 
			'--environment=%s ' +
			'--organization=%s ' +
			//'--output json ' +
			'runtime-mgr cloudhub-application modify %s %s%s ' +
			'--workers %s --workerSize %s --region %s --runtime %s',
			ENV, ORGID, app.name, PACKAGE_FOLDER, app.filename, app["num-of-workers"], app["worker-size"],
			app.region, app.runtime);
	
	//if properties file exists attach it to the command to update CloudHub
	if(fs.existsSync(get_property_file_path(app))) {
		command = util.format(command + " --propertiesFile %s", get_property_file_path(app));
	}

	try {
		var result = execSync(command);
	} catch (e) {
		handle_error(e, "Cannot update the application: " + app.name);
	}
}

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