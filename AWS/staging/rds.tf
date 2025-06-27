resource "aws_security_group" "rds_sg" {
    name_prefix = "evershift-terraform-rds-sg-staging"
    description = "Security group for RDS instance - staging"
    
    ingress {
        from_port = 5432
        to_port = 5432
        protocol = "tcp"
        cidr_blocks = ["0.0.0.0/0"]  
    }

    egress {
        from_port = 0
        to_port = 0
        protocol = "-1"
        cidr_blocks = ["0.0.0.0/0"]
    }

    tags = {
        Name = "evershift-rds-sg-staging"
        Environment = "staging"
    }
}

resource "aws_db_instance" "default" {
    allocated_storage    = 20
    storage_type         = "gp2"
    engine               = "postgres"
    engine_version       = "15"
    instance_class       = "db.t3.micro"
    db_name              = "evershift_staging"
    identifier           = "evershift-terraform-rds-staging"
    username             = jsondecode(data.aws_secretsmanager_secret_version.db_credentials.secret_string)["username"]
    password             = jsondecode(data.aws_secretsmanager_secret_version.db_credentials.secret_string)["password"]
    parameter_group_name = "default.postgres15"
    skip_final_snapshot  = true
    publicly_accessible  = true
    vpc_security_group_ids = [aws_security_group.rds_sg.id]
    
    # Backup configuration
    backup_retention_period = 7
    backup_window = "03:00-04:00"
    
    # Maintenance window
    maintenance_window = "Mon:04:00-Mon:05:00"
    
    # Performance Insights
    performance_insights_enabled = true
    performance_insights_retention_period = 7
    
    # Deletion protection - keeping false for staging
    deletion_protection = false
    
    tags = {
        Environment = "staging"
        Name = "evershift-db-staging"
    }
} 