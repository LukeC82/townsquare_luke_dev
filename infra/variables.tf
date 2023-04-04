variable "website_dns" {
  type        = string
  description = "The DNS entry for the site"
  default     = "axistownsquare.com"
}

#------------------------------------------------------------------------------
# S3
#------------------------------------------------------------------------------
variable "website_index_document" {
  description = "Amazon S3 returns this index document when requests are made to the root domain or any of the subfolders.  Defaults to index.html"
  type        = string
  default     = "index.html"
}

variable "website_error_document" {
  description = "(Optional) An absolute path to the document to return in case of a 4XX error. Defaults to 404.html"
  type        = string
  default     = "404.html"
}

variable "website_cors_allowed_headers" {
  description = "(Optional) Specifies which headers are allowed. Defaults to Authorization and Content-Length"
  type        = list(string)
  default     = ["Authorization", "Content-Length"]
}

variable "website_cors_allowed_methods" {
  description = "(Optional) Specifies which methods are allowed. Can be GET, PUT, POST, DELETE or HEAD. Defaults to GET and POST"
  type        = list(string)
  default     = ["GET", "POST"]
}

variable "website_cors_additional_allowed_origins" {
  description = "(Optional) Specifies which origins are allowed besides the domain name specified"
  type        = list(string)
  default     = []
}

variable "website_cors_expose_headers" {
  description = "(Optional) Specifies expose header in the response."
  type        = list(string)
  default     = []
}

variable "website_cors_max_age_seconds" {
  description = "(Optional) Specifies time in seconds that browser can cache the response for a preflight request. Defaults to 3600"
  type        = number
  default     = 600
}

#------------------------------------------------------------------------------
# Cloudfront
#------------------------------------------------------------------------------
variable "comment_for_cloudfront_website" {
  description = "Comment for the Website CloudFront Distribution"
  type        = string
  default     = "Allow public access to static site hosted on S3"
}

variable "cloudfront_viewer_protocol_policy" {
  description = "Use this element to specify the protocol that users can use to access the files in the origin specified by TargetOriginId when a request matches the path pattern in PathPattern. One of allow-all, https-only, or redirect-to-https. Defautls to redirect-to-https"
  type        = string
  default     = "redirect-to-https"
}

variable "is_ipv6_enabled" {
  description = "(Optional) - Whether the IPv6 is enabled for the distribution. Defaults to true"
  type        = bool
  default     = true
}

variable "cloudfront_allowed_cached_methods" {
  description = "(Optional) Specifies which methods are allowed and cached by CloudFront. Can be GET, PUT, POST, DELETE or HEAD. Defaults to GET and HEAD"
  type        = list(string)
  default     = ["GET", "HEAD"]
}

variable "cloudfront_function_association" {
  description = "(Optional - up to 2 per distribution) List containing information to associate a CF function to cloudfront. The first field is `event_type` of the CF function associated with default cache behavior, it can be viewer-request or viewer-response"
  type = list(object({
    event_type   = string
    function_arn = string
  }))
  default = []
}

variable "cloudfront_custom_error_responses" {
  description = "A list of custom error responses"
  type = list(object({
    error_caching_min_ttl = number
    error_code            = number
    response_code         = number
    response_page_path    = string
  }))
  default = [{
    error_caching_min_ttl = 300
    error_code            = 404
    response_code         = 200
    response_page_path    = "/index.html"
    }, {
    error_caching_min_ttl = 300
    error_code            = 403
    response_code         = 200
    response_page_path    = "/index.html"
  }]
}

variable "cloudfront_max_ttl" {
  description = "The maximum time an object is in cache prior to CloudFront generating request to S3 origin."
  type        = string
  default     = "172800"
}


variable "cloudfront_web_acl_id" {
  description = "(Optional) A unique identifier that specifies the AWS WAF web ACL, if any, to associate with this distribution."
  type        = string
  default     = null
}

variable "cloudfront_default_root_object" {
  description = "(Optional) - The object that you want CloudFront to return (for example, index.html) when an end user requests the root URL. Defaults to index.html"
  type        = string
  default     = "index.html"
}

variable "cloudfront_http_version" {
  description = "(Optional) - The maximum HTTP version to support on the distribution. Allowed values are http1.1 and http2. The default is http2."
  type        = string
  default     = "http2"
}

variable "cloudfront_price_class" {
  description = "(Optional) - The price class for this distribution. One of PriceClass_All, PriceClass_200, PriceClass_100. Defaults to PriceClass_100"
  type        = string
  default     = "PriceClass_100"
}

variable "cloudfront_geo_restriction_type" {
  description = "The method that you want to use to restrict distribution of your content by country: none, whitelist, or blacklist. Defaults to none"
  type        = string
  default     = "whitelist"
}

variable "cloudfront_geo_restriction_locations" {
  description = "(Optional) - The ISO 3166-1-alpha-2 codes for which you want CloudFront either to distribute your content (whitelist) or not distribute your content (blacklist). Defaults to []"
  type        = list(string)
  default     = ["AU"]
}

variable "cloudfront_website_retain_on_delete" {
  description = "(Optional) - Disables the distribution instead of deleting it when destroying the resource through Terraform. If this is set, the distribution needs to be deleted manually afterwards. Defaults to false."
  type        = bool
  default     = false
}

variable "cloudfront_website_wait_for_deployment" {
  description = "(Optional) - If enabled, the resource will wait for the distribution status to change from InProgress to Deployed. Setting this to false will skip the process. Defaults to true."
  type        = bool
  default     = true
}