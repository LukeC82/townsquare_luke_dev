# Townsquare Infra
Terraform infrstructure as code to spin up a static hosted website in AWS using
CloudFront, S3 and Route53.

## Requirements

* CLI access to the hosted account
* [Terraform](https://learn.hashicorp.com/tutorials/terraform/install-cli) ~= 1.2.4
* [Terragrunt](https://terragrunt.gruntwork.io/docs/getting-started/install/) = latest

## Running
* First, configure and authenticate to the AWS account:

        aws configure

        AWS Access Key ID [None]: (Ask Ross)
        AWS Secret Access Key [None]: (Ask Ross)
        Default region name [ap-southeast-2]: ap-southeast-2
        Default output format [json]: json
* Change into the terraform directory:

        cd infra

* Apply the terraform

        terragrunt apply