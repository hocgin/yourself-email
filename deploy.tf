terraform {
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4"
    }
  }
}

provider "cloudflare" {
  # read token from $CLOUDFLARE_API_TOKEN
}

variable "CLOUDFLARE_ACCOUNT_ID" {
  type = string
}

variable "CLOUDFLARE_EMAIL_ADDRESS" {
  type = string
}

variable "CLOUDFLARE_DOMAIN_ZONE_ID" {
  type = string
}

resource "cloudflare_workers_kv_namespace" "yourselfemail_kv" {
  account_id = var.CLOUDFLARE_ACCOUNT_ID
  title      = "yourselfemail_kv"
}

resource "cloudflare_d1_database" "yourselfemail_db" {
  account_id = var.CLOUDFLARE_ACCOUNT_ID
  name       = "yourselfemail_db"
}

# 图片存储
#resource "cloudflare_r2_bucket" "yourselfemail_bucket" {
#  account_id = var.CLOUDFLARE_ACCOUNT_ID
#  name       = "yourselfemail_bucket"
#}


resource "cloudflare_worker_script" "yourselfemail_worker" {
  account_id         = var.CLOUDFLARE_ACCOUNT_ID
  name               = "yourselfemail_worker"
  content            = file("workers/dist/index.js")
  module             = true
  compatibility_date = "2024-04-05"

  kv_namespace_binding {
    name         = "KV"
    namespace_id = cloudflare_workers_kv_namespace.yourselfemail_kv.id
  }

  #  r2_bucket_binding {
  #    name        = "R2"
  #    bucket_name = cloudflare_r2_bucket.yourselfemail_bucket.id
  #  }

  d1_database_binding {
    name        = "DB"
    database_id = cloudflare_d1_database.yourselfemail_db.id
  }

}


resource "cloudflare_email_routing_address" "yourselfemail_email_routing_address" {
  account_id = var.CLOUDFLARE_ACCOUNT_ID
  email      = var.CLOUDFLARE_EMAIL_ADDRESS
}

# 邮件路由转发
resource "cloudflare_email_routing_catch_all" "yourselfemail_email_routing_catch_all" {
  name    = "yourselfemail_email_routing_catch_all"
  zone_id = var.CLOUDFLARE_DOMAIN_ZONE_ID
  enabled = true

  matcher {
    type = "all"
  }

  action {
    type  = "worker"
    value = [cloudflare_worker_script.yourselfemail_worker.name]
  }
}

# 定时发送
resource "cloudflare_worker_cron_trigger" "yourselfemail_worker_cron" {
  account_id  = var.CLOUDFLARE_ACCOUNT_ID
  script_name = cloudflare_worker_script.yourselfemail_worker.name
  schedules   = [
    "* * * * *",
  ]
}

resource "cloudflare_pages_project" "yourselfemail" {
  account_id        = var.CLOUDFLARE_ACCOUNT_ID
  name              = "yourselfemail"
  production_branch = "main"

  deployment_configs {
    production {
      kv_namespaces = {
        KV = cloudflare_workers_kv_namespace.yourselfemail_kv.id
      }
      d1_databases = {
        DB = cloudflare_d1_database.yourselfemail_db.id
      }
      #      r2_buckets = {
      #        BUCKET = cloudflare_r2_bucket.yourselfemail_bucket.id
      #      }

      compatibility_date  = "2024-04-05"
      compatibility_flags = ["nodejs_compat"]
    }
  }
}
