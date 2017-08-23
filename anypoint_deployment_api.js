console.log('--- Anypoint API is being invoked');

//load libraries
const yaml = require('js-yaml');
const fs = require('fs');
const util = require('util');
const PACKAGE_FOLDER = "packages/";

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
console.log("Deployment is running for environment: " + objConfig.CloudHub.Env);

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
	console.log("### Running deployment of application: " + application.name);
	var cloudAppDetails = get_application_details(objConfig.CloudHub.Env, application.name, exec);
	downloadPackage(application.filename, application.repo_endpoint, exec);
	if(cloudAppDetails == null) { //trigger new application deployment
		console.log("Deploying: " + application.name);
		//deploy_new_application(objConfig.CloudHub.Env, application.name, application.filename, exec); 		
	} else if(is_application_update_required(application, cloudAppDetails)) { //redeploy or modify application
		console.log("Updating: " + application.name);
		redeploy_or_modify_application(objConfig.CloudHub.Env, application.name, application.filename, exec);
	} else {
		console.log("Application does NOT require any updates " +
			"- the version on the CloudHub is the same as info available in deployment descriptor file: " +
			application.name);
	}
	console.log("### Application deployment logic has finished successfully: " + application.name);
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
function get_application_details(env, appName, execSync) {
	var command = util.format('anypoint-cli ' + 
			'--username=$anypoint_username --password=$anypoint_password ' + 
			'--environment=%s ' +
			'--output json ' +
			'runtime-mgr cloudhub-application describe %s', env, appName);

	try {
		var result = execSync(command);
		console.log("Application details returned from CloudHub: " + result);
		return result;
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
function is_application_update_required(application, cloudAppDetails) {
	return true;
}

function deploy_new_application(env, appName, zipFileName, execSync) {
	var command = util.format(
		'anypoint-cli ' + 
			'--username=$anypoint_username --password=$anypoint_password ' + 
			'--environment=%s ' +
			//'--output json ' +
			'runtime-mgr cloudhub-application deploy %s %s%s', env, appName, PACKAGE_FOLDER, zipFileName);

	try {
		var result = execSync(command);
	} catch (e) {
		handle_error(e, "Cannot deploy new application: " + appName);
	}
}

/*
 * Modifies / redeploys the application on CloudHub
 */
function redeploy_or_modify_application(env, appName, zipFileName, execSync) {
	var command = util.format(
		'anypoint-cli ' + 
			'--username=$anypoint_username --password=$anypoint_password ' + 
			'--environment=%s ' +
			//'--output json ' +
			'runtime-mgr cloudhub-application modify %s %s%s', env, appName, PACKAGE_FOLDER, zipFileName);
	try {
		var result = execSync(command);
	} catch (e) {
		handle_error(e, "Cannot update the application: " + appName);
	}
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