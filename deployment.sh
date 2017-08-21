echo "Deployment has started!"

#check input arguments
if [[ $# -eq 0 ]] ; then
    echo "ERROR: Please, pass the filename for deployment descritor as an argument!"
    exit 1
fi

#Parse deployment descriptor config file
filename="$1"
while read -r line
do
    data="$line"
    echo "Data - $data"
done < "$filename"

#Inoke Anypoint Platform API to deploy application

echo "Deployment has finished successfuly!"