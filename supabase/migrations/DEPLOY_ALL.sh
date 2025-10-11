#!/bin/bash
# =================================================
# Year Wheel POC - Complete Database Setup Script
# =================================================
# This script applies ALL migrations in order
# Run this on a fresh Supabase database

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}Year Wheel POC - Database Setup${NC}"
echo -e "${BLUE}======================================${NC}"
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}ERROR: DATABASE_URL environment variable not set${NC}"
    echo "Set it with: export DATABASE_URL='your-supabase-postgres-url'"
    exit 1
fi

# Migration files in order
MIGRATIONS=(
    "000_INITIAL_SCHEMA.sql"
    "001_CREATE_PROFILES_TABLE.sql"
    "002_enable_realtime.sql"
    "003_stripe_subscription_setup.sql"
    "004_team_collaboration_final.sql"
    "005_ADD_MULTI_PAGE_WHEELS.sql"
    "006_ADD_VERSION_CONTROL.sql"
    "007_ADD_PUBLIC_SHARING.sql"
    "008_ADD_PAGE_ID_TO_ITEMS.sql"
    "009_STRIPE_COLUMN_FIX.sql"
    "010_ADMIN_SETUP.sql"
    "011_TEAM_MEMBERS_EMAIL_LOOKUP.sql"
    "012_TEAM_INVITATION_AUTO_ACCEPT.sql"
)

MIGRATION_DIR="$(cd "$(dirname "$0")" && pwd)"
TOTAL=${#MIGRATIONS[@]}
CURRENT=0

echo -e "${BLUE}Found $TOTAL migrations to apply${NC}"
echo ""

# Apply each migration
for migration in "${MIGRATIONS[@]}"; do
    CURRENT=$((CURRENT + 1))
    FILE="$MIGRATION_DIR/$migration"
    
    if [ ! -f "$FILE" ]; then
        echo -e "${RED}ERROR: Migration file not found: $FILE${NC}"
        exit 1
    fi
    
    echo -e "${BLUE}[$CURRENT/$TOTAL]${NC} Applying $migration..."
    
    if psql "$DATABASE_URL" -f "$FILE" > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} Success"
    else
        echo -e "${RED}✗ FAILED${NC}"
        echo "Error applying $migration"
        exit 1
    fi
done

echo ""
echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}All migrations applied successfully!${NC}"
echo -e "${GREEN}======================================${NC}"
echo ""

# Run validation queries
echo -e "${BLUE}Running validation checks...${NC}"
echo ""

# Check table count
TABLE_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';")
echo -e "Tables created: ${GREEN}$TABLE_COUNT${NC} (expected: 14)"

# Check critical columns
echo -e "\nChecking critical columns..."
psql "$DATABASE_URL" -t -c "SELECT 'items.page_id: ' || CASE WHEN EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='items' AND column_name='page_id') THEN '✓ EXISTS' ELSE '✗ MISSING' END;"
psql "$DATABASE_URL" -t -c "SELECT 'year_wheels.team_id: ' || CASE WHEN EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='year_wheels' AND column_name='team_id') THEN '✓ EXISTS' ELSE '✗ MISSING' END;"
psql "$DATABASE_URL" -t -c "SELECT 'profiles.is_admin: ' || CASE WHEN EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='is_admin') THEN '✓ EXISTS' ELSE '✗ MISSING' END;"

# Check function count
FUNCTION_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM information_schema.routines WHERE routine_schema = 'public' AND routine_type = 'FUNCTION';")
echo -e "\nFunctions created: ${GREEN}$FUNCTION_COUNT${NC} (expected: 20+)"

# Check trigger count
TRIGGER_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM information_schema.triggers WHERE trigger_schema = 'public';")
echo -e "Triggers created: ${GREEN}$TRIGGER_COUNT${NC} (expected: 5+)"

echo ""
echo -e "${GREEN}✓ Database setup complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Update your .env with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY"
echo "2. Run 'yarn dev' to start the development server"
echo "3. Create a user account and test the application"
