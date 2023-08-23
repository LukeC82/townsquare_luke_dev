locals {

  tags = merge(
    {
      "Version"     = "1.0"
      "Application" = "Townsquare"
    }
  )
  website_bucket          = "axistownsquare.com"
  cloudfront_distribution = "E1EXA7U8P7XGQ5"
}
