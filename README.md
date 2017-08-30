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

In case there are differences identified in attributes mentioned above, the application update is triggered

## Usage

what we need to update in config to start using it?
properties file = prop folder == app name
if property file is empty no properties will be updated 
pushing new changes to this repository triggers a deployment

Call the deployment scripts manually (from local machine or outside the CI server)
```sh
$ .muleci/deployment.sh deployment_descriptor.yml
```

You need to install following libraries to run the deployment script: 
* Node.js
* Anypoint-CLI

Suggestion is to maintain a separate branch of this deployment project per each environment, so the environment specific settings could be maintained. The merge between the branches should not be required as the only expected changes are related to deployment environment itself.


# Notes - TODO - to be cleaned up

structure
deployment_descritor / what is configurable and how it works - compare to info in clouds
how to run - out of the CricleCI
 (nodejs and npm required)


- application name to be unique across the organisation



