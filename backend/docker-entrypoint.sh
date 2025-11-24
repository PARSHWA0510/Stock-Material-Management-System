#!/bin/sh
set -e

echo "🚀 Starting Stock Management Backend..."

# Run migrations
echo "🔄 Running database migrations..."
npx prisma migrate deploy || echo "⚠️  Migration failed or already up to date"

# Start the application
echo "🚀 Starting server..."
exec node dist/index.js

