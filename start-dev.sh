#!/bin/bash
set -e

docker compose \
  -p collabill-dev \
  --env-file .env.dev \
  up -d
