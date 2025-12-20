#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${PROJECT_ID:-}"
REGION="${REGION:-europe-west2}"
SERVICE_NAME="${SERVICE_NAME:-mechgen-web}"

if [[ -z "${PROJECT_ID}" ]]; then
  echo "PROJECT_ID is required" >&2
  exit 1
fi

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
CONTEXT_DIR="$(cd -- "${SCRIPT_DIR}/.." && pwd)"
IMAGE="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

if [[ -n "${GEMINI_API_KEY:-}" ]]; then
  GEMINI_SECRET_NAME="${GEMINI_SECRET_NAME:-GEMINI_API_KEY}"

  if ! gcloud secrets describe "${GEMINI_SECRET_NAME}" --project "${PROJECT_ID}" >/dev/null 2>&1; then
    gcloud secrets create "${GEMINI_SECRET_NAME}" --project "${PROJECT_ID}" --replication-policy="automatic" --quiet
  fi

  printf '%s' "${GEMINI_API_KEY}" | gcloud secrets versions add "${GEMINI_SECRET_NAME}" --project "${PROJECT_ID}" --data-file=- --quiet

  PROJECT_NUMBER="$(gcloud projects describe "${PROJECT_ID}" --format='value(projectNumber)')"
  gcloud secrets add-iam-policy-binding "${GEMINI_SECRET_NAME}" \
    --project "${PROJECT_ID}" \
    --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor" \
    --quiet
fi

gcloud builds submit "${CONTEXT_DIR}" \
  --project "${PROJECT_ID}" \
  --config "mechgen_web/cloudbuild.yaml" \
  --substitutions "_IMAGE=${IMAGE}"

DEPLOY_ARGS=(
  run deploy "${SERVICE_NAME}"
  --project "${PROJECT_ID}"
  --region "${REGION}"
  --image "${IMAGE}"
  --allow-unauthenticated
  --memory "2Gi"
  --env-vars-file "mechgen_web/cloudrun.env.yaml"
)

if [[ -n "${GEMINI_SECRET_NAME:-}" ]]; then
  DEPLOY_ARGS+=(--set-secrets "GEMINI_API_KEY=${GEMINI_SECRET_NAME}:latest")
fi

gcloud "${DEPLOY_ARGS[@]}"
