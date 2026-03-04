output "frontend_website_url" {
  description = "Frontend URL (S3 website hosting)"
  value       = "http://${aws_s3_bucket_website_configuration.frontend.website_endpoint}"
}

output "api_gateway_invoke_url" {
  description = "API base URL for HTTP requests"
  value       = aws_apigatewayv2_api.api.api_endpoint
}

output "frontend_bucket_name" {
  description = "S3 bucket name for frontend assets"
  value       = aws_s3_bucket.frontend.id
}

output "lambda_artifacts_bucket_name" {
  description = "S3 bucket name for Lambda artifacts"
  value       = aws_s3_bucket.lambda_artifacts.id
}

output "coins_table_name" {
  description = "DynamoDB coins table name"
  value       = aws_dynamodb_table.coins.name
}

output "users_table_name" {
  description = "DynamoDB users table name"
  value       = aws_dynamodb_table.users.name
}

output "price_updater_function_name" {
  description = "Price updater Lambda function name"
  value       = aws_lambda_function.price_updater.function_name
}

output "api_function_name" {
  description = "API Lambda function name"
  value       = aws_lambda_function.api.function_name
}

output "websocket_api_url" {
  description = "WebSocket API URL for real-time updates"
  value       = "${aws_apigatewayv2_api.websocket.api_endpoint}/${aws_apigatewayv2_stage.websocket.name}"
}

output "connections_table_name" {
  description = "DynamoDB connections table name"
  value       = aws_dynamodb_table.connections.name
}
