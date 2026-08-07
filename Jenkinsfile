pipeline {
    agent any

    parameters {
        choice(name: 'TEST_ENV', choices: ['local', 'staging', 'production'], description: 'Environment to run against')
    }

    stages {
        stage('Build image') {
            steps {
                sh 'docker build -t fashionhub-qa:${BUILD_NUMBER} .'
            }
        }

        stage('Run tests') {
            steps {
                sh '''
                    docker run --rm \
                        -e TEST_ENV=${TEST_ENV} \
                        -v "${WORKSPACE}/playwright-report:/app/playwright-report" \
                        -v "${WORKSPACE}/test-results:/app/test-results" \
                        -v "${WORKSPACE}/reports:/app/reports" \
                        fashionhub-qa:${BUILD_NUMBER}
                '''
            }
        }
    }

    post {
        always {
            junit testResults: 'test-results/junit.xml', allowEmptyResults: true
            archiveArtifacts artifacts: 'playwright-report/**, reports/**', allowEmptyArchive: true
            publishHTML(target: [
                reportDir: 'playwright-report',
                reportFiles: 'index.html',
                reportName: 'Playwright Report',
                keepAll: true,
                alwaysLinkToLastBuild: true
            ])
        }
    }
}
