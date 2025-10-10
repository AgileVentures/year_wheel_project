# Text Rendering Improvements for Year Wheel Activities

## Problem Analysis

Looking at the wheel visualization, several text truncation issues were identified:

1. **Text clipping at edges** - Text was being cut off at the sides of activity blocks
2. **Poor word wrapping** - Words were split awkwardly mid-word
3. **Inconsistent truncation** - Some activities showed partial text without proper ellipsis
4. **Fixed orientation logic** - Not adapting well to different activity sizes

## Improvements Made

### 1. Better Vertical Text Wrapping (`setCircleSectionAktivitetTitle`)

**Before:**
- Used 85% of width (too aggressive, caused edge clipping)
- Fixed 2-line limit (too restrictive for long activities)
- Simple word splitting that didn't handle edge cases

**After:**
- Uses 80% of width for safer margins
- Dynamically calculates max lines based on arc length
- Smarter word splitting that respects whitespace
- Better ellipsis placement that ensures text + ellipsis fits
- Improved vertical centering of multi-line text

**Key changes:**
```javascript
// Calculate how many lines can actually fit
const lineHeight = activityFontSize * 1.15;
const maxLines = Math.max(1, Math.floor(arcLengthPixels / lineHeight));

// Smarter word wrapping
const words = text.split(/(\s+|-)/); // Keep delimiters
// ... intelligent wrapping that skips pure whitespace at line starts
```

### 2. Improved Horizontal Text Truncation (`drawTextAlongArcAdapter`)

**Before:**
- Character-by-character truncation only
- No consideration for word boundaries
- Used 90% of arc (sometimes still too tight)

**After:**
- First tries to fit whole words
- Falls back to character truncation only if needed
- Uses 88% of arc for better spacing
- Cleaner ellipsis handling

**Key changes:**
```javascript
// Try word-boundary truncation first
const words = displayText.split(/\s+/);
let truncated = '';
// ... build text word by word until it doesn't fit

// Only fall back to character truncation if no words fit
if (!truncated) {
  // character-by-character...
}
```

### 3. Smarter Text Orientation Logic (`chooseTextOrientation`)

**Before:**
- Simple threshold: >= 25° = horizontal, < 25° = vertical
- Didn't consider radial height at all
- No consideration of text length

**After:**
- Three-tier decision system:
  - Very narrow (< 15°): Always vertical
  - Medium (15-30°): Choose based on aspect ratio
  - Wide (> 30°): Horizontal along arc
- Considers both angular width AND radial height
- Better adaptation to actual available space

**Key changes:**
```javascript
if (angularDegrees < 15) {
  return 'vertical'; // Too narrow for horizontal
} else if (angularDegrees < 30) {
  // Medium - check aspect ratio
  const aspectRatio = radialHeight / (angularWidth * 100);
  return aspectRatio > 0.3 ? 'vertical' : 'horizontal';
} else {
  return 'horizontal'; // Wide enough for arc text
}
```

### 4. Dynamic Font Scaling

**New feature:**
- Reduces font size for very narrow rings
- Ensures text remains readable even in tight spaces
- Prevents text overflow in edge cases

```javascript
// Scale down for very narrow rings
if (width < this.size / 35) {
  activityFontSize = fontSize * 0.6;
}
```

## Expected Results

### Better Word Wrapping
- Text wraps at natural word boundaries
- No more awkward mid-word splits
- Cleaner line breaks at spaces and hyphens

### No More Clipping
- 80% width usage provides safe margins
- Text stays within activity boundaries
- Better vertical centering

### Smarter Truncation
- Tries to show complete words when possible
- Proper ellipsis (…) only when needed
- More information visible in same space

### Better Orientation Choices
- Narrow activities consistently use vertical text
- Wide activities use horizontal arc text
- Medium-width activities choose best option

## Testing Recommendations

Test with these scenarios:

1. **Long activity names** (20+ characters)
   - Should wrap to multiple lines in vertical mode
   - Should truncate with ellipsis in horizontal mode

2. **Short activity names** (5-10 characters)
   - Should display fully without truncation
   - Should be centered properly

3. **Very narrow activities** (< 7 days)
   - Should use vertical text
   - Font should scale down if needed
   - Text should still be readable

4. **Wide activities** (30+ days)
   - Should use horizontal arc text
   - Should fit more text before truncating
   - Should look natural following the arc

5. **Activities with special characters**
   - Hyphens, spaces, numbers
   - Should wrap intelligently at boundaries

## Visual Improvements

Users should notice:
- ✅ Less text clipping at activity edges
- ✅ More readable text in narrow activities
- ✅ Better word wrapping (no mid-word breaks)
- ✅ Consistent ellipsis usage
- ✅ Better use of available space
- ✅ More professional appearance overall

## Performance

All improvements are O(n) where n is text length, with early exits where possible. No performance degradation expected.

## Backward Compatibility

All changes are internal to the rendering methods. No API changes or data structure changes required. Existing wheels will automatically benefit from improved rendering.
