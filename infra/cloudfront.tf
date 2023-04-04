#------------------------------------------------------------------------------
# CloudFront Origin Access Identity
#------------------------------------------------------------------------------
resource "aws_cloudfront_origin_access_identity" "cf_oai" {
  comment = "OAI to restrict access to AWS S3 content"
}

#------------------------------------------------------------------------------
# Cloudfront for S3 Bucket Website
#------------------------------------------------------------------------------

# AWS Managed Caching Policy - Found in AWS Management Console at CloudFront > Policies > Cache
data "aws_cloudfront_cache_policy" "caching_optimised" {
  name = "Managed-CachingOptimized"
}

# AWS Managed Caching Policy - Found in AWS Management Console at CloudFront > Policies > Origin request
data "aws_cloudfront_origin_request_policy" "cors_s3_origin" {
  name = "Managed-CORS-S3Origin"
}

resource "aws_cloudfront_distribution" "cloudfront_s3_frontend" {
  aliases = [
    var.website_dns, "www.${var.website_dns}"
  ]
  comment = var.comment_for_cloudfront_website

  default_cache_behavior {
    cache_policy_id          = data.aws_cloudfront_cache_policy.caching_optimised.id
    origin_request_policy_id = data.aws_cloudfront_origin_request_policy.cors_s3_origin.id
    allowed_methods          = var.cloudfront_allowed_cached_methods #GET and HEAD methods are both used for origin requests and cache'd requests, since static site
    cached_methods           = var.cloudfront_allowed_cached_methods #GET and HEAD methods are both used for origin requests and cache'd requests, since static site
    target_origin_id         = local.origin_id
    viewer_protocol_policy   = var.cloudfront_viewer_protocol_policy

  }

  ordered_cache_behavior {
    path_pattern               = "*"
    allowed_methods            = var.cloudfront_allowed_cached_methods #GET and HEAD methods are both used for origin requests and cache'd requests, since static site
    cached_methods             = var.cloudfront_allowed_cached_methods #GET and HEAD methods are both used for origin requests and cache'd requests, since static site
    target_origin_id           = local.origin_id
    cache_policy_id            = data.aws_cloudfront_cache_policy.caching_optimised.id
    response_headers_policy_id = aws_cloudfront_response_headers_policy.cloudfront_s3_frontend_response_header_policy.id

    min_ttl                = 1
    default_ttl            = 86400                  #24 houra
    max_ttl                = var.cloudfront_max_ttl #48 hours
    compress               = true
    viewer_protocol_policy = var.cloudfront_viewer_protocol_policy
  }

  dynamic "custom_error_response" {
    for_each = var.cloudfront_custom_error_responses
    content {
      error_caching_min_ttl = custom_error_response.value.error_caching_min_ttl
      error_code            = custom_error_response.value.error_code
      response_code         = custom_error_response.value.response_code
      response_page_path    = custom_error_response.value.response_page_path
    }
  }

  default_root_object = var.cloudfront_default_root_object
  enabled             = true
  is_ipv6_enabled     = var.is_ipv6_enabled #if we are going to enable ipv6, we need an DNS alias record that uses Ipv6 (AAAA) record - done below
  http_version        = var.cloudfront_http_version

  # Add two origin to create origin group for regional failover
  origin {
    domain_name = aws_s3_bucket.s3_bucket_static_website_host.bucket_regional_domain_name
    origin_id   = local.origin_id
    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.cf_oai.cloudfront_access_identity_path
    }
  }

  price_class = var.cloudfront_price_class

  restrictions {
    geo_restriction {
      restriction_type = var.cloudfront_geo_restriction_type
      locations        = var.cloudfront_geo_restriction_locations
    }
  }

  viewer_certificate {
    acm_certificate_arn            = aws_acm_certificate_validation.cert_validation.certificate_arn
    cloudfront_default_certificate = false
    minimum_protocol_version       = "TLSv1.2_2021"
    ssl_support_method             = "sni-only"
  }

  retain_on_delete    = var.cloudfront_website_retain_on_delete
  wait_for_deployment = var.cloudfront_website_wait_for_deployment

  tags = local.tags
}

resource "aws_cloudfront_response_headers_policy" "cloudfront_s3_frontend_response_header_policy" {
  name = "townsquare-response-headers"

  security_headers_config {
    strict_transport_security {
      access_control_max_age_sec = "31536000"
      include_subdomains         = true
      preload                    = true
      override                   = false
    }
    content_type_options {
      override = false
    }
    frame_options {
      frame_option = "SAMEORIGIN"
      override     = false
    }
  }
}


#------------------------------------------------------------------------------
# Cloudfront DNS Record
#------------------------------------------------------------------------------
resource "aws_route53_record" "website_cloudfront_record_alias_ipv4" {

  zone_id = data.aws_route53_zone.hosted_zone.zone_id

  name = var.website_dns
  type = "A"

  alias {
    name                   = aws_cloudfront_distribution.cloudfront_s3_frontend.domain_name
    zone_id                = aws_cloudfront_distribution.cloudfront_s3_frontend.hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "website_cloudfront_record_alias_ipv6" {

  zone_id = data.aws_route53_zone.hosted_zone.zone_id
  name    = var.website_dns
  type    = "AAAA"

  alias {
    name                   = aws_cloudfront_distribution.cloudfront_s3_frontend.domain_name
    zone_id                = aws_cloudfront_distribution.cloudfront_s3_frontend.hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "cname_www_dns_record" {

  zone_id = data.aws_route53_zone.hosted_zone.zone_id
  name    = "www"
  type    = "CNAME"
  ttl     = "300"
  records = [var.website_dns]
}
