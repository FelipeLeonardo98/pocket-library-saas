output "user_pool_id" {
  value       = try(aws_cognito_user_pool.this[0].id, null)
  description = "Cognito user pool ID when identity is enabled."
}

output "web_client_id" {
  value       = try(aws_cognito_user_pool_client.web[0].id, null)
  description = "Public Cognito web client ID when identity is enabled."
}
