output "name" {
  value = aws_codebuild_project.deploy_project.name
}

output "project" {
  value = aws_codebuild_project.deploy_project
}

output "arn" {
  value = aws_codebuild_project.deploy_project.arn
}
