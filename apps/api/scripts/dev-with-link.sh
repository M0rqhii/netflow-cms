#!/bin/sh
# Script to run NestJS dev with symlink creation
cd /app/apps/api

# Function to create symlink
create_link() {
  # Try dist/apps/api/src/main.js first (old structure)
  if [ -f "dist/apps/api/src/main.js" ] && [ ! -f "dist/main.js" ]; then
    cd dist && ln -sf apps/api/src/main.js main.js 2>/dev/null || true
    cd ..
    return 0
  fi
  # Try dist/src/main.js (new structure)
  if [ -f "dist/src/main.js" ] && [ ! -f "dist/main.js" ]; then
    cd dist && ln -sf src/main.js main.js 2>/dev/null || true
    cd ..
    return 0
  fi
  return 1
}

# Build schemas first
cd /app && pnpm --filter schemas build > /dev/null 2>&1 || true
cd /app/apps/api

# Build first to ensure dist exists
NODE_OPTIONS="-r tsconfig-paths/register" nest build

# Create symlink before starting watch mode
create_link && echo "Symlink created successfully" || echo "Warning: Could not create symlink"

# Start NestJS in watch mode in background with tsconfig-paths support
NODE_OPTIONS="-r tsconfig-paths/register" nest start --watch &
NEST_PID=$!

# Keep script running and recreate symlink if needed
while kill -0 $NEST_PID 2>/dev/null; do
  sleep 2
  create_link || true
done

wait $NEST_PID
exit $?

