#!/bin/bash
set -e

if [ ! -f .env.prod ]; then
  echo ".env.prod is required"
  exit 1
fi

docker compose \
  -p collabill-prod \
  -f docker-compose.prod.yml \
  --env-file .env.prod \
  up -d
