#!/bin/bash
set -e

docker compose \
  -p collabill-dev \
  up -d
