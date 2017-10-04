echo "=== Deployment has started! ==="

#check input arguments
if [[ $# -eq 0 ]] ; then
    echo "ERROR: Please, pass the filename for deployment descritor as an argument!"
    exit 1
fi

#filename passed as script argument
filename="$1"

#Call Anypoint API to execute deployment and all the required configuration
echo '=== Invoke Anypoint API'
{ #try
	node .muleci/anypoint_deployment_cloud_api.js $filename
	node .muleci/anypoint_deployment_arm_api.js $filename
} || { #catch
	echo "=== ERROR: Error during deployment"
	exit 1
}

echo "=== Deployment has finished successfully! ==="