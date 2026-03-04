# --- Placeholder zip for first deploy ---

data "archive_file" "placeholder" {
  type        = "zip"
  source_file = "${path.module}/placeholder/handler.py"
  output_path = "${path.module}/placeholder/handler.zip"
}

# --- CloudWatch Log Groups ---

resource "aws_cloudwatch_log_group" "price_updater" {
  name              = "/aws/lambda/${var.project_name}-${var.environment}-price-updater"
  retention_in_days = 14
}

resource "aws_cloudwatch_log_group" "api" {
  name              = "/aws/lambda/${var.project_name}-${var.environment}-api"
  retention_in_days = 14
}

# --- Price Updater Lambda ---

resource "aws_lambda_function" "price_updater" {
  function_name = "${var.project_name}-${var.environment}-price-updater"
  role          = aws_iam_role.price_updater.arn
  runtime       = var.lambda_runtime
  handler       = "handler.handler"
  timeout       = 60
  memory_size   = 256

  s3_bucket = var.price_updater_lambda_s3_key != null ? aws_s3_bucket.lambda_artifacts.id : null
  s3_key    = var.price_updater_lambda_s3_key

  filename         = var.price_updater_lambda_s3_key == null ? data.archive_file.placeholder.output_path : null
  source_code_hash = var.price_updater_lambda_s3_key == null ? data.archive_file.placeholder.output_base64sha256 : null

  environment {
    variables = {
      COINS_TABLE_NAME       = aws_dynamodb_table.coins.name
      USERS_TABLE_NAME       = aws_dynamodb_table.users.name
      COINSTATS_API_KEY      = var.coinstats_api_key
      CONNECTIONS_TABLE_NAME = aws_dynamodb_table.connections.name
      WEBSOCKET_API_ENDPOINT = "${aws_apigatewayv2_api.websocket.api_endpoint}/${aws_apigatewayv2_stage.websocket.name}"
    }
  }

  depends_on = [aws_cloudwatch_log_group.price_updater]
}

# --- API Lambda ---

resource "aws_lambda_function" "api" {
  function_name = "${var.project_name}-${var.environment}-api"
  role          = aws_iam_role.api.arn
  runtime       = var.lambda_runtime
  handler       = "handler.handler"
  timeout       = 30
  memory_size   = 256

  s3_bucket = var.api_lambda_s3_key != null ? aws_s3_bucket.lambda_artifacts.id : null
  s3_key    = var.api_lambda_s3_key

  filename         = var.api_lambda_s3_key == null ? data.archive_file.placeholder.output_path : null
  source_code_hash = var.api_lambda_s3_key == null ? data.archive_file.placeholder.output_base64sha256 : null

  environment {
    variables = {
      COINS_TABLE_NAME       = aws_dynamodb_table.coins.name
      USERS_TABLE_NAME       = aws_dynamodb_table.users.name
      CONNECTIONS_TABLE_NAME = aws_dynamodb_table.connections.name
    }
  }

  depends_on = [aws_cloudwatch_log_group.api]
}
