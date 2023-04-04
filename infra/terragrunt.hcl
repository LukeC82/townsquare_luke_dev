
remote_state {
  backend = "s3"
  config = {
    bucket                          = "townsquare-tf-state"
    region                          = "ap-southeast-2"
    key                             = "townsquare"
    encrypt                         = true
    skip_region_validation          = true
  }
}