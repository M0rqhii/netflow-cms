#!/bin/bash
# Setup Script for AI-Assisted Coding Environment
# Multi-Tenant Headless CMS

set -e  # Exit on error

echo "🚀 Starting AI-Assisted Coding Environment Setup..."
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Check prerequisites
echo "📋 Step 1: Checking prerequisites..."

check_command() {
    if command -v $1 &> /dev/null; then
        echo -e "${GREEN}✅ $1 installed: $($1 --version | head -n1)${NC}"
        return 0
    else
        echo -e "${RED}❌ $1 not found${NC}"
        return 1
    fi
}

MISSING_DEPS=0

check_command node || MISSING_DEPS=1
check_command pnpm || {
    echo -e "${YELLOW}⚠️  pnpm not found. Installing...${NC}"
    npm install -g pnpm@8.15.0
    check_command pnpm || MISSING_DEPS=1
}
check_command git || MISSING_DEPS=1

if [ $MISSING_DEPS -eq 1 ]; then
    echo -e "${RED}❌ Missing required dependencies. Please install them first.${NC}"
    exit 1
fi

echo ""
echo "📦 Step 2: Installing dependencies..."
pnpm install

echo ""
echo "📁 Step 3: Creating directory structure..."
mkdir -p docs
mkdir -p apps/api/src/{modules,common/{guards,decorators,filters,interceptors,pipes}}
mkdir -p apps/api/prisma/migrations
mkdir -p apps/api/test
mkdir -p apps/admin/app/{\(auth\),\(dashboard\)/\[tenant\]}
mkdir -p apps/admin/components
mkdir -p apps/admin/lib
mkdir -p apps/admin/public
mkdir -p apps/admin/test/{unit,integration,e2e,fixtures}
mkdir -p packages/{sdk,schemas,ui}/src
mkdir -p .aicli
mkdir -p .github/workflows
mkdir -p .vscode
mkdir -p scripts
mkdir -p backups
mkdir -p monitoring

# Create .gitkeep files
find . -type d -empty -exec touch {}/.gitkeep \;

echo -e "${GREEN}✅ Directory structure created${NC}"

echo ""
echo "⚙️  Step 4: Setting up environment files..."

if [ ! -f "apps/api/.env" ]; then
    if [ -f "apps/api/.env.example" ]; then
        cp apps/api/.env.example apps/api/.env
        echo -e "${YELLOW}⚠️  Created apps/api/.env - Please edit it with your database credentials${NC}"
    else
        echo -e "${YELLOW}⚠️  apps/api/.env.example not found. Create apps/api/.env manually${NC}"
    fi
fi

if [ ! -f "apps/admin/.env.local" ]; then
    if [ -f "apps/admin/.env.example" ]; then
        cp apps/admin/.env.example apps/admin/.env.local
        echo -e "${YELLOW}⚠️  Created apps/admin/.env.local${NC}"
    fi
fi

echo ""
echo "🔧 Step 5: Generating Prisma Client..."
if [ -f "apps/api/prisma/schema.prisma" ]; then
    pnpm --filter api db:generate || echo -e "${YELLOW}⚠️  Prisma generate failed - check DATABASE_URL${NC}"
else
    echo -e "${YELLOW}⚠️  Prisma schema not found${NC}"
fi

echo ""
echo "✅ Setup completed!"
echo ""
echo "📝 Next steps:"
echo "1. Edit apps/api/.env with your database credentials"
echo "2. Run: pnpm --filter api db:migrate"
echo "3. Run: pnpm dev"
echo ""
echo "📚 Read docs/setup-guide.md for detailed instructions"


