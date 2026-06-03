#!/bin/bash
set -ex


echo "🚀 Initiating Zero-Downtime Deployment (Blue/Green)"

# 0. Fix SSH permissions (prevents "Bad owner or permissions on ~/.ssh/config" error)
echo "🔐 Fixing SSH permissions..."
if [ -f ~/.ssh/config ]; then
    chmod 600 ~/.ssh/config
fi
if [ -d ~/.ssh ]; then
    chmod 700 ~/.ssh
    chmod 600 ~/.ssh/id_* 2>/dev/null || true
    chmod 644 ~/.ssh/*.pub 2>/dev/null || true
fi

# 0. Pull latest changes from GitHub
echo "📥 Syncing code from GitHub..."
git fetch origin
git reset --hard origin/main

# 0.5 Ensure INTERVIEW_JWT_SECRET and ENCRYPTION_KEY exist in backend/.env
echo "🔧 Checking environment variables..."
ENV_FILE="backend/.env"
if [ -f "$ENV_FILE" ]; then
    if ! grep -q "INTERVIEW_JWT_SECRET" "$ENV_FILE"; then
        echo "Adding INTERVIEW_JWT_SECRET to $ENV_FILE..."
        RAND_SECRET=$(openssl rand -hex 32 2>/dev/null || echo "default_interview_secret_secure_random_key_12345")
        echo "" >> "$ENV_FILE"
        echo "INTERVIEW_JWT_SECRET=$RAND_SECRET" >> "$ENV_FILE"
    fi
    if grep -q "ENCRYPTION_KEY=" "$ENV_FILE"; then
        echo "Updating ENCRYPTION_KEY in $ENV_FILE to align with localhost..."
        sed -i 's|^ENCRYPTION_KEY=.*|ENCRYPTION_KEY=3gcctn9-UwjDXdYjmhslWwrF50FPayUTMWbGrMx02ck=|g' "$ENV_FILE"
    else
        echo "Adding ENCRYPTION_KEY to $ENV_FILE..."
        echo "ENCRYPTION_KEY=3gcctn9-UwjDXdYjmhslWwrF50FPayUTMWbGrMx02ck=" >> "$ENV_FILE"
    fi
else
    echo "⚠️ Warning: backend/.env file not found. Skipping auto-injection."
fi

# 1. Determine active environment
# Use grep -oP to extract exactly 'blue' or 'green' from the container name
# e.g., "rims-frontend_blue-1" → "blue"
ACTIVE_ENV=$(docker ps --format "{{.Names}}" | grep -E "frontend_(blue|green)" | head -n 1 | grep -oP '(?<=frontend_)(blue|green)' || true)

if [ -z "$ACTIVE_ENV" ]; then
    ACTIVE_ENV="green" # Default to green so we deploy blue first
fi

if [ "$ACTIVE_ENV" == "blue" ]; then
    DEPLOY_ENV="green"
else
    DEPLOY_ENV="blue"
fi

echo "Active environment is: $ACTIVE_ENV. Deploying to: $DEPLOY_ENV"

# 2. Free up disk space before build (removes unused images/cache older than 24h)
echo "🧹 Pruning old Docker images and build cache..."
docker system prune -f --filter "until=24h" || true

# 2. Build and boot the new environment safely in the background
echo "🏗️ Building and starting $DEPLOY_ENV environment..."
docker compose -f docker-compose.prod.yml up -d --build frontend_$DEPLOY_ENV backend_$DEPLOY_ENV

# 3. Wait for Healthchecks (Wait up to 120 seconds)
echo "⌛ Waiting for $DEPLOY_ENV to become healthy..."
MAX_RETRIES=24
RETRY_COUNT=0
BACKEND_HEALTH="starting"

# Dynamically find the actual container name to handle prefixes/suffixes correctly
CONTAINER_NAME=$(docker ps --format '{{.Names}}' -f "name=backend_$DEPLOY_ENV" | head -n 1)

if [ -z "$CONTAINER_NAME" ]; then
    echo "⚠️ Warning: Could not find container for backend_$DEPLOY_ENV"
    # Fallback to a guess if search fails
    CONTAINER_NAME="rims-backend_$DEPLOY_ENV-1"
fi

echo "Watching container: $CONTAINER_NAME"

while [ "$BACKEND_HEALTH" != "healthy" ] && [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    sleep 5
    BACKEND_HEALTH=$(docker inspect --format='{{.State.Health.Status}}' $CONTAINER_NAME 2>/dev/null || echo "unhealthy")
    echo "Current status: $BACKEND_HEALTH ($((RETRY_COUNT * 5))s / 120s)"
    RETRY_COUNT=$((RETRY_COUNT + 1))
done

if [ "$BACKEND_HEALTH" != "healthy" ]; then
    echo "❌ DEPLOYMENT FAILED: Background health-check failed on $DEPLOY_ENV after 120 seconds."
    echo "Last logs:"
    docker logs $CONTAINER_NAME | tail -n 20
    docker compose -f docker-compose.prod.yml stop frontend_$DEPLOY_ENV backend_$DEPLOY_ENV
    exit 1
fi

echo "✅ New environment $DEPLOY_ENV is healthy."

# 4. Traffic Switching
echo "🔀 Switching NGINX traffic to $DEPLOY_ENV..."
# Use a temporary file and 'cat' to preserve the inode, ensuring Docker bind-mounts update correctly
sed "s/frontend_$ACTIVE_ENV:3000/frontend_$DEPLOY_ENV:3000/g" nginx.conf > nginx.conf.tmp
sed -i "s/backend_$ACTIVE_ENV:10000/backend_$DEPLOY_ENV:10000/g" nginx.conf.tmp
cat nginx.conf.tmp > nginx.conf
rm nginx.conf.tmp

echo "📋 nginx.conf now routes to: $DEPLOY_ENV"
grep -E "server (frontend|backend)_" nginx.conf || true

# Wait for nginx container to be in a running (not restarting) state before reloading
echo "⏳ Ensuring nginx container is running before reload..."
NGINX_RETRIES=12
NGINX_COUNT=0
NGINX_STATUS="restarting"
while [ "$NGINX_STATUS" != "running" ] && [ $NGINX_COUNT -lt $NGINX_RETRIES ]; do
    sleep 5
    NGINX_STATUS=$(docker inspect --format='{{.State.Status}}' rims-nginx-1 2>/dev/null || echo "unknown")
    echo "Nginx status: $NGINX_STATUS ($((NGINX_COUNT * 5))s / 60s)"
    NGINX_COUNT=$((NGINX_COUNT + 1))
done

if [ "$NGINX_STATUS" != "running" ]; then
    echo "⚠️ Nginx is not running (status: $NGINX_STATUS). Attempting to start it..."
    docker compose -f docker-compose.prod.yml up -d nginx
    sleep 10
fi

# Restart nginx to ensure Docker propagates the bind-mounted nginx.conf file changes and picks up the new upstream
docker compose -f docker-compose.prod.yml restart nginx
echo "✅ Traffic successfully routed to $DEPLOY_ENV."

# 5. Stabilize (Observability Window)
echo "🛑 Keeping old environment '$ACTIVE_ENV' alive for 15 minutes for instant rollback coverage..."
# In a real environment, a separate cron task would spin down the old container after confirming 0 error spikes.

echo "🎉 ZERO-DOWNTIME DEPLOYMENT COMPLETE."
