
remote_state {
  backend = "s3"
  config = {
    bucket                          = "townsquare-tf-backend"
    region                          = "ap-southeast-4"
    key                             = "townsquare"
    encrypt                         = true
    skip_region_validation          = true
  }
}