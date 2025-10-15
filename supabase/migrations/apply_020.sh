#!/bin/bash

# =============================================
# Apply Migration 020: Add Description to Items
# =============================================

echo "🚀 Applying migration 020_ADD_DESCRIPTION_TO_ITEMS.sql"
echo ""

# Check if migration file exists
if [ ! -f "supabase/migrations/020_ADD_DESCRIPTION_TO_ITEMS.sql" ]; then
    echo "❌ Migration file not found!"
    exit 1
fi

# Apply to remote database
echo "📡 Applying to remote Supabase database..."
supabase db push

echo ""
echo "✅ Migration complete!"
echo ""
echo "To verify, run:"
echo "  supabase db diff"
