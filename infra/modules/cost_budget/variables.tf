variable "budget_name" { type = string }
variable "budget_limit_usd" { type = number }
variable "alert_thresholds_usd" { type = list(number) }
variable "notification_topic_arn" { type = string }
variable "tags" { type = map(string) }
