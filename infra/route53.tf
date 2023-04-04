#------------------------------------------------------------------------------
# Route53 Hosted Zone
#------------------------------------------------------------------------------
data "aws_route53_zone" "hosted_zone" {
  name = var.website_dns
}

#------------------------------------------------------------------------------
# ACM Certificate
#------------------------------------------------------------------------------
resource "aws_acm_certificate" "certificate" {
  provider = aws.acm-provider

  domain_name               = var.website_dns
  subject_alternative_names = ["*.${var.website_dns}"]
  validation_method         = "DNS"
  tags                      = local.tags

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_route53_record" "acm_certificate_validation_records" {

  for_each = {
    for dvo in aws_acm_certificate.certificate.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 300
  type            = each.value.type
  zone_id         = data.aws_route53_zone.hosted_zone.zone_id
}

resource "aws_acm_certificate_validation" "cert_validation" {
  provider = aws.acm-provider

  depends_on = [
    aws_acm_certificate.certificate,
    aws_route53_record.acm_certificate_validation_records,
  ]

  certificate_arn         = aws_acm_certificate.certificate.arn
  validation_record_fqdns = [for record in aws_route53_record.acm_certificate_validation_records : record.fqdn]
}