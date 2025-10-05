# Code Cleanup Recommendations

## Files to Remove or Archive

### 1. YearWheelClassRedefined.js
**Status**: ❌ **NOT IN USE**

**Current Location**: `src/YearWheelClassRedefined.js`

**Why Remove**:
- Not imported by any active component
- `YearWheelClass.js` is the active implementation
- Keeping duplicate code creates confusion
- May lead to editing the wrong file

**Recommendation**:
```bash
# Option 1: Delete (if you don't need it)
rm src/YearWheelClassRedefined.js

# Option 2: Archive (if you want to keep as reference)
mkdir -p archive
mv src/YearWheelClassRedefined.js archive/
```

### 2. Other Unused Files to Check

Run this command to find potentially unused files:
```bash
# Find JS/JSX files
find src -name "*.js" -o -name "*.jsx"

# Check if they're imported anywhere
grep -r "import.*from.*year-wheel" src/
grep -r "import.*YearWheelClassRedefined" src/
```

## Code Smells in YearWheelClass.js

### 1. Console.log in Constructor
```javascript
// Line 40 in YearWheelClass.js
console.table(this.generateWeeks());
```

**Issue**: Debugging code left in production  
**Fix**: Remove this line

### 2. Unused Variables
```javascript
// eslint-disable no-unused-vars
```

**Issue**: ESLint warnings suppressed  
**Fix**: Remove unused variables and the eslint comment

### 3. Commented Code
Multiple sections have commented-out code:
- Lines 146-152: Commented week data structure
- Various other sections

