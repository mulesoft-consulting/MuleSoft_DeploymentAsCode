# Mule CI

MuleSoft Anypoint Platform application deployment and runtime configuration.

## Documentation

Deployment uses `Command Line Interface for Anypoint Platform` [Anypoint-CLI](https://docs.mulesoft.com/runtime-manager/anypoint-platform-cli) to:
* Get information about deployed application
* Update application runtime, e.g. number of Workers
* Update or deploy application.

Configuration file `deployment_descriptor.yml` drives the deployment execution as per the logic below:

* If there is no application deployed with the same name as defined by field `name`, deploy a new application on the runtime. Runtime configuration is read from the file and applied.
* If application is already deployed, the follwing application and runtime properties are evaluated:
    * Application version - field `packageName` from configuration file is used to compare application version. `This assumes that application version is part of the application package name.`
    * Worker size
    * Number of Workers
    * Runtime
    * Region
    * Properties

In case there are differences identified the application update is triggered

## Usage

what we need to update in config to start using it?
pushing new changes to this repository triggers a deployment

Call the deployment scripts manually (from local machine or outside the CI server)
```sh
$ .muleci/deployment.sh deployment_descriptor.yml;
```

Requirements: 
* Node.js
* Anypoint-CLI




# Notes - TODO - to be cleaned up

prop folder == app name

update:
he deployment is running for application that has never been deployed befor

structure
deployment_descritor / what is configurable and how it works - compare to info in clouds
how to run - out of the CricleCI
 (nodejs and npm required)


- application name to be unique across the organisation
- app version - how it is compared with the version on cloudhub
- how script identifies if deployment is required
- how to use app properties:

	- properties are there but file is not available
	- file is available properties are empty
	- file is available and properties are there
		- properties are the same
		- missing property in config file
		- missing property on cloudhub
		- the same keys but different value
		- totaly different properties

- separate branch of deployment_descritor per environment
