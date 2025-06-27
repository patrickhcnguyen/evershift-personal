resource "aws_db_instance" "default" {
  allocated_storage    = 50
  storage_type         = "gp2"
  engine               = "postgres"
  engine_version       = "15"
  instance_class       = "db.t3.small"
  db_name              = "evershift"
  username             = jsondecode(data.aws_secretsmanager_secret_version.db_credentials.secret_string)["username"]
  password             = jsondecode(data.aws_secretsmanager_secret_version.db_credentials.secret_string)["password"]
  parameter_group_name = "default.postgres15"
  skip_final_snapshot  = false
  publicly_accessible  = false
  backup_retention_period = 30
  deletion_protection = true
  
  tags = {
    Environment = "prod"
  }
} 