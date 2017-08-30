# Mule CI

- application name to be unique across the organisation
- app version - how it is compared with the version on cloudhub
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
