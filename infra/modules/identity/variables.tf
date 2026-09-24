variable "enabled" {
  type        = bool
  description = "Whether to create the Cognito passwordless email sign-in resources."
  default     = false
}

variable "name_prefix" {
  type        = string
  description = "Prefix used in Cognito resource names."
}

variable "ses_source_arn" {
  type        = string
  description = "ARN of the verified Amazon SES email identity used to deliver one-time codes."
  default     = ""
}

variable "from_email_address" {
  type        = string
  description = "Verified address displayed as the sender of sign-in emails."
  default     = ""
}

variable "tags" {
  type        = map(string)
  description = "Tags applied to supported resources."
}
