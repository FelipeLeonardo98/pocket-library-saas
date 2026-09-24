resource "aws_cognito_user_pool" "this" {
  count = var.enabled ? 1 : 0

  name                     = "${var.name_prefix}-readers"
  deletion_protection      = "ACTIVE"
  username_attributes      = ["email"]
  auto_verified_attributes = ["email"]
  mfa_configuration        = "OFF"
  user_pool_tier           = "ESSENTIALS"

  sign_in_policy {
    allowed_first_auth_factors = ["EMAIL_OTP"]
  }

  email_configuration {
    email_sending_account = "DEVELOPER"
    source_arn            = var.ses_source_arn
    from_email_address    = var.from_email_address
  }

  email_mfa_configuration {
    subject = "Seu código de acesso — Pocket Library"
    message = "Seu código de acesso ao Pocket Library é {####}. Ele expira em alguns minutos."
  }

  tags = var.tags

  lifecycle {
    precondition {
      condition     = !var.enabled || (var.ses_source_arn != "" && var.from_email_address != "")
      error_message = "Configure um e-mail/dominio verificado no SES antes de ativar o login por e-mail."
    }
  }
}

resource "aws_cognito_user_pool_client" "web" {
  count = var.enabled ? 1 : 0

  name                                 = "${var.name_prefix}-web"
  user_pool_id                         = aws_cognito_user_pool.this[0].id
  generate_secret                      = false
  prevent_user_existence_errors        = "ENABLED"
  explicit_auth_flows                  = ["ALLOW_USER_AUTH", "ALLOW_REFRESH_TOKEN_AUTH"]
  access_token_validity                = 60
  id_token_validity                    = 60
  refresh_token_validity               = 30
  enable_token_revocation              = true
  allowed_oauth_flows_user_pool_client = false

  token_validity_units {
    access_token  = "minutes"
    id_token      = "minutes"
    refresh_token = "days"
  }
}