**Fix**: Remove commented code blocks (they're in git history if needed)

## Suggested Refactoring

### 1. Extract Week Calculation to Utility
Create `src/utils/dateHelpers.js`:
```javascript
/**
 * Generates ISO week numbers for a given year
 * @param {number} year - The year to generate weeks for
 * @returns {string[]} Array of week labels like "W1", "W2", etc.
 */
export function generateISOWeeks(year) {
  const weeks = [];
  
  const getISOWeek = (date) => {
    const tempDate = new Date(date.getTime());
    tempDate.setHours(0, 0, 0, 0);
    tempDate.setDate(tempDate.getDate() + 4 - (tempDate.getDay() || 7));
    const yearStart = new Date(tempDate.getFullYear(), 0, 1);
    const weekNo = Math.ceil((((tempDate - yearStart) / 86400000) + 1) / 7);
    return weekNo;
  };

  const getISOWeekYear = (date) => {
    const tempDate = new Date(date.getTime());
    tempDate.setDate(tempDate.getDate() + 4 - (tempDate.getDay() || 7));
    return tempDate.getFullYear();
  };

  let currentDate = new Date(year, 0, 1);
  
  while (currentDate.getDay() !== 1) {
    currentDate.setDate(currentDate.getDate() - 1);
  }

  const seenWeeks = new Set();
  
  while (currentDate.getFullYear() <= year) {
    const isoWeek = getISOWeek(currentDate);
    const isoYear = getISOWeekYear(currentDate);
    
    if (isoYear === year || currentDate.getFullYear() === year) {
      const weekKey = `${isoYear}-W${isoWeek}`;
      if (!seenWeeks.has(weekKey) && weeks.length < 53) {
        seenWeeks.add(weekKey);
        weeks.push(`W${isoWeek}`);
      }
    }
    
    currentDate.setDate(currentDate.getDate() + 7);
    
    if (currentDate.getFullYear() > year && currentDate.getMonth() > 0) {
      break;
    }
  }

  return weeks;
}

/**
 * Formats a date as "DD/MM"
 * @param {Date} date - The date to format
 * @returns {string} Formatted date string
 */
export function formatShortDate(date) {
  return `${date.getDate()}/${date.getMonth() + 1}`;
}

/**
 * Gets the first and last day of an ISO week
 * @param {number} year - The year
 * @param {number} week - The week number
 * @returns {{start: Date, end: Date}} Start and end dates
 */
export function getISOWeekDates(year, week) {
  const simple = new Date(year, 0, 1 + (week - 1) * 7);
  const dayOfWeek = simple.getDay();
  const isoWeekStart = simple;
  
  if (dayOfWeek <= 4) {
    isoWeekStart.setDate(simple.getDate() - simple.getDay() + 1);
  } else {
    isoWeekStart.setDate(simple.getDate() + 8 - simple.getDay());
  }
  
  const isoWeekEnd = new Date(isoWeekStart);
  isoWeekEnd.setDate(isoWeekStart.getDate() + 6);
  
  return { start: isoWeekStart, end: isoWeekEnd };
}
```

Then update `YearWheelClass.js`:
```javascript
import { generateISOWeeks } from './utils/dateHelpers';

// In the class:
generateWeeks() {
  return generateISOWeeks(parseInt(this.year));
}
```

### 2. Separate Canvas Drawing Logic
Create `src/utils/canvasHelpers.js` for reusable drawing functions:
```javascript
export function drawTextOnCircle(context, text, center, radius, angle, fontSize, color = '#ffffff') {
  const x = center.x + radius * Math.cos(angle);
  const y = center.y + radius * Math.sin(angle);
  
  context.save();
  context.font = `bold ${fontSize}px Arial`;
  context.fillStyle = color;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.translate(x, y);
  context.rotate(angle + Math.PI / 2);
  context.fillText(text.toUpperCase(), 0, 0);
  context.restore();
}

export function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

export function drawArc(context, center, startRadius, endRadius, startAngle, endAngle, color) {
  context.beginPath();
  context.fillStyle = color;
  context.arc(center.x, center.y, startRadius, startAngle, endAngle);
  context.lineTo(
    center.x + endRadius * Math.cos(endAngle),
    center.y + endRadius * Math.sin(endAngle)
  );
  context.arc(center.x, center.y, endRadius, endAngle, startAngle, true);
  context.closePath();
  context.fill();
}
```

### 3. Extract Color Utilities
Create `src/utils/colorHelpers.js`:
```javascript
export function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

export function rgbToHex(r, g, b) {
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

export function getContrastColor(hexColor) {
  const rgb = hexToRgb(hexColor);
  if (!rgb) return '#000000';
  
  const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
  return brightness > 128 ? '#000000' : '#ffffff';
}
```

## File Organization Proposal

```
src/
├── components/
│   ├── auth/
│   │   ├── LoginForm.jsx
│   │   ├── SignupForm.jsx
│   │   └── AuthProvider.jsx
│   ├── dashboard/
│   │   ├── Dashboard.jsx
│   │   ├── WheelCard.jsx
│   │   └── WheelList.jsx
│   ├── editor/
│   │   ├── YearWheelEditor.jsx
│   │   ├── Canvas/
│   │   │   ├── YearWheel.jsx
│   │   │   └── YearWheelClass.js
│   │   └── Controls/
│   │       ├── GeneralInputs.jsx
│   │       ├── ColorPicker.jsx
│   │       ├── RingManager.jsx
│   │       ├── RingButton.jsx
│   │       ├── Ring.jsx
│   │       ├── MonthTextarea.jsx
│   │       └── ActionInputs.jsx
│   └── shared/
│       ├── Button.jsx
│       ├── Modal.jsx
│       └── Toast.jsx
├── hooks/
│   ├── useAuth.js
│   ├── useYearWheel.js
│   ├── useAutoSave.js
│   └── useZoom.js (extract from YearWheel.jsx)
├── services/
│   ├── supabase.js
│   ├── wheelService.js
│   └── shareService.js
├── utils/
│   ├── dateHelpers.js
│   ├── canvasHelpers.js
│   └── colorHelpers.js
├── App.jsx
├── main.jsx
└── style.scss
```

## Immediate Action Items

1. ✅ **Remove console.log from YearWheelClass.js** - COMPLETED (Oct 5, 2025)
   - Removed `console.table(this.generateWeeks())` from constructor

2. ✅ **Archive unused files** - COMPLETED (Oct 5, 2025)
   - Archived `YearWheelClassRedefined.js`
   - Archived `year-wheel-refactored.js`
   - Archived `year-wheel.js`
   - Created `archive/README.md` to document archived files

3. ✅ **Fix week number display** - COMPLETED (Oct 5, 2025)
   - Fixed duplicate week numbers (W1 appearing twice)
   - Removed "W" prefix for Swedish interface (now shows "1", "2", etc.)
   - Improved ISO week calculation to prevent duplicates

4. ⬜ **Clean up commented code**
   Review and remove all commented code blocks

5. ⬜ **Fix eslint warnings**
   Remove `/* eslint-disable no-unused-vars */` and fix actual issues

6. ⬜ **Create utility files**
   Extract date, canvas, and color helpers to separate files

## Migration Script

Here's a bash script to help with the cleanup:

```bash
#!/bin/bash

echo "🧹 Starting Year Wheel Cleanup..."

# Create directories
mkdir -p archive
mkdir -p src/utils
mkdir -p src/hooks
mkdir -p src/services
mkdir -p src/components/editor/Canvas
mkdir -p src/components/editor/Controls

# Archive unused file
if [ -f "src/YearWheelClassRedefined.js" ]; then
  echo "📦 Archiving YearWheelClassRedefined.js..."
  mv src/YearWheelClassRedefined.js archive/
fi

# Remove console.logs
echo "🔇 Removing debug console.logs..."
# This would need manual review, but flag them:
grep -rn "console\." src/ > debug_logs.txt
echo "   Found console statements in debug_logs.txt"

# Check for unused imports
echo "🔍 Checking for unused imports..."
npm run lint 2>&1 | grep "unused" > unused_imports.txt
echo "   Found unused imports in unused_imports.txt"

echo "✅ Cleanup preparation complete!"
echo "   Review generated .txt files and make manual changes"
```

Save as `cleanup.sh` and run:
```bash
chmod +x cleanup.sh
./cleanup.sh
```

## Testing After Cleanup

After making changes, verify everything still works:

1. **Run the dev server**:
```bash
npm run dev
```

2. **Test these features**:
- [ ] Year wheel renders correctly
- [ ] Week numbers display properly
- [ ] Rotation/dragging works
- [ ] Colors apply correctly
- [ ] Export functions work (PNG, SVG, JPEG)
- [ ] Save/load from localStorage works

3. **Run linter**:
```bash
npm run lint
```

4. **Check for console errors**:
Open browser DevTools → Console → Should be clean

---

**Ready to Clean Up?**
Start with the easy wins:
1. Archive YearWheelClassRedefined.js
2. Remove console.table() line
3. Create utility files gradually
4. Test after each change

This will make the codebase much more maintainable before adding Supabase!
