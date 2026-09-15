output "app_id" { value = aws_amplify_app.web.id }
output "branch_name" { value = aws_amplify_branch.beta.branch_name }
output "public_url" { value = "https://${aws_amplify_branch.beta.branch_name}.${aws_amplify_app.web.default_domain}" }
