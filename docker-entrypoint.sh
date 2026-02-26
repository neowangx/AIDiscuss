#!/bin/sh
set -e

# Run database schema push using the local prisma binary
./node_modules/.bin/prisma db push --skip-generate 2>&1 || echo "Warning: prisma db push failed"

# Start the server
exec node server.js
