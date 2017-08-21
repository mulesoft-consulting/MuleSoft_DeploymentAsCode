echo "=== Deployment has started! ==="

#check input arguments
if [[ $# -eq 0 ]] ; then
    echo "ERROR: Please, pass the filename for deployment descritor as an argument!"
    exit 1
fi

#filename passed as script argument
filename="$1"

#Dowload deployable package from repository
echo "=== Downloading deployable package from repository"
curl -O https://github.com/igor-repka/packages/raw/master/bid-processing-1.0.0-SNAPSHOT.zip

#Call Anypoint API to execute deployment and all the required configuration
echo '=== Invoke Anypoint API'
node anypoint_deployment_api.js $filename

echo "=== Deployment has finished successfully! ==="