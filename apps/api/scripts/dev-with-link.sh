#!/bin/sh
# Script to run NestJS dev with symlink creation
cd /app/apps/api

# Function to create symlink
create_link() {
  if [ -f "dist/apps/api/src/main.js" ] && [ ! -f "dist/main.js" ]; then
    cd dist && ln -sf apps/api/src/main.js main.js 2>/dev/null || true
    cd ..
    return 0
  fi
  return 1
}

# Start NestJS in watch mode in background with tsconfig-paths support
NODE_OPTIONS="-r tsconfig-paths/register" nest start --watch &
NEST_PID=$!

# Wait for compilation and create symlink
MAX_WAIT=60
WAITED=0
while [ $WAITED -lt $MAX_WAIT ]; do
  if create_link; then
    echo "Symlink created successfully"
    break
  fi
  sleep 1
  WAITED=$((WAITED + 1))
done

# Keep script running and recreate symlink if needed
while kill -0 $NEST_PID 2>/dev/null; do
  sleep 2
  create_link || true
done

wait $NEST_PID
exit $?

