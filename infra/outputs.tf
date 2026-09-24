output "api_url" {
  value       = module.serverless_api.api_url
  description = "Public HTTP API URL."
}

output "public_url" {
  value       = module.amplify.public_url
  description = "Public Amplify beta URL."
}

output "amplify_app_id" {
  value       = module.amplify.app_id
  description = "Amplify app ID used by the manual deployment script."
}

output "amplify_branch_name" {
  value       = module.amplify.branch_name
  description = "Amplify branch used by the beta."
}

output "quota_table_name" {
  value       = module.quota.table_name
  description = "DynamoDB table that stores daily AI usage."
}

output "cognito_user_pool_id" {
  value       = module.identity.user_pool_id
  description = "Cognito user pool ID when passwordless login is enabled."
}

output "cognito_web_client_id" {
  value       = module.identity.web_client_id
  description = "Cognito web client ID when passwordless login is enabled."
}
