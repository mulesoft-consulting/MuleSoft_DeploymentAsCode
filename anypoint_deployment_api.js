console.log('--- Anypoint API is being invoked');

//load libraries
const yaml = require('js-yaml');
const fs = require('fs');
const util = require('util');

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
	if(cloudAppDetails == null) { //trigger new application deployment
		//deploy_new_application('DEV', 'maven-project-ir-ecotricity', 'maven-project-ir-1.0.0-SNAPSHOT.zip', exec); 
		//TODO remove debug log and enable function invocation above
		console.log("Deploying: " + application.name);
	} else { //redeploy or modify application
		console.log("Updating: " + application.name);
	}
	console.log("### Application deployed successfully: " + application.name);
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

function deploy_new_application(env, appName, zipFileName, execSync) {
	var command = util.format(
		'anypoint-cli ' + 
			'--username=$anypoint_username --password=$anypoint_password ' + 
			'--environment=%s ' +
			'--output json ' +
			'runtime-mgr cloudhub-application deploy %s %s', env, appName, zipFileName);

	try {
		var result = execSync(command);
	} catch (e) {
		handle_error(e, "Cannot deploy new application.");
	}
}

function redeploy_or_modify_application() {
	console.log("function not supported yet");
}

function handle_error(e, message) {
	var msg = typeof message != 'undefined' ? message : "";
	console.log("Unknown error: " + msg + "\n" + e);
	console.log("Unknown error - stderr: " + e.stderr);
	console.log("Unknown error - stdout: " + e.stdout);	
	process.exit(-1);
}