variable "aws_profile" {
  type        = string
  description = "Named local AWS CLI profile used by Terraform."
  default     = "terraform_father_account"
}

variable "aws_region" {
  type        = string
  description = "AWS region for the beta infrastructure."
  default     = "us-east-1"
}

variable "name_prefix" {
  type        = string
  description = "Prefix used for project resources."
  default     = "estudo-pdf"
}

variable "beta_access_key_sha256" {
  type        = string
  sensitive   = true
  description = "SHA-256 of the beta access key. The raw key must never enter Terraform state."
}

variable "daily_ai_limit" {
  type        = number
  description = "Maximum AI interactions per beta key per UTC day."
  default     = 30
}

variable "bedrock_model_id" {
  type        = string
  description = "Bedrock foundation model used by the reading assistant."
  default     = "amazon.nova-micro-v1:0"
}

variable "openai_secret_name" {
  type        = string
  description = "Secrets Manager secret containing the OpenAI API key."
  default     = "estudo-pdf/openai-api-key"
}

variable "openai_secret_key_field" {
  type        = string
  description = "JSON field containing the OpenAI API key inside the secret."
  default     = "data"
}

variable "openai_model_id" {
  type        = string
  description = "OpenAI model used while Bedrock account inference is unavailable."
  default     = "gpt-5.6-luna"
}

variable "budget_alert_topic_name" {
  type        = string
  description = "Existing SNS topic that receives account cost alerts."
  default     = "sns-orchestration"
}
