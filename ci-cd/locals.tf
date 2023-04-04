locals {

  tags = merge(
    {
      "Version"     = "1.0"
      "Application" = "Townsquare"
    }
  )
  website_bucket = "axistownsquare.com"
}
