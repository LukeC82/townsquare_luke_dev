resource "aws_codebuild_project" "deploy_project" {
  name          = "townsquare-deploy"
  description   = "Build and deploy the develop branch of the townsquare fork repo"
  build_timeout = 300
  service_role  = aws_iam_role.codebuild_role.arn

  environment {
    compute_type    = "BUILD_GENERAL1_SMALL"
    image           = "aws/codebuild/standard:5.0"
    type            = "LINUX_CONTAINER"
    privileged_mode = false

    environment_variable {
      name  = "WEBSITE_BUCKET_NAME"
      value = local.website_bucket
    }

    environment_variable {
      name  = "CLOUDFRONT_DISTRIBUTION"
      value = local.cloudfront_distribution
    }

  }

  source {
    type      = "GITHUB"
    buildspec = "ci-cd/buildspec.yml"
    location  = "https://github.com/rosstc/townsquare.git"
  }

  artifacts {
    type = "NO_ARTIFACTS"
  }

  tags = local.tags
}

resource "aws_codebuild_source_credential" "github_token" {
  auth_type   = "PERSONAL_ACCESS_TOKEN"
  server_type = "GITHUB"
  token       = var.github_access_token
}

resource "aws_codebuild_webhook" "this_webhook" {
  project_name = aws_codebuild_project.deploy_project.name
  build_type   = "BUILD"

  filter_group {
    filter {
      type    = "EVENT"
      pattern = "PUSH"
    }

    filter {
      type    = "HEAD_REF"
      pattern = "^refs/heads/develop"
    }
  }
}

data "aws_iam_policy_document" "trust_policy_document_codebuild" {
  statement {
    sid    = "CodeBuildTrustPolicy"
    effect = "Allow"

    actions = [
      "sts:AssumeRole",
    ]

    principals {
      identifiers = [
        "codebuild.amazonaws.com",
      ]

      type = "Service"
    }
  }
}

data "aws_iam_policy_document" "codebuild_policy_statement" {
  statement {
    sid    = "AllowWritingS3"
    effect = "Allow"
    actions = [
      "s3:PutObject",
      "s3:List*",
      "s3:GetEncryptionConfiguration",
      "s3:GetBucketVersioning",
      "s3:Get*",
      "s3:DeleteObject",
      "s3:CreateBucket"
    ]
    resources = [
      "arn:aws:s3:::${local.website_bucket}",
      "arn:aws:s3:::${local.website_bucket}/*",
    ]
  }

  statement {
    sid    = "CreateLogGroupStream"
    effect = "Allow"
    actions = [
      "logs:CreateLogGroup",
      "logs:CreateLogStream",
      "logs:PutLogEvents",
      "logs:PutRetentionPolicy",
      "logs:DeleteLogGroup"
    ]
    resources = [
      "arn:aws:logs:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:log-group*"
    ]
  }

  statement {
    sid    = "AllowReadLogs"
    effect = "Allow"
    actions = [
      "logs:DescribeLogGroups",
      "logs:DescribeLogStreams",
      "logs:ListTagsLogGroup",
      "logs:TagLogGroup"
    ]
    resources = [
      "arn:aws:logs:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:*",
    ]
  }

  statement {
    sid    = "AllowQueryBuild"
    effect = "Allow"
    actions = [
      "codebuild:BatchGetProjects"
    ]
    resources = [
      "arn:aws:codebuild:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:*"
    ]
  }

  statement {
    sid    = "AllowCloudFrontCacheRefresh"
    effect = "Allow"
    actions = [
      "cloudfront:CreateInvalidation"
    ]
    resources = [
      "arn:aws:cloudfront::${data.aws_caller_identity.current.account_id}:distribution/${local.cloudfront_distribution}"
    ]
  }

  statement {
    sid    = "IAM"
    effect = "Allow"
    actions = [
      "iam:*",
    ]
    resources = [
      "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/townsquare*",
      "arn:aws:iam::${data.aws_caller_identity.current.account_id}:instance-profile/townsquare*",
      "arn:aws:iam::${data.aws_caller_identity.current.account_id}:policy/townsquare*"
    ]
  }
}

resource "aws_iam_policy" "codebuild_iam_policy" {
  name   = "townsquare-Deploy-Policy"
  policy = data.aws_iam_policy_document.codebuild_policy_statement.json
  tags   = local.tags
}

resource "aws_iam_role" "codebuild_role" {
  name               = "townsquare-deploy-role"
  assume_role_policy = data.aws_iam_policy_document.trust_policy_document_codebuild.json
  tags               = local.tags
}

resource "aws_iam_policy_attachment" "policy_attachment_codebuild_role" {
  name       = "codebuild-role-policy-attachment"
  roles      = [aws_iam_role.codebuild_role.name]
  policy_arn = aws_iam_policy.codebuild_iam_policy.arn
}
