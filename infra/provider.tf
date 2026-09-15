provider "aws" {
  profile = var.aws_profile
  region  = var.aws_region

  default_tags {
    tags = local.required_tags
  }
}

data "aws_caller_identity" "current" {}

locals {
  required_tags = {
    project     = "estudo-pdf"
    managed-by  = "terraform"
    source      = "GPT-Coders"
    environment = "beta"
  }
}
