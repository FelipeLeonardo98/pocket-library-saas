resource "aws_secretsmanager_secret" "openai" {
  name = var.openai_secret_name
  tags = local.required_tags

  lifecycle {
    prevent_destroy = true
  }
}

module "amplify" {
  source      = "./modules/amplify_hosting"
  name_prefix = var.name_prefix
  tags        = local.required_tags
}

module "quota" {
  source      = "./modules/quota"
  name_prefix = var.name_prefix
  tags        = local.required_tags
}

module "identity" {
  source             = "./modules/identity"
  enabled            = var.enable_passwordless_auth
  name_prefix        = var.name_prefix
  ses_source_arn     = var.ses_source_arn
  from_email_address = var.from_email_address
  tags               = local.required_tags
}

module "serverless_api" {
  source                  = "./modules/serverless_api"
  name_prefix             = var.name_prefix
  aws_region              = var.aws_region
  source_file             = "${path.module}/../backend/dist/index.js"
  quota_table_name        = module.quota.table_name
  quota_table_arn         = module.quota.table_arn
  beta_access_key_sha256  = var.beta_access_key_sha256
  daily_ai_limit          = var.daily_ai_limit
  bedrock_model_id        = var.bedrock_model_id
  ai_provider             = "openai"
  openai_secret_arn       = aws_secretsmanager_secret.openai.arn
  openai_secret_key_field = var.openai_secret_key_field
  openai_model_id         = var.openai_model_id
  cors_origins = [
    "http://localhost:3000",
    "http://localhost:3001",
    module.amplify.public_url,
  ]
  tags = local.required_tags
}

module "cost_budget" {
  source                 = "./modules/cost_budget"
  budget_name            = "${var.name_prefix}-monthly-cost"
  budget_limit_usd       = 8
  alert_thresholds_usd   = [5, 8]
  notification_topic_arn = "arn:aws:sns:${var.aws_region}:${data.aws_caller_identity.current.account_id}:${var.budget_alert_topic_name}"
  tags                   = local.required_tags
}
