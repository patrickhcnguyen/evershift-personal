provider "aws" {
  region = "us-east-2"
}

data "aws_secretsmanager_secret" "db_credentials" {
  name = "dev/db/credentials"
}

data "aws_secretsmanager_secret_version" "db_credentials" {
  secret_id = data.aws_secretsmanager_secret.db_credentials.id
} 