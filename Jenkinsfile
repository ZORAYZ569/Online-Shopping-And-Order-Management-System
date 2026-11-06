pipeline {
    agent any
    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }
        stage('Install Dependencies') {
            steps {
                bat 'npm install'
            }
        }
        stage('Build Docker Image') {
            steps {
                bat 'docker build -t online-shopping-system:latest .'
            }
        }
    }
}
