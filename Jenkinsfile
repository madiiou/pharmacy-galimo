pipeline {
    agent any

    stages {
        stage('Prepare secrets') {
            steps {
                sh 'cp /home/ubuntu/pharmacy-app/.env .env'
            }
        }
        stage('Build') {
            steps {
                sh 'docker compose build'
            }
        }
        stage('Deploy') {
            steps {
                sh 'docker compose up -d'
            }
        }
        stage('Deploy admin dashboard') {
            steps {
                dir('admin') {
                    sh 'npm ci'
                    sh 'npm run build'
                    sh 'rsync -a --delete dist/ /var/www/pharmacy-admin/'
                }
            }
        }
    }

    post {
        always {
            sh 'docker image prune -f'
        }
    }
}
