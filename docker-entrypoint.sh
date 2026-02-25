#!/bin/sh
set -e

# Run database schema push (prisma binary is copied)
cd /app
npx prisma db push --skip-generate 2>&1 || echo "Warning: prisma db push failed, DB may need manual migration"

# Start the server
exec node server.js
