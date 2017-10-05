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
const muleCommon = require('./mule_common');

var filename = muleCommon.extractFilenameFromArguments();
var objConfig = muleCommon.parse_deployment_config_file(filename);

const ENV = objConfig.CloudHub.Env;
const ORGID = muleCommon.escapeWhiteSpaces(objConfig.CloudHub.BusinessGroup);
console.log("Deployment is running for environment: %s, Business Group: %s", ENV, ORGID);

//run deployment logic for every application in config file
for (const app of objConfig.CloudHub.Applications) {
	if(app != null) deploy(app);
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
	var cloudAppDetails = get_application_details(application.name, muleCommon.exec);
	
	if(cloudAppDetails == null) { //trigger new application deployment
		console.log("Deploying: " + application.name);
		deploy_new_application(application, muleCommon.exec); 		
	} else if(is_application_update_required(application, cloudAppDetails)) { //redeploy or modify application
		console.log("Updating: " + application.name);
		redeploy_or_modify_application(application, muleCommon.exec);
	} else {
		console.log("Application does NOT require any updates " +
			"- the version on the CloudHub is the same as info available in deployment descriptor file: " +
			filename);
	}
	console.log("\u001b[33m### Application deployment logic has finished successfully\u001b[39m: " + application.name);
}

/*
 * Function returns application details from CloudHub. 
 * If this is the first deployment of application null is returned.
 */
function get_application_details(appName, execSync) {
	var command = muleCommon.util.format('anypoint-cli ' + 
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
		result = result.replace(/,(?:(?!{))/g, ",\"");  //replace all ,(?:(?!{)) by ,"  -- all , that does not continue with {
		result = result.replace(/\u001b\[32m/g, "");	//remove ansi escape sequence \u001b[32m
		result = result.replace(/\u001b\[33m/g, "");	//remove ansi escape sequence \u001b[39m
		result = result.replace(/\u001b\[39m/g, "");	//remove ansi escape sequence \u001b[33m
		result = result.replace(/\"\"/g, "\"");			//replace "" by "
		console.log("JSON prepared: " + result);

		return JSON.parse(result);
	} catch (e) {
		const appNotFoundPattern = 'Error: No application with domain ' + appName + ' found.\n';
		var tmpStdOut = e.stdout+"";

		if(appNotFoundPattern == tmpStdOut) { //Application Not Found Error triggers a fresh deployment of new application
			console.log("The deployment is running for the application that has not been deployed.");
			return null;
		} else { //unknown error
			muleCommon.handle_error(e);
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

	//instead of comparing version the file name is compared with package name configured in deployment descriptor
	//this can be done because the version is part of the package / file name.
	if(app["packageName"] != filename) {
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
	const propertiesFile = muleCommon.get_property_file_path(app);	
	try {  
    	//check if properties file exists in repo and if properties exit on CloudHub
    	if (!muleCommon.fs.existsSync(propertiesFile) && properties != null && typeof properties != 'undefined') {
    		console.log("Properties file has not been found! Properties will NOT be updated despite there are properties " +
    			"detected on CloudHub.");
    		return false;
		}

    	var propertiesData = muleCommon.fs.readFileSync(propertiesFile, 'utf8');
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
    	muleCommon.handle_error(e, "Enable to ready property file for application: " + app.name);
	}

	return false;
}

/*
 * Function deploys new application on CloudHub
 */
function deploy_new_application(app, execSync) {
	muleCommon.downloadPackage(app.packageName, app.repo_endpoint, muleCommon.exec);

	var command = muleCommon.util.format(
		'anypoint-cli ' + 
			'--username=$anypoint_username --password=$anypoint_password ' + 
			'--environment=%s ' +
			'--organization=%s ' +
			//'--output json ' +
			'runtime-mgr cloudhub-application deploy %s %s%s ' + 
			'--workers %s --workerSize %s --region %s --runtime %s',
			ENV, ORGID, app.name, muleCommon.PACKAGE_FOLDER, app.packageName, app["num-of-workers"], app["worker-size"],
			app.region, app.runtime);

	//if properties file exists attach it to the command to update CloudHub
	if(muleCommon.fs.existsSync(muleCommon.get_property_file_path(app))) {
		command = muleCommon.util.format(command + " --propertiesFile %s", muleCommon.get_property_file_path(app));
	}

	try {
		var result = execSync(command);
	} catch (e) {
		muleCommon.handle_error(e, "Cannot deploy new application: " + app.name);
	}
}

/*
 * Modifies / redeploys the application on CloudHub
 */
function redeploy_or_modify_application(app, execSync) {
	muleCommon.downloadPackage(app.packageName, app.repo_endpoint, muleCommon.exec);

	var command = muleCommon.util.format(
		'anypoint-cli ' + 
			'--username=$anypoint_username --password=$anypoint_password ' + 
			'--environment=%s ' +
			'--organization=%s ' +
			//'--output json ' +
			'runtime-mgr cloudhub-application modify %s %s%s ' +
			'--workers %s --workerSize %s --region %s --runtime %s',
			ENV, ORGID, app.name, muleCommon.PACKAGE_FOLDER, app.packageName, app["num-of-workers"], app["worker-size"],
			app.region, app.runtime);
	
	//if properties file exists attach it to the command to update CloudHub
	if(muleCommon.fs.existsSync(muleCommon.get_property_file_path(app))) {
		command = muleCommon.util.format(command + " --propertiesFile %s", muleCommon.get_property_file_path(app));
	}

	try {
		var result = execSync(command);
	} catch (e) {
		muleCommon.handle_error(e, "Cannot update the application: " + app.name);
	}
}