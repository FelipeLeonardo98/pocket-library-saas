variable "name_prefix" { type = string }
variable "aws_region" { type = string }
variable "source_file" { type = string }
variable "quota_table_name" { type = string }
variable "quota_table_arn" { type = string }
variable "beta_access_key_sha256" {
  type      = string
  sensitive = true
}
variable "daily_ai_limit" { type = number }
variable "bedrock_model_id" { type = string }
variable "ai_provider" { type = string }
variable "openai_secret_arn" { type = string }
variable "openai_secret_key_field" { type = string }
variable "openai_model_id" { type = string }
variable "cors_origins" { type = list(string) }
variable "tags" { type = map(string) }
