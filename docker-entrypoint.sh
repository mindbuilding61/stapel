#!/bin/sh
set -e
export DATABASE_URL="${DATABASE_URL:-file:/data/prod.db}"
npx prisma migrate deploy
exec node server.js
