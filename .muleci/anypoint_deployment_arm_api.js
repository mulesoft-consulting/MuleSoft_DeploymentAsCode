// ===================================================================================
// === Author: Igor Repka @ MuleSoft                                               ===
// === Email: igor.repka@mulesoft.com                                              ===
// === version: 0.1					                                               ===
// === Description: 					                                           ===
//     Script manages On-Prem deployment via Runtime Manager of applications       ===
//     configured in deployment descriptor configuration file.	 				   ===	
// ===================================================================================

console.log('--- Anypoint API for On-Prem Deployment is being invoked');

//load libraries
const muleCommon = require('./mule_common');

var filename = muleCommon.extractFilenameFromArguments();
var objConfig = muleCommon.parse_deployment_config_file(filename);

const ENV = objConfig.OnPrem.Env;
const ORGID = muleCommon.escapeWhiteSpaces(objConfig.OnPrem.BusinessGroup);
console.log("Deployment is running for environment: %s, Business Group: %s", ENV, ORGID);

//run deployment logic for every application in config file
for (const app of objConfig.OnPrem.Applications) {
	if(app != null) {
		//copyAppPropertyFile(app);
		deploy(app);
	}
}

console.log('--- Anypoint API: all changes applied successfully');

// ====================================
// === function declaration section ===
// ====================================

function copyAppPropertyFile(application) {
	var filePath = muleCommon.get_property_file_path(application);
	console.log("App property path to be copied: " + filePath);
	//scp /file/to/send username@remote:/where/to/put
	var command = muleCommon.util.format('scp %s ', filePath);
	var result = execSync(command);
}

/*
 * Main function for deployment logic.
 * Deploys or redeploys application on On-Prem server
 */
function deploy(application) {
	console.log("\u001b[33m### Running deployment of application\u001b[39m: " + application.name);
	var cloudAppDetails = get_application_details(application.name, muleCommon.exec);
	
	if(cloudAppDetails == null) { //trigger new application deployment
		console.log("Deploying: " + application.name);
		deploy_new_application(application, muleCommon.exec); 		
	} else {
		console.log("Updating: " + application.name);
		redeploy_or_modify_application(application, muleCommon.exec);
	} 
	console.log("\u001b[33m### Application deployment logic has finished successfully\u001b[39m: " + application.name);
}

/*
 * Function returns application details from On-Prem. 
 * If this is the first deployment of application null is returned.
 */
function get_application_details(appName, execSync) {
	var command = muleCommon.util.format('anypoint-cli ' + 
			'--username=$anypoint_username --password=$anypoint_password ' + 
			'--environment=%s ' +
			'--organization=%s ' +
			'--output json ' +
			'runtime-mgr standalone-application describe-json %s', ENV, ORGID, appName);

	try {
		var result = execSync(command);
		console.log("Application details returned from CloudHub: " + result);
		
		return result;
	} catch (e) {
		const appNotFoundPattern = 'Error: Application identified by "' + appName + '" not found\n';
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
 * Function deploys new application on On-Prem
 */
function deploy_new_application(app, execSync) {
	muleCommon.downloadPackage(app.packageName, app.repo_endpoint, muleCommon.exec);

	var command = muleCommon.util.format(
		'anypoint-cli ' + 
			'--username=$anypoint_username --password=$anypoint_password ' + 
			'--environment=%s ' +
			'--organization=%s ' +
			//'--output json ' +
			'runtime-mgr standalone-application deploy %s %s %s%s',
			ENV, ORGID, app.target, app.name, muleCommon.PACKAGE_FOLDER, app.packageName);

	try {
		var result = execSync(command);
	} catch (e) {
		muleCommon.handle_error(e, "Cannot deploy new application: " + app.name);
	}
}

/*
 * Modifies / redeploys the application on On-Prem
 */
function redeploy_or_modify_application(app, execSync) {
	muleCommon.downloadPackage(app.packageName, app.repo_endpoint, muleCommon.exec);

	var command = muleCommon.util.format(
		'anypoint-cli ' + 
			'--username=$anypoint_username --password=$anypoint_password ' + 
			'--environment=%s ' +
			'--organization=%s ' +
			//'--output json ' +
			'runtime-mgr standalone-application modify %s %s%s',
			ENV, ORGID, app.name, muleCommon.PACKAGE_FOLDER, app.packageName);

	try {
		var result = execSync(command);
	} catch (e) {
		muleCommon.handle_error(e, "Cannot update the application: " + app.name);
	}
}