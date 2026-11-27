#!/bin/sh
set -e

echo "Applying database migrations..."
npx prisma migrate deploy

case "${DOCKER_SEED:-local}" in
  local)
    echo "Seeding demo users (local, no SSO)..."
    npx tsx prisma/seed-docker-local.ts
    ;;
  sso)
    echo "Seeding from SSO API (full seed)..."
    npm run prisma:seed
    ;;
  skip)
    echo "Skipping database seed (DOCKER_SEED=skip)."
    ;;
  *)
    echo "Unknown DOCKER_SEED=${DOCKER_SEED}; using local seed."
    npx tsx prisma/seed-docker-local.ts
    ;;
esac

exec "$@"