resource "aws_cognito_user_pool" "pool" {
    name                = "evershift-user-pool"
    mfa_configuration   = "OFF"
    alias_attributes    = ["email", "phone_number", "preferred_username"]
    auto_verified_attributes = []
    deletion_protection = "INACTIVE"
    
    # lambda_config {
    #     post_confirmation = aws_lambda_function.post_user_data.arn
    # }

    # email_configuration {
    #     email_sending_account = "COGNITO_DEFAULT"
    # }

    // email_mfa_configuration {
    // subject = "You have requested to verify your email address. Your verification code is"
    // message = "Your code is {####}"
    // }

    password_policy {
        minimum_length    = 8
        require_lowercase = true
        require_numbers   = true
        require_symbols   = true
    }

    schema {
        name = "email"
        required = true
        attribute_data_type = "String"
        mutable = true
    }

    schema {
        name = "given_name"
        required = true
        attribute_data_type = "String"
        mutable = true
    }

    schema {
        name = "family_name"
        required = true
        attribute_data_type = "String"
        mutable = true
    }

    schema {
        name = "phone_number"
        required = false
        attribute_data_type = "String"
        mutable = true
    }

    schema {
        name = "branch_id"
        required = false
        attribute_data_type = "String"
        mutable = true
        developer_only_attribute = false
    }

    // ------------- BEGIN CRITICAL SECTION -------------
    /*
    schema {
        name = "email"
        required = true
        attribute_data_type = "String"
        mutable = true
    }

    schema {
        name = "phone_number"
        required = true
        attribute_data_type = "String"
        mutable = true
    }

    schema {
        name = "preferred_username"
        required = true
        attribute_data_type = "String"
        mutable = true
    }

    schema {
        name = "custom:role"
        required = false // This was correctly false from previous steps
        attribute_data_type = "String"
        mutable = true
    }
    */
    // ------------- END CRITICAL SECTION -------------

    

    software_token_mfa_configuration {
        enabled = true
    }

    account_recovery_setting {
        recovery_mechanism {
            name        = "verified_email"
            priority    = 1
        }
        recovery_mechanism {
            name        = "verified_phone_number"
            priority    = 2
        }
    }
}

resource "aws_cognito_user_pool_client" "client" {
    name = "evershift-app-client"
    user_pool_id = aws_cognito_user_pool.pool.id

    explicit_auth_flows = [
        "ALLOW_USER_PASSWORD_AUTH",
        "ALLOW_REFRESH_TOKEN_AUTH",
        "ALLOW_USER_SRP_AUTH",
    ]
    
    allowed_oauth_flows_user_pool_client = true
    allowed_oauth_flows = ["code"]
    allowed_oauth_scopes = ["email", "openid", "profile", "aws.cognito.signin.user.admin"]

    callback_urls = ["http://localhost:8080/callback", "https://your-app-domain.com/callback"]
    logout_urls   = ["http://localhost:8080/logout", "https://your-app-domain.com/logout"]

    token_validity_units {
        access_token  = "hours"
        id_token      = "hours"
        refresh_token = "days"
    }
}

output "user_pool_id" {
  value = aws_cognito_user_pool.pool.id
}

output "user_pool_arn" {
  value = aws_cognito_user_pool.pool.arn
}

output "user_pool_client_id" {
  value = aws_cognito_user_pool_client.client.id
}

