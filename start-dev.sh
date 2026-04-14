#!/bin/bash
set -e

docker compose \
  -p collabill-dev \
  down -v

docker compose \
  -p collabill-dev \
  up -d
