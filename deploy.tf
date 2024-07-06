terraform {

  // https://registry.terraform.io/providers/cloudflare/cloudflare/latest/docs/resources/email_routing_catch_all
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      # fix "Error: failed reading email routing destination address", https://github.com/cloudflare/terraform-provider-cloudflare/issues/3107#issuecomment-1982860666
      version = "~> 4.22.0"
    }
  }
}

provider "cloudflare" {
  # read token from $CLOUDFLARE_API_TOKEN
}

variable "CLOUDFLARE_ACCOUNT_ID" {
  type = string
}

variable "CLOUDFLARE_ZONE_NAME" {
  type = string
}

variable "CLOUDFLARE_EMAIL_ADDRESS" {
  type = string
}

variable "prefix" {
  type        = string
  description = "前缀"
  default     = "yourselfmail"
}

data "cloudflare_zone" "main" {
  #  account_id = var.CLOUDFLARE_ACCOUNT_ID
  name = var.CLOUDFLARE_ZONE_NAME
}

resource "cloudflare_workers_kv_namespace" "kv" {
  account_id = var.CLOUDFLARE_ACCOUNT_ID
  title      = "yourselfemail_kv"
}

resource "cloudflare_d1_database" "database" {
  account_id = var.CLOUDFLARE_ACCOUNT_ID
  name       = "yourselfemail_db"
}

# 图片存储
#resource "cloudflare_r2_bucket" "yourselfemail_bucket" {
#  account_id = var.CLOUDFLARE_ACCOUNT_ID
#  name       = "yourselfemail_bucket"
#}


resource "cloudflare_worker_script" "worker" {
  account_id         = var.CLOUDFLARE_ACCOUNT_ID
  name               = "yourselfemail_worker"
  content            = file("workers/dist/index.js")
  module             = true
  compatibility_date = "2024-04-05"

  kv_namespace_binding {
    name         = "KV"
    namespace_id = sensitive(cloudflare_workers_kv_namespace.kv.id)
  }

  #  r2_bucket_binding {
  #    name        = "R2"
  #    bucket_name = cloudflare_r2_bucket.yourselfemail_bucket.id
  #  }

  d1_database_binding {
    name        = "DB"
    database_id = sensitive(cloudflare_d1_database.database.id)
  }

}


resource "cloudflare_email_routing_settings" "email_routing_settings" {
  zone_id = data.cloudflare_zone.main.id
  enabled = true
}

#resource "cloudflare_email_routing_rule" "email_routing_rule" {
#  name    = "email_routing_rule"
#  zone_id = data.cloudflare_zone.main.id
#  enabled = true
#
#  matcher {
#    type = "all"
#  }
#
#  action {
#    type  = "worker"
#    value = [cloudflare_worker_script.worker.name]
#  }
#}

resource "cloudflare_email_routing_catch_all" "email_routing_catch_all" {
  name    = "email_routing_catch_all"
  zone_id = data.cloudflare_zone.main.id
  enabled = true

  matcher {
    type = "all"
  }

  action {
    type  = "worker"
    value = [cloudflare_worker_script.worker.name]
  }
}

resource "cloudflare_email_routing_address" "email_routing_address" {
  account_id = var.CLOUDFLARE_ACCOUNT_ID
  email      = var.CLOUDFLARE_EMAIL_ADDRESS
}

// https://scrapbox.io/hiroxto/Cloudflare_Registrar%E3%81%AE%E3%83%89%E3%83%A1%E3%82%A4%E3%83%B3%E3%82%92Terraform%E3%81%A7%E7%AE%A1%E7%90%86%E3%81%97%E3%81%A6%E3%81%84%E3%82%8B
resource "cloudflare_record" "mx_1" {
  zone_id  = data.cloudflare_zone.main.id
  name     = data.cloudflare_zone.main.name
  type     = "MX"
  value    = "route1.mx.cloudflare.net"
  priority = 3
}

resource "cloudflare_record" "mx_2" {
  zone_id  = data.cloudflare_zone.main.id
  name     = data.cloudflare_zone.main.name
  type     = "MX"
  value    = "route2.mx.cloudflare.net"
  priority = 58
}

resource "cloudflare_record" "mx_3" {
  zone_id  = data.cloudflare_zone.main.id
  name     = data.cloudflare_zone.main.name
  type     = "MX"
  value    = "route3.mx.cloudflare.net"
  priority = 95
}

resource "cloudflare_record" "txt" {
  zone_id = data.cloudflare_zone.main.id
  name    = data.cloudflare_zone.main.name
  type    = "TXT"
  value   = "v=spf1 include:_spf.mx.cloudflare.net ~all"
}


resource "cloudflare_record" "record" {
  zone_id = trimspace(data.cloudflare_zone.main.id)
  name    = "mail"
  value   = cloudflare_pages_project.page.subdomain
  type    = "CNAME"
  ttl     = 1
  proxied = true
}

resource "cloudflare_pages_domain" "domain" {
  account_id   = var.CLOUDFLARE_ACCOUNT_ID
  project_name = "${var.prefix}-domain"
  domain       = trimspace(data.cloudflare_zone.main.name)

  depends_on = [
    cloudflare_pages_project.page,
    cloudflare_record.record,
  ]
}


# 定时发送
resource "cloudflare_worker_cron_trigger" "cronjob" {
  account_id  = var.CLOUDFLARE_ACCOUNT_ID
  script_name = cloudflare_worker_script.worker.name
  schedules   = [
    "* * * * *",
  ]
}

resource "cloudflare_pages_project" "page" {
  account_id        = var.CLOUDFLARE_ACCOUNT_ID
  name              = "yourselfemail"
  production_branch = "main"

  deployment_configs {
    production {
      environment_variables = {

      }
      kv_namespaces = {
        KV = sensitive(cloudflare_workers_kv_namespace.kv.id)
      }
      d1_databases = {
        DB = sensitive(cloudflare_d1_database.database.id)
      }
      compatibility_date = "2024-04-05"
    }
  }
}
