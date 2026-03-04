resource "aws_scheduler_schedule" "price_updater" {
  name       = "${var.project_name}-${var.environment}-price-updater"
  group_name = "default"

  schedule_expression = "rate(1 minute)"

  flexible_time_window {
    mode = "OFF"
  }

  target {
    arn      = aws_lambda_function.price_updater.arn
    role_arn = aws_iam_role.eventbridge_scheduler.arn
  }
}
