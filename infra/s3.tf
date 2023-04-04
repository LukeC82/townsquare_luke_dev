resource "aws_s3_bucket" "s3_bucket_static_website_host" {
  bucket = var.website_dns
  tags   = local.tags
}

resource "aws_s3_bucket_server_side_encryption_configuration" "s3_bucket_server_side_encryption" {
  bucket = aws_s3_bucket.s3_bucket_static_website_host.bucket

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_versioning" "s3_bucket_versioning" {
  # versioning is required for replication between buckets
  bucket = aws_s3_bucket.s3_bucket_static_website_host.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_cors_configuration" "s3_bucket_cors" {

  bucket = aws_s3_bucket.s3_bucket_static_website_host.id

  cors_rule {
    allowed_headers = var.website_cors_allowed_headers
    allowed_methods = var.website_cors_allowed_methods
    allowed_origins = concat(["https://${var.website_dns}"], var.website_cors_additional_allowed_origins)
    expose_headers  = var.website_cors_expose_headers
    max_age_seconds = var.website_cors_max_age_seconds
  }
}

resource "aws_s3_bucket_website_configuration" "s3_bucket_static_site_configuration" {

  bucket = aws_s3_bucket.s3_bucket_static_website_host.id

  # Please review the below to ensure accurate to our website uri's
  index_document {
    suffix = var.website_index_document
  }

  error_document {
    key = var.website_error_document
  }
}

resource "aws_s3_bucket_public_access_block" "website_bucket_public_access_block" {

  bucket                  = aws_s3_bucket.s3_bucket_static_website_host.id
  ignore_public_acls      = true
  block_public_acls       = true
  restrict_public_buckets = true
  block_public_policy     = true
}

resource "aws_s3_bucket_policy" "s3_bucket_website_policy" {

  bucket = aws_s3_bucket.s3_bucket_static_website_host.id
  policy = data.aws_iam_policy_document.s3_bucket_website_policy_document.json
}

data "aws_iam_policy_document" "s3_bucket_website_policy_document" {

  statement {
    sid    = "AllowSSLRequestsOnly"
    effect = "Deny"
    actions = [
      "s3:*",
    ]
    resources = [
      "${aws_s3_bucket.s3_bucket_static_website_host.arn}/*",
      aws_s3_bucket.s3_bucket_static_website_host.arn
    ]
    condition {
      test     = "Bool"
      variable = "aws:SecureTransport"
      values   = ["false"]
    }
    principals {
      type        = "*"
      identifiers = ["*"]
    }
  }

  statement {
    sid    = "OAIAccessOnly"
    effect = "Allow"
    actions = [
      "s3:GetObject",
    ]
    resources = [
      "${aws_s3_bucket.s3_bucket_static_website_host.arn}/*",
      aws_s3_bucket.s3_bucket_static_website_host.arn
    ]
    principals {
      type        = "AWS"
      identifiers = [aws_cloudfront_origin_access_identity.cf_oai.iam_arn]
    }
  }
}
