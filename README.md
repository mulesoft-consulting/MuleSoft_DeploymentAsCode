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

In case there are differences identified in attributes mentioned above, the application update is triggered.

## Usage

To configure and trigger the deployment `deployment_descriptor.yml` must be updated and committed to central repository. CI Server (e.g. Jenkins, CircleCI) could be either listening to changes and start deployment process after updated configuration file is delivered or scheduled for night builds (deployment configuration and scripts do not depend on CI configuration, despite the project contains CircleCI config file - CircleCI is preconfigured as part of the solution).

#### Before the first run:

Configuration file `deployment_descriptor.yml` must be updated:
* **Env** - environment applications are deployed on (if configuration of another environment is required, the suggestion is to create a new branch from this repository - please see Suggestion details at the end of the section).
* **Business Group** - insert your Business Group, where your applications are deployed (or will be deployed).
* **Applications** - configure the applications and runtime details.

Following environment variables must be configured on CI server:
* Deployer's credentials used to login to Anypoint Platform
   * anypoint_username
   * anypoint_password

#### How to update `Properties` of your application:
Application Properties are maintained as part of this repository and are stored in the folder that follows naming conventions as described below.

```
app_properties/[app.name]/[app.name]-[branch].properties

Example:
app_properties/bid-processing-ir-ecotricity/bid-processing-ir-ecotricity-branch1.properties

Where:
app.name == bid-processing-ir-ecotricity
branch == branch1 (this is NOT the branch of this repository, this is the branch of the repository where application source code is managed).
```
Important note: `app.name` is the `name` field in `deployment_descriptor.yml`

If the property file is empty no properties will be updated on the server.


#### Call the deployment scripts manually (from local machine or outside the CI server)
```sh
$ .muleci/deployment.sh deployment_descriptor.yml
```

You need to install following libraries to run the deployment script: 
* Node.js
* Anypoint-CLI

# Suggestion
Suggestion is to maintain a separate branch of this deployment project per each environment, so the environment specific settings could be maintained. The merge between the branches should not be required as the only expected changes are related to deployment environment itself.


# TODOs
