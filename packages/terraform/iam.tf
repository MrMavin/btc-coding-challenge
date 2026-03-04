data "aws_iam_policy_document" "lambda_assume_role" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

data "aws_iam_policy_document" "scheduler_assume_role" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["scheduler.amazonaws.com"]
    }
  }
}

# --- Price Updater Lambda Role ---

resource "aws_iam_role" "price_updater" {
  name               = "${var.project_name}-${var.environment}-price-updater"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json
}

data "aws_iam_policy_document" "price_updater" {
  statement {
    sid     = "DynamoDBCoins"
    actions = ["dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:UpdateItem"]
    resources = [aws_dynamodb_table.coins.arn]
  }

  statement {
    sid = "DynamoDBConnections"
    actions = [
      "dynamodb:Scan",
      "dynamodb:GetItem",
      "dynamodb:DeleteItem",
    ]
    resources = [aws_dynamodb_table.connections.arn]
  }

  statement {
    sid = "DynamoDBUsers"
    actions = [
      "dynamodb:Scan",
      "dynamodb:UpdateItem",
    ]
    resources = [
      aws_dynamodb_table.users.arn,
      "${aws_dynamodb_table.users.arn}/index/*",
    ]
  }

  statement {
    sid     = "WebSocketManage"
    actions = ["execute-api:ManageConnections"]
    resources = ["${aws_apigatewayv2_api.websocket.execution_arn}/*"]
  }

  statement {
    sid = "Logs"
    actions = [
      "logs:CreateLogStream",
      "logs:PutLogEvents",
    ]
    resources = ["${aws_cloudwatch_log_group.price_updater.arn}:*"]
  }
}

resource "aws_iam_role_policy" "price_updater" {
  name   = "price-updater-policy"
  role   = aws_iam_role.price_updater.id
  policy = data.aws_iam_policy_document.price_updater.json
}

# --- API Lambda Role ---

resource "aws_iam_role" "api" {
  name               = "${var.project_name}-${var.environment}-api"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json
}

data "aws_iam_policy_document" "api" {
  statement {
    sid     = "DynamoDBCoins"
    actions = ["dynamodb:GetItem", "dynamodb:Query"]
    resources = [aws_dynamodb_table.coins.arn]
  }

  statement {
    sid = "DynamoDBUsers"
    actions = [
      "dynamodb:GetItem",
      "dynamodb:PutItem",
      "dynamodb:UpdateItem",
      "dynamodb:DeleteItem",
    ]
    resources = [aws_dynamodb_table.users.arn]
  }

  statement {
    sid = "DynamoDBConnections"
    actions = [
      "dynamodb:PutItem",
      "dynamodb:DeleteItem",
      "dynamodb:UpdateItem",
    ]
    resources = [aws_dynamodb_table.connections.arn]
  }

  statement {
    sid = "Logs"
    actions = [
      "logs:CreateLogStream",
      "logs:PutLogEvents",
    ]
    resources = ["${aws_cloudwatch_log_group.api.arn}:*"]
  }
}

resource "aws_iam_role_policy" "api" {
  name   = "api-policy"
  role   = aws_iam_role.api.id
  policy = data.aws_iam_policy_document.api.json
}

# --- EventBridge Scheduler Role ---

resource "aws_iam_role" "eventbridge_scheduler" {
  name               = "${var.project_name}-${var.environment}-scheduler"
  assume_role_policy = data.aws_iam_policy_document.scheduler_assume_role.json
}

data "aws_iam_policy_document" "eventbridge_scheduler" {
  statement {
    actions   = ["lambda:InvokeFunction"]
    resources = [aws_lambda_function.price_updater.arn]
  }
}

resource "aws_iam_role_policy" "eventbridge_scheduler" {
  name   = "scheduler-policy"
  role   = aws_iam_role.eventbridge_scheduler.id
  policy = data.aws_iam_policy_document.eventbridge_scheduler.json
}
