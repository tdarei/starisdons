param(
  [string]$ProjectId = $env:PROJECT_ID,
  [string]$Region = $(if ($env:REGION) { $env:REGION } else { "europe-west2" }),
  [string]$ServiceName = $(if ($env:SERVICE_NAME) { $env:SERVICE_NAME } else { "mechgen-web" })
)

if (-not $ProjectId) {
  Write-Error "PROJECT_ID is required"
  exit 1
}

$ContextDir = Resolve-Path (Join-Path $PSScriptRoot "..")
$Image = "gcr.io/$ProjectId/$ServiceName"

if ($env:GEMINI_API_KEY) {
  $SecretName = if ($env:GEMINI_SECRET_NAME) { $env:GEMINI_SECRET_NAME } else { "GEMINI_API_KEY" }

  & gcloud secrets describe $SecretName --project $ProjectId --quiet 2>$null
  if ($LASTEXITCODE -ne 0) {
    & gcloud secrets create $SecretName --project $ProjectId --replication-policy="automatic" --quiet
  }

  $TmpFile = New-TemporaryFile
  Set-Content -NoNewline -Path $TmpFile.FullName -Value $env:GEMINI_API_KEY
  & gcloud secrets versions add $SecretName --project $ProjectId --data-file $TmpFile.FullName --quiet
  Remove-Item $TmpFile.FullName -Force

  $ProjectNumber = (& gcloud projects describe $ProjectId --format="value(projectNumber)" --quiet).Trim()
  if ($ProjectNumber) {
    $ComputeSa = "$ProjectNumber-compute@developer.gserviceaccount.com"
    & gcloud secrets add-iam-policy-binding $SecretName --project $ProjectId --member "serviceAccount:$ComputeSa" --role "roles/secretmanager.secretAccessor" --quiet | Out-Null
  }

  $env:GEMINI_SECRET_NAME = $SecretName
}

& gcloud builds submit $ContextDir --project $ProjectId --config "mechgen_web/cloudbuild.yaml" --substitutions "_IMAGE=$Image"

$DeployArgs = @(
  "run", "deploy", $ServiceName,
  "--project", $ProjectId,
  "--region", $Region,
  "--image", $Image,
  "--allow-unauthenticated",
  "--memory", "2Gi",
  "--env-vars-file", "mechgen_web/cloudrun.env.yaml"
)

if ($env:GEMINI_SECRET_NAME) {
  $DeployArgs += @("--set-secrets", "GEMINI_API_KEY=$($env:GEMINI_SECRET_NAME):latest")
}

& gcloud @DeployArgs
