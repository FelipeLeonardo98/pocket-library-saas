param(
  [string]$Profile = "terraform_father_account",
  [string]$Region = "us-east-1"
)

$ErrorActionPreference = "Stop"
$infraPath = Split-Path -Parent $PSScriptRoot
$projectPath = Split-Path -Parent $infraPath
$terraformDirectoryArgument = "-chdir=$infraPath"
$apiUrl = terraform $terraformDirectoryArgument output -raw api_url
$appId = terraform $terraformDirectoryArgument output -raw amplify_app_id
$branch = terraform $terraformDirectoryArgument output -raw amplify_branch_name

if (-not $apiUrl -or -not $appId -or -not $branch) {
  throw "Nao foi possivel ler os outputs do Terraform."
}

Push-Location $projectPath
try {
  $env:NEXT_PUBLIC_ASSISTANT_API_URL = $apiUrl
  npm run build
  $deployPath = Join-Path $projectPath "deploy"
  if (Test-Path $deployPath) { Remove-Item -LiteralPath $deployPath -Recurse -Force }
  New-Item -ItemType Directory -Path $deployPath | Out-Null
  $zipPath = Join-Path $deployPath "frontend.zip"
  Compress-Archive -Path (Join-Path $projectPath "out\*") -DestinationPath $zipPath -Force

  $deployment = aws amplify create-deployment --app-id $appId --branch-name $branch --profile $Profile --region $Region --output json | ConvertFrom-Json
  Invoke-WebRequest -Uri $deployment.zipUploadUrl -Method Put -InFile $zipPath -ContentType "application/zip" | Out-Null
  aws amplify start-deployment --app-id $appId --branch-name $branch --job-id $deployment.jobId --profile $Profile --region $Region | Out-Null
  Write-Output "Amplify deployment started: job $($deployment.jobId)"
}
finally {
  Pop-Location
}
