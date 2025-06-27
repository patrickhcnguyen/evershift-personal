resource "aws_lambda_function" "post_user_data" {
  function_name    = "prod_post_user_data"
  role             = aws_iam_role.lambda_exec_role.arn
  runtime          = "provided.al2023"
  handler          = "bootstrap"
  filename         = "../post_user_data.zip"
  source_code_hash = filebase64sha256("../post_user_data.zip")
  timeout          = 30  
  
  environment {
    variables = {
      DB_HOST     = aws_db_instance.default.address
      DB_PORT     = aws_db_instance.default.port
      DB_NAME     = aws_db_instance.default.db_name
      DB_USER     = jsondecode(data.aws_secretsmanager_secret_version.db_credentials.secret_string)["username"]
      DB_PASSWORD = jsondecode(data.aws_secretsmanager_secret_version.db_credentials.secret_string)["password"]
    }
  }
}

# Shared IAM role for both Lambda functions
resource "aws_iam_role" "lambda_exec_role" {
  name = "prod_lambda_execution_role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement: [{
      Action    = "sts:AssumeRole",
      Effect    = "Allow",
      Principal = {
        Service = "lambda.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_logging" {
  role       = aws_iam_role.lambda_exec_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_lambda_permission" "allow_cognito_post_user_data" {
  statement_id  = "AllowExecutionFromCognitoPost"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.post_user_data.function_name
  principal     = "cognito-idp.amazonaws.com"
  source_arn    = aws_cognito_user_pool.pool.arn
} 