#!/bin/bash
set -e

docker compose \
  -p collabill-prod \
  -f docker-compose.yml \
  -f docker-compose.prod.yml \
  up -d --build
