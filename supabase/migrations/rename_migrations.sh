#!/bin/bash
# Script to rename all migrations chronologically based on git creation date

cd "$(dirname "$0")"

# Create a temporary file to store the renaming map
temp_map=$(mktemp)
counter=1

echo "Phase 1: Collecting migration files and dates..."

# Get all SQL files with their creation dates from git
for file in *.sql; do
    # Skip the rename script itself
    if [ "$file" = "rename_migrations.sh" ]; then
        continue
    fi
    
    # Get git creation date (first commit that added the file)
    git_date=$(git log --diff-filter=A --follow --format=%aI -- "$file" 2>/dev/null | tail -1)
    
    # If no git history (newly created), use file modification time
    if [ -z "$git_date" ]; then
        git_date=$(date -r "$file" +%Y-%m-%dT%H:%M:%S%z)_NEW
    fi
    
    echo "$git_date|$file" >> "$temp_map"
done

echo "Phase 2: Renaming to temporary names..."

# First pass: rename all to temporary names (prefixed with TEMP_)
sort "$temp_map" | while IFS='|' read -r date oldname; do
    description=$(echo "$oldname" | sed -E 's/^[0-9]+_//')
    newnum=$(printf "%03d" $counter)
    tempname="TEMP_${newnum}_${description}"
    
    if [ -f "$oldname" ]; then
        mv "$oldname" "$tempname"
        echo "  $oldname -> $tempname"
    fi
    
    counter=$((counter + 1))
done

echo "Phase 3: Renaming to final names..."

# Second pass: rename from temporary to final names
for file in TEMP_*.sql; do
    finalname=$(echo "$file" | sed 's/^TEMP_//')
    mv "$file" "$finalname"
    echo "  $file -> $finalname"
done

# Clean up
rm "$temp_map"

echo ""
echo "✓ All migrations renamed chronologically!"
echo "Total migrations: $((counter - 1))"
