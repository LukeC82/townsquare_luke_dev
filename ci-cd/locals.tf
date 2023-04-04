locals {

  tags = merge(
    {
      "Version"     = "1.0"
      "Application" = "Townsquare"
    }
  )
  website_bucket          = "axistownsquare.com"
  cloudfront_distribution = "E3EOKO23RFJ8TV"
}
