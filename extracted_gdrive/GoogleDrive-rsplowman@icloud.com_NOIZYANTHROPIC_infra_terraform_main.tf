# ═══════════════════════════════════════════════════════════════
# NOIZY EMPIRE — Terraform Infrastructure Plan (Modular)
# Cloudflare + Google Workspace + GCP
# ═══════════════════════════════════════════════════════════════
#
# Usage:
#   cd infra/terraform
#   terraform init
#   terraform plan -var-file="noizy.tfvars"
#   terraform apply -var-file="noizy.tfvars"
#
# Prerequisites:
#   - Cloudflare API token with Zone:Edit, DNS:Edit, Account:Read
#   - Google Cloud project with billing enabled
#   - terraform >= 1.5
# ═══════════════════════════════════════════════════════════════

terraform {
  required_version = ">= 1.5"

  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
    github = {
      source  = "integrations/github"
      version = "~> 6.0"
    }
    vault = {
      source  = "hashicorp/vault"
      version = "~> 4.0"
    }
    vercel = {
      source  = "vercel/vercel"
      version = "~> 2.0"
    }
    http = {
      source  = "hashicorp/http"
      version = "~> 3.0"
    }
  }

  # ─── HashiCorp Terraform Cloud ─────────────────────────────
  # State, runs, variable sets, and run triggers live in TFC.
  # Org: NOIZYFISH  →  Workspace: NOIZYEMPIRE
  # Variable set "noizy-core" provides: cloudflare_api_token,
  # github_token, google_credentials (org-scoped, attached to
  # every NOIZY workspace).
  # Bootstrap: `terraform login` then `terraform init`.
  cloud {
    organization = "NOIZYFISH"

    workspaces {
      name = "NOIZYEMPIRE"
    }
  }
}

# ─── Variables ───────────────────────────────────────────────

variable "cloudflare_api_token" {
  description = "Cloudflare API token"
  type        = string
  sensitive   = true
}

variable "cloudflare_account_id" {
  description = "Cloudflare account ID"
  type        = string
  default     = "5f36aa9795348ea681d0b21910dfc82a"
}

variable "gcp_project_id" {
  description = "Google Cloud project ID"
  type        = string
  default     = "noizy-empire-01"
}

variable "gcp_region" {
  description = "GCP region"
  type        = string
  default     = "us-central1"
}

variable "admin_email" {
  description = "Backend admin email"
  type        = string
  default     = "rsplowman@icloud.com"
}

variable "public_email" {
  description = "Public-facing email"
  type        = string
  default     = "rsp@noizy.ai"
}

variable "github_token" {
  description = "GitHub fine-grained PAT with admin:repo on noizy-empire (set via TFC variable set, NOT in tfvars)"
  type        = string
  sensitive   = true
}

variable "github_owner" {
  description = "GitHub organization — all managed repos live here. Locked to noizy-empire 2026-04-19 (gate 1 decision)."
  type        = string
  default     = "noizy-empire"
}

# ─── Providers ───────────────────────────────────────────────

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

provider "google" {
  project = var.gcp_project_id
  region  = var.gcp_region
}

provider "github" {
  token = var.github_token
  owner = var.github_owner
}

# ─── Locals ──────────────────────────────────────────────────

locals {
  google_mx_records = {
    "aspmx.l.google.com"      = 1
    "alt1.aspmx.l.google.com" = 5
    "alt2.aspmx.l.google.com" = 5
    "alt3.aspmx.l.google.com" = 10
    "alt4.aspmx.l.google.com" = 10
  }
}

# ═══════════════════════════════════════════════════════════════
# CLOUDFLARE ZONES
# ═══════════════════════════════════════════════════════════════

module "zone_noizy_ai" {
  source = "./modules/cloudflare-zone"

  domain              = "noizy.ai"
  account_id          = var.cloudflare_account_id
  dmarc_email         = var.public_email
  spf_record          = "v=spf1 include:_spf.google.com include:_spf.mx.cloudflare.net ~all"
  mx_records          = local.google_mx_records
  create_dummy_record = true # Required for Worker route activation
}

module "zone_noizyfish_com" {
  source = "./modules/cloudflare-zone"

  domain      = "noizyfish.com"
  account_id  = var.cloudflare_account_id
  dmarc_email = var.public_email
  spf_record  = "v=spf1 include:_spf.mx.cloudflare.net ~all"
}

