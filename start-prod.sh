#!/bin/bash
set -e

if [ ! -f .env ]; then
  echo ".env is required"
  exit 1
fi

docker compose \
  -p collabill-prod \
  -f docker-compose.prod.yml \
  --env-file .env \
  up -d
