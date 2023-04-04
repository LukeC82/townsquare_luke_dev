terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.54.0"
    }
  }

  backend "s3" {}
}

provider "aws" {
  region = "ap-southeast-2"
}

provider "aws" {
  region = "us-east-1"
  alias  = "acm-provider"
}


data "aws_caller_identity" "current" {}