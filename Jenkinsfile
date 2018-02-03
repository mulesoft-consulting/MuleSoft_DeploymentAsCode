pipeline {
    agent any

    environment {
        anypoint_username     = credentials('anypoint_username')
        anypoint_password     = credentials('anypoint_password')
    } 

    triggers {
        pollSCM('* * * * *')
    }

    stages {
    
    	stage('ARM Deployment') {
            steps { 
                sh 'npm install js-yaml'
                sh '.muleci/deployment.sh deployment_descriptor.yml' 
            }
        }
    	
    }

    post {
        always {
            cleanWs()
        }
    }
}