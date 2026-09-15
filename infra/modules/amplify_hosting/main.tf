resource "aws_amplify_app" "web" {
  name     = var.name_prefix
  platform = "WEB"

  custom_rule {
    source = "/<*>"
    target = "/index.html"
    status = "404-200"
  }

  tags = var.tags
}

resource "aws_amplify_branch" "beta" {
  app_id            = aws_amplify_app.web.id
  branch_name       = "beta"
  stage             = "BETA"
  enable_auto_build = false
  tags              = var.tags
}