module "zone_fishmusicinc_com" {
  source = "./modules/cloudflare-zone"

  domain      = "fishmusicinc.com"
  account_id  = var.cloudflare_account_id
  dmarc_email = var.public_email
  spf_record  = "v=spf1 include:_spf.mx.cloudflare.net ~all"
}

module "zone_noizyfish_ca" {
  source = "./modules/cloudflare-zone"

  domain      = "noizyfish.ca"
  account_id  = var.cloudflare_account_id
  dmarc_email = var.public_email
  spf_record  = "v=spf1 include:_spf.mx.cloudflare.net ~all"
}

# ═══════════════════════════════════════════════════════════════
# CLOUDFLARE WORKERS
# ═══════════════════════════════════════════════════════════════

module "worker_heaven" {
  source = "./modules/cloudflare-worker"

  account_id  = var.cloudflare_account_id
  worker_name = "heaven"
  script_path = "${path.module}/../../repos/noizy-heaven/src/index.ts"

  # ⚠️  LIVE D1 IDs — confirmed via GABRIEL memcell pull 2026-04-16
  d1_bindings = {
    DB_MEMORY  = "b5b58cc9-1f37-4000-adc5-12f9e419662f" # agent-memory
    DB_REPAIRS = "cd6cae46-e5cd-42b6-a97a-5d0e576c1c2a" # noizy-prod
  }

  kv_bindings = {
    KV_SIGNUPS     = "392c1bf429114148999824a9f9e15169"
    KV_ROYALTIES   = "4cf36e4bd1fd44fe802096925413f694"
    KV_GUILD       = "8a15ed31fea8462da7c92a8237d6f854"
    KV_SESSIONS    = "c90299891f684de7bcc7c53967133748"
    KV_SUBMISSIONS = "6e888a017ebe4ba78ed7497c4929439b"
    KV_MEMCELL     = "9aa2511652ce4a2faeb106858f76df67"
    FEATURE_FLAGS  = "88331123208c460eb26cb703d5a38c50"
    GAP_SOLVER     = "4941fb7967d14406bad7a252cd3d0a1e"
  }

  env_vars = {
    NOIZY_ENV            = "production"
    NOIZY_VERSION        = "18.1.0"
    FOUNDING_ACTOR_FLOOR = "85"
    STANDARD_ACTOR_FLOOR = "75"
    VOICE_VAULT_BUCKET   = "noizy-voice-vault"
    MESH_ORIGIN          = "https://mesh.noizy.ai"
  }
}

module "worker_landing" {
  source = "./modules/cloudflare-worker"

  account_id  = var.cloudflare_account_id
  worker_name = "noizy-landing"
  script_path = "${path.module}/../../noizy-landing/src/index.js"

  routes = {
    "noizy.ai/*" = { zone_id = module.zone_noizy_ai.zone_id }
    "noizy.ai"   = { zone_id = module.zone_noizy_ai.zone_id }
  }
}

# ═══════════════════════════════════════════════════════════════
# GCP / GOOGLE WORKSPACE
# ═══════════════════════════════════════════════════════════════

module "gcp_workspace" {
  source = "./modules/gcp-workspace"

  project_name = "NOIZY Empire"
  project_id   = var.gcp_project_id
}

# ═══════════════════════════════════════════════════════════════
# OUTPUTS
# ═══════════════════════════════════════════════════════════════

output "zones" {
  value = {
    "noizy.ai"         = { id = module.zone_noizy_ai.zone_id, status = module.zone_noizy_ai.status, ns = module.zone_noizy_ai.nameservers }
    "noizyfish.com"    = { id = module.zone_noizyfish_com.zone_id, status = module.zone_noizyfish_com.status }
    "fishmusicinc.com" = { id = module.zone_fishmusicinc_com.zone_id, status = module.zone_fishmusicinc_com.status }
    "noizyfish.ca"     = { id = module.zone_noizyfish_ca.zone_id, status = module.zone_noizyfish_ca.status }
  }
}

output "workers" {
  value = {
    heaven  = module.worker_heaven.worker_name
    landing = module.worker_landing.worker_name
  }
}

output "gcp_project" {
  value = module.gcp_workspace.project_id
}
