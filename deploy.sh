#!/usr/bin/env bash
# deploy.sh — Build and deploy PM Tool to /var/www/pm_tool on AWS Ubuntu
# Run from repo root: bash deploy.sh
set -euo pipefail

APP_DIR="/var/www/pm_tool"
NODE_VERSION="22"  # match your local Node version

echo "==> [1/6] Pulling latest code"
git pull origin main

echo "==> [2/6] Installing backend dependencies"
cd backend
npm ci --omit=dev
npm run build
cd ..

echo "==> [3/6] Running database migrations"
cd backend
npx prisma migrate deploy
cd ..

echo "==> [4/6] Installing frontend dependencies & building"
cd frontend
npm ci
npm run build          # outputs to frontend/dist/
cd ..

echo "==> [5/6] Syncing files to $APP_DIR"
rsync -av --delete \
  --exclude '.git' \
  --exclude 'node_modules' \
  --exclude 'frontend/node_modules' \
  --exclude 'backend/src' \
  --exclude 'backend/test' \
  --exclude '*.log' \
  ./ "$APP_DIR/"

echo "==> [6/6] Restarting PM2 process"
cd "$APP_DIR"
pm2 startOrReload ecosystem.config.cjs --env production
pm2 save

echo ""
echo "✅ Deployment complete."
echo "   API: http://localhost:3000/api/v1"
echo "   Frontend dist: $APP_DIR/frontend/dist"
echo "   PM2 status: pm2 list"
