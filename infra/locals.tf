locals {
  tags = merge(
    {
      "Version"     = "1.0"
      "Application" = "Townsquare"
    }
  )
  origin_id = "towsquare-S3Group"
}