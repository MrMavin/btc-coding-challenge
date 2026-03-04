variable "aws_region" {
  description = "AWS region to deploy resources"
  type        = string
  default     = "eu-central-1"
}

variable "project_name" {
  description = "Project name used for resource naming"
  type        = string
  default     = "btc-coding-challenge"
}

variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "dev"
}

variable "lambda_runtime" {
  description = "Python runtime for Lambda functions"
  type        = string
  default     = "python3.12"
}

variable "price_updater_lambda_s3_key" {
  description = "S3 key for the price updater Lambda zip artifact. Leave null to use placeholder."
  type        = string
  default     = null
}

variable "api_lambda_s3_key" {
  description = "S3 key for the API Lambda zip artifact. Leave null to use placeholder."
  type        = string
  default     = null
}

variable "coinstats_api_key" {
  description = "API key for CoinStats API"
  type        = string
  sensitive   = true
}
