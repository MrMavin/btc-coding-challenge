resource "aws_dynamodb_table" "coins" {
  name         = "${var.project_name}-${var.environment}-coins"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "symbol"

  attribute {
    name = "symbol"
    type = "S"
  }
}

resource "aws_dynamodb_table" "connections" {
  name         = "${var.project_name}-${var.environment}-connections"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "connection_id"

  attribute {
    name = "connection_id"
    type = "S"
  }
}

resource "aws_dynamodb_table" "users" {
  name         = "${var.project_name}-${var.environment}-users"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "user_id"

  attribute {
    name = "user_id"
    type = "S"
  }

  attribute {
    name = "bet_at"
    type = "S"
  }

  global_secondary_index {
    name            = "bet_at-index"
    hash_key        = "bet_at"
    projection_type = "ALL"
  }
}
