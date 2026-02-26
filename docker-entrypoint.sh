#!/bin/sh
set -e

# If no database exists, copy the seed database (has correct schema)
if [ ! -f /app/data/prod.db ]; then
  echo "Initializing database from seed..."
  cp /app/seed.db /app/data/prod.db
  echo "Database initialized."
fi

# Start the server
exec node server.js
