/**
 * TextRenderer.js
 * 
 * Consolidated text rendering for Year Wheel canvas
 * Handles curved text (along arcs), perpendicular text (radial), and multi-line wrapping
 * 
 * This module consolidates text rendering logic previously duplicated in:
 * - YearWheelClass.js (setCircleSectionTitle, setCircleSectionAktivitetTitle, drawTextAlongArc)
 * - RenderEngine.js (drawCurvedText, drawPerpendicularText)
 * 
 * Created: 2024-12-24
 */

import ColorUtils from './ColorUtils.js';
import AngleUtils from './AngleUtils.js';
import LRUCache from './LRUCache.js';

/**
 * TextRenderer - Centralized text rendering for canvas wheel visualization
 */
export class TextRenderer {
  /**
   * Create a TextRenderer instance
   * @param {CanvasRenderingContext2D} context - Canvas 2D rendering context
   * @param {number} size - Canvas size in pixels
   * @param {Object} center - Center point {x, y}
   * @param {Object} options - Optional configuration
   */
  constructor(context, size, center, options = {}) {
    this.context = context;
    this.size = size;
    this.center = center;
    this.zoomLevel = options.zoomLevel || 100;
    
    // Use shared LRU cache for text measurements
    this.textMeasurementCache = options.textCache || new LRUCache(500);
    
    // Default font settings
    this.defaultFont = {
      family: 'Arial, sans-serif',
      weight: '500',
      color: '#FFFFFF'
    };
  }

  /**
   * Update zoom level (affects font size calculations)
   * @param {number} zoomLevel - Zoom percentage (100 = normal)
   */
  setZoomLevel(zoomLevel) {
    this.zoomLevel = zoomLevel;
  }

  // ============================================================================
  // TEXT ANALYSIS UTILITIES
  // ============================================================================

  /**
   * Split text into wrappable segments (on spaces AND hyphens)
   * "Verksamhets- & Aktiviteter" → ["Verksamhets-", "&", "Aktiviteter"]
   * @param {string} text - Text to split
   * @returns {string[]} Array of word segments
   */
  splitTextForWrapping(text) {
    const parts = [];
    const spaceSplit = text.split(/\s+/);

    for (const part of spaceSplit) {
      // Check if this part contains a hyphen (but not at the end)
      if (part.includes('-') && !part.endsWith('-')) {
        const hyphenIndex = part.indexOf('-');
        parts.push(part.substring(0, hyphenIndex + 1)); // "Verksamhets-"
        const remainder = part.substring(hyphenIndex + 1);
        if (remainder) {
          parts.push(remainder);
        }
      } else {
        parts.push(part);
      }
    }

    return parts.filter(p => p.length > 0);
  }

  /**
   * Measure text width with caching
   * @param {string} text - Text to measure
   * @param {string} font - Font string (e.g., "500 16px Arial")
   * @returns {number} Width in pixels
   */
  measureText(text, font) {
    const cacheKey = `${font}:${text}`;
    
    if (this.textMeasurementCache.has(cacheKey)) {
      return this.textMeasurementCache.get(cacheKey);
    }
    
    this.context.save();
    this.context.font = font;
    const width = this.context.measureText(text).width;
    this.context.restore();
    
    this.textMeasurementCache.set(cacheKey, width);
    return width;
  }

  /**
   * Truncate text to fit within maxWidth with ellipsis
   * @param {string} text - Text to truncate
   * @param {number} maxWidth - Maximum width in pixels
   * @param {string} font - Font string
   * @returns {string} Truncated text with ellipsis if needed
   */
  truncateText(text, maxWidth, font) {
    const width = this.measureText(text, font);
    if (width <= maxWidth) {
      return text;
    }

    let truncated = text;
    let truncatedWidth = this.measureText(truncated + '…', font);
    
    while (truncatedWidth > maxWidth && truncated.length > 1) {
      truncated = truncated.substring(0, truncated.length - 1);
      truncatedWidth = this.measureText(truncated + '…', font);
    }
    
    return truncated + '…';
  }

  /**
   * Calculate optimal font size using binary search
   * @param {string} text - Text to fit
   * @param {number} availableWidth - Available width in pixels
   * @param {number} minSize - Minimum font size
   * @param {number} maxSize - Maximum font size
   * @param {string} fontWeight - Font weight (default '500')
   * @returns {number} Optimal font size
   */
  calculateOptimalFontSize(text, availableWidth, minSize, maxSize, fontWeight = '500') {
    const testFontSize = (size) => {
      const font = `${fontWeight} ${size}px ${this.defaultFont.family}`;
      const textWidth = this.measureText(text, font);
      return textWidth <= availableWidth;
    };

    // Quick check: does it fit at max size?
    if (testFontSize(maxSize)) {
      return maxSize;
    }

    // Quick check: does it fit at min size?
    if (!testFontSize(minSize)) {
      return minSize;
    }

    // Binary search for optimal size
    let left = minSize;
    let right = maxSize;
    let bestSize = minSize;

    while (right - left > 0.5) {
      const mid = (left + right) / 2;
      if (testFontSize(mid)) {
        bestSize = mid;
        left = mid;
      } else {
        right = mid;
      }
    }

    return bestSize;
  }

  // ============================================================================
  // COORDINATE HELPERS
  // ============================================================================

  /**
   * Convert polar coordinates to Cartesian
   * @param {number} radius - Distance from center
   * @param {number} angleRad - Angle in radians
   * @returns {Object} {x, y} coordinates
   */
  polarToCartesian(radius, angleRad) {
    return {
      x: this.center.x + radius * Math.cos(angleRad),
      y: this.center.y + radius * Math.sin(angleRad)
    };
  }

  // ============================================================================
  // CURVED TEXT RENDERING (Along Arc)
  // ============================================================================

  /**
   * Draw text curved along an arc (e.g., month names)
   * Each character is positioned and rotated to follow the arc naturally
   * 
   * @param {string} text - Text to draw
   * @param {number} radius - Radius for text placement
   * @param {number} startAngleRad - Start angle in radians
   * @param {number} endAngleRad - End angle in radians
   * @param {Object} style - Style options
   * @param {number} style.fontSize - Font size in pixels
   * @param {string} style.fontWeight - Font weight (default '600')
   * @param {string} style.color - Text color
   */
  drawCurvedText(text, radius, startAngleRad, endAngleRad, style = {}) {
    const {
      fontSize = this.size / 50,
      fontWeight = '600',
      color = '#FFFFFF'
    } = style;

    const angleLength = endAngleRad - startAngleRad;
    const font = `${fontWeight} ${fontSize}px ${this.defaultFont.family}`;
    
    this.context.save();
    this.context.font = font;
    this.context.fillStyle = color;
    this.context.textAlign = 'center';
    this.context.textBaseline = 'middle';

    // Measure each character's natural width
    const charWidths = [];
    let totalWidth = 0;
    for (let i = 0; i < text.length; i++) {
      const charWidth = this.measureText(text[i], font);
      charWidths.push(charWidth);
      totalWidth += charWidth;
    }

    // Add natural spacing between characters (10% of average char width)
    const avgCharWidth = totalWidth / text.length;
    const letterSpacing = avgCharWidth * 0.1;
    const totalSpacing = letterSpacing * (text.length - 1);
    const totalTextWidth = totalWidth + totalSpacing;

    // Calculate the angular span this text would naturally occupy
    const textAngleSpan = totalTextWidth / radius;

    // Center the text within the available angle
    const startOffset = (angleLength - textAngleSpan) / 2;
    let currentAngle = startAngleRad + startOffset;

    // Draw each character with natural spacing
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const charWidth = charWidths[i];
      const charAngleSpan = charWidth / radius;

      // Position at center of character's arc span
      const charAngle = currentAngle + charAngleSpan / 2;
      const pos = this.polarToCartesian(radius, charAngle);

      this.context.save();
      this.context.translate(pos.x, pos.y);
      this.context.rotate(charAngle + Math.PI / 2);
      this.context.fillText(char, 0, 0);
      this.context.restore();

      // Move to next character (char width + spacing)
      currentAngle += charAngleSpan + letterSpacing / radius;
    }

    this.context.restore();
  }

  /**
   * Draw text along arc with automatic font sizing
   * Used for ring content text that follows the curve
   * 
   * @param {string} text - Text to draw
   * @param {number} radius - Radius for text placement
   * @param {number} startAngleRad - Start angle in radians
   * @param {number} endAngleRad - End angle in radians
   * @param {number} fontSize - Font size in pixels
   * @param {string} color - Text color
   */
  drawTextAlongArc(text, radius, startAngleRad, endAngleRad, fontSize, color) {
    const angleSpan = endAngleRad - startAngleRad;
    const font = `500 ${fontSize}px ${this.defaultFont.family}`;
    
    this.context.save();
    this.context.font = font;
    this.context.fillStyle = color;
    this.context.textAlign = 'center';
    this.context.textBaseline = 'middle';

    // Measure each character's natural width
    const charWidths = [];
    let totalWidth = 0;
    for (let i = 0; i < text.length; i++) {
      const charWidth = this.measureText(text[i], font);
      charWidths.push(charWidth);
      totalWidth += charWidth;
    }

    // Add natural spacing between characters (10% of average char width)
    const avgCharWidth = totalWidth / text.length;
    const letterSpacing = avgCharWidth * 0.1;
    const totalSpacing = letterSpacing * (text.length - 1);
    const totalTextWidth = totalWidth + totalSpacing;

    // Calculate the angular span this text would naturally occupy
    const textAngleSpan = totalTextWidth / radius;

    // Center the text within the available angle
    const startOffset = (angleSpan - textAngleSpan) / 2;
    let currentAngle = startAngleRad + startOffset;

    // Draw each character with natural spacing
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const charWidth = charWidths[i];
      const charAngleSpan = charWidth / radius;

      // Position at center of character's arc span
      const charAngle = currentAngle + charAngleSpan / 2;
      const pos = this.polarToCartesian(radius, charAngle);

      this.context.save();
      this.context.translate(pos.x, pos.y);
      this.context.rotate(charAngle + Math.PI / 2);
      this.context.fillText(char, 0, 0);
      this.context.restore();

      // Move to next character
      currentAngle += charAngleSpan + letterSpacing / radius;
    }

    this.context.restore();
  }

  // ============================================================================
  // PERPENDICULAR TEXT RENDERING (Radial Direction)
  // ============================================================================

  /**
   * Evaluate rendering solution for perpendicular text
   * Determines optimal font size, line count, and truncation needs
   * 
   * @param {string} text - Text to render
   * @param {string} orientation - 'vertical' or 'horizontal'
   * @param {number} arcLengthPx - Arc length in pixels
   * @param {number} radialHeight - Radial height in pixels
   * @param {number} middleRadius - Middle radius of the segment
   * @param {boolean} allowWrapping - Whether to allow multi-line wrapping
   * @returns {Object} Rendering evaluation result
   */
  evaluateRenderingSolution(text, orientation, arcLengthPx, radialHeight, middleRadius, allowWrapping = false) {
    const zoomFactor = this.zoomLevel / 100;

    // ZOOM-AWARE font size thresholds
    const effectiveDisplaySize = this.size * zoomFactor;
    const absoluteMinFont = Math.max(12, effectiveDisplaySize / 200);
    const minDisplayFont = Math.max(14, effectiveDisplaySize / 180);
    const reasonableMaxFont = Math.min(35, effectiveDisplaySize / 60);
    const maxDisplayFont = Math.min(50, effectiveDisplaySize / 45);

    // Text analysis
    const textLength = text.length;
    const hasSpaces = text.includes(' ');
    const wordCount = hasSpaces ? text.split(/\s+/).length : 1;

    let lengthPenalty = 1.0;
    if (textLength > 15) lengthPenalty = 0.9;
    else if (textLength > 10) lengthPenalty = 0.93;
    else if (textLength > 6) lengthPenalty = 0.96;

    // Container proportionality
    const segmentArea = radialHeight * arcLengthPx;
    const wheelArea = this.size * this.size;
    const areaRatio = segmentArea / wheelArea;

    // Smart size penalty based on content type
    const isShortSingleWord = textLength <= 12 && wordCount === 1;
    const isMultiLine = allowWrapping && hasSpaces;

    let sizePenalty = 1.0;
    if (isMultiLine) {
      if (areaRatio > 0.15) sizePenalty = 0.96;
      else if (areaRatio > 0.1) sizePenalty = 0.98;
      else if (areaRatio > 0.06) sizePenalty = 0.99;
    } else if (isShortSingleWord) {
      if (areaRatio > 0.15) sizePenalty = 0.94;
      else if (areaRatio > 0.1) sizePenalty = 0.96;
      else if (areaRatio > 0.06) sizePenalty = 0.98;
    } else {
      if (areaRatio > 0.15) sizePenalty = 0.88;
      else if (areaRatio > 0.1) sizePenalty = 0.92;
      else if (areaRatio > 0.06) sizePenalty = 0.96;
    }

    let fontSize, needsTruncation, truncationPercent, lineCount = 1;

    if (orientation === 'vertical') {
      const maxTextWidth = radialHeight * 0.8;
      const maxTextHeight = arcLengthPx * 0.85;

      if (allowWrapping && hasSpaces) {
        // Multi-line wrapping
        const words = this.splitTextForWrapping(text);
        const targetLines = words.length >= 4 ? 3 : 2;
        const lineHeight = maxTextHeight / (targetLines + 0.5);

        fontSize = Math.min(maxTextWidth * 0.45, lineHeight * 0.8, reasonableMaxFont);
        fontSize = fontSize * lengthPenalty * sizePenalty;
        fontSize = Math.max(fontSize, minDisplayFont);
        fontSize = Math.min(fontSize, maxDisplayFont);
        if (fontSize < absoluteMinFont) fontSize = absoluteMinFont;

        // Simulate wrapping
        const wrappingThreshold = maxTextWidth * 0.85;
        const font = `500 ${fontSize}px ${this.defaultFont.family}`;
        
        const lines = [];
        let currentLine = '';

        for (const word of words) {
          const testLine = currentLine ? currentLine + ' ' + word : word;
          const testWidth = this.measureText(testLine, font);

          if (testWidth > wrappingThreshold && currentLine) {
            lines.push(currentLine);
            currentLine = word;
          } else {
            currentLine = testLine;
          }
        }
        if (currentLine) lines.push(currentLine);

        lineCount = lines.length;
        const totalHeight = lineCount * fontSize * 1.2;

        needsTruncation = totalHeight > maxTextHeight;
        truncationPercent = needsTruncation ? ((totalHeight - maxTextHeight) / totalHeight) * 100 : 0;

        // Check line width overflow
        const maxLineWidth = Math.max(...lines.map(line => this.measureText(line, font)));
        if (maxLineWidth > maxTextWidth) {
          truncationPercent = Math.max(truncationPercent, ((maxLineWidth - maxTextWidth) / maxLineWidth) * 100);
        }
      } else {
        // Single line
        fontSize = Math.min(maxTextWidth * 0.45, maxTextHeight * 0.25, reasonableMaxFont);
        fontSize = fontSize * lengthPenalty * sizePenalty;
        fontSize = Math.max(fontSize, minDisplayFont);
        fontSize = Math.min(fontSize, maxDisplayFont);
        if (fontSize < absoluteMinFont) fontSize = absoluteMinFont;

        const font = `500 ${fontSize}px ${this.defaultFont.family}`;
        const textWidth = this.measureText(text, font);
        needsTruncation = textWidth > maxTextWidth;

        if (needsTruncation) {
          const charsNeeded = text.length;
          const charsFit = Math.floor((maxTextWidth / textWidth) * text.length) - 1;
          truncationPercent = ((charsNeeded - charsFit) / charsNeeded) * 100;
        } else {
          truncationPercent = 0;
        }
      }
    } else {
      // Horizontal orientation
      const maxTextWidth = arcLengthPx * 0.85;
      const maxTextHeight = radialHeight * 0.8;

      fontSize = Math.min(maxTextWidth * 0.1, maxTextHeight * 0.5, reasonableMaxFont);
      fontSize = fontSize * lengthPenalty * sizePenalty;
      fontSize = Math.max(fontSize, minDisplayFont);
      fontSize = Math.min(fontSize, maxDisplayFont);
      if (fontSize < absoluteMinFont) fontSize = absoluteMinFont;

      const font = `500 ${fontSize}px ${this.defaultFont.family}`;
      const textWidth = this.measureText(text, font);
      needsTruncation = textWidth > maxTextWidth;

      if (needsTruncation) {
        const charsNeeded = text.length;
        const charsFit = Math.floor((maxTextWidth / textWidth) * text.length) - 1;
        truncationPercent = ((charsNeeded - charsFit) / charsNeeded) * 100;
      } else {
        truncationPercent = 0;
      }
    }

    // Calculate quality score
    const fontQuality = fontSize >= 16 && fontSize <= 28 ? 1.0 : (fontSize >= 14 ? 0.8 : 0.6);
    const truncationQuality = needsTruncation ? Math.max(0, 1 - truncationPercent / 100) : 1.0;
    const score = (fontQuality * 0.6) + (truncationQuality * 0.4);

    return {
      orientation,
      fontSize,
      lineCount,
      needsTruncation,
      truncationPercent: Math.round(truncationPercent),
      score: Math.round(score * 100) / 100,
      allowWrapping: allowWrapping && lineCount > 1
    };
  }

  /**
   * Draw perpendicular text (activity names on segments)
   * Text is oriented radially (perpendicular to the arc)
   * 
   * @param {string} text - Text to draw
   * @param {number} startRadius - Inner radius of segment
   * @param {number} width - Radial width of segment
   * @param {number} startAngleRad - Start angle in radians
   * @param {number} endAngleRad - End angle in radians
   * @param {Object} style - Style options
   * @param {string} style.backgroundColor - Background color for contrast calculation
   * @param {Object} style.renderDecision - Pre-calculated rendering decision
   */
  drawPerpendicularText(text, startRadius, width, startAngleRad, endAngleRad, style = {}) {
    const {
      backgroundColor = null,
      renderDecision = null
    } = style;

    const angleLength = Math.abs(endAngleRad - startAngleRad);
    const centerAngle = (startAngleRad + endAngleRad) / 2;
    const middleRadius = startRadius + width / 2;

    // Calculate available space in pixels
    const arcLength = middleRadius * angleLength;
    const radialWidth = width;

    // Smart zoom thresholds
    const zoomFactor = this.zoomLevel / 100;
    let arcLengthThreshold = this.size * 0.003 / zoomFactor;
    let radialWidthThreshold = this.size * 0.002 / zoomFactor;

    if (arcLength < arcLengthThreshold || radialWidth < radialWidthThreshold) {
      return; // Too small to render readable text
    }

    // Get text color with proper contrast
    const textColor = backgroundColor ? ColorUtils.getContrastColor(backgroundColor) : '#FFFFFF';

    // Calculate font sizing
    const effectiveDisplaySize = this.size * zoomFactor;
    const absoluteMinFont = Math.max(12, Math.min(effectiveDisplaySize / 200, 16));
    const minDisplayFont = Math.max(14, Math.min(effectiveDisplaySize / 180, 18));
    const maxDisplayFont = Math.min(50, Math.max(20, effectiveDisplaySize / 45));
    const reasonableMaxFont = Math.min(35, Math.max(18, effectiveDisplaySize / 60));

    const maxTextWidth = radialWidth * 0.85;
    const maxTextHeight = arcLength * 0.85;

    // Find optimal font size
    let testFontSize = reasonableMaxFont;
    let minFont = minDisplayFont;
    let maxFont = reasonableMaxFont;

    this.context.save();

    for (let iteration = 0; iteration < 10; iteration++) {
      testFontSize = (minFont + maxFont) / 2;
      this.context.font = `500 ${testFontSize}px ${this.defaultFont.family}`;
      const measuredWidth = this.context.measureText(text).width;

      if (measuredWidth <= maxTextWidth * 0.95) {
        minFont = testFontSize;
      } else {
        maxFont = testFontSize;
      }
    }

    testFontSize = minFont;
    if (text.length > 15) testFontSize *= 0.95;
    testFontSize = Math.max(testFontSize, absoluteMinFont);
    testFontSize = Math.min(testFontSize, maxDisplayFont);

    this.context.font = `500 ${testFontSize}px ${this.defaultFont.family}`;
    this.context.fillStyle = textColor;
    this.context.textAlign = 'center';
    this.context.textBaseline = 'middle';

    const textWidth = this.context.measureText(text).width;

    // Handle truncation
    let displayText = text;
    if (textWidth > maxTextWidth) {
      displayText = this.truncateText(text, maxTextWidth * 0.9, `500 ${testFontSize}px ${this.defaultFont.family}`);
    }

    // Handle multi-line rendering
    let linesToRender = [displayText];

    if (renderDecision && renderDecision.allowWrapping && renderDecision.lineCount > 1) {
      const words = this.splitTextForWrapping(text);
      linesToRender = [];
      let currentLine = '';

      this.context.font = `500 ${renderDecision.fontSize}px ${this.defaultFont.family}`;

      for (const word of words) {
        const testLine = currentLine ? currentLine + ' ' + word : word;
        const testWidth = this.context.measureText(testLine).width;

        if (testWidth > maxTextWidth * 0.85 && currentLine) {
          linesToRender.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }
      if (currentLine) linesToRender.push(currentLine);

      const lineHeight = renderDecision.fontSize * 1.2;
      const totalHeight = linesToRender.length * lineHeight;

      if (totalHeight > maxTextHeight * 0.95) {
        linesToRender = [displayText];
      } else {
        testFontSize = renderDecision.fontSize;
        this.context.font = `500 ${testFontSize}px ${this.defaultFont.family}`;
      }
    } else if (!renderDecision && text.includes(' ') && testFontSize >= 14) {
      // Fallback wrapping
      const words = text.split(/\s+/);
      linesToRender = [];
      let currentLine = '';

      for (const word of words) {
        const testLine = currentLine ? currentLine + ' ' + word : word;
        const testWidth = this.context.measureText(testLine).width;

        if (testWidth > maxTextWidth && currentLine) {
          linesToRender.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }
      if (currentLine) linesToRender.push(currentLine);

      const lineHeight = testFontSize * 1.2;
      if (linesToRender.length * lineHeight > maxTextHeight) {
        linesToRender = [displayText];
      }
    }

    // Position at center of segment
    const pos = this.polarToCartesian(middleRadius, centerAngle);
    this.context.translate(pos.x, pos.y);

    // Determine rotation for perpendicular text
    let normalizedAngle = centerAngle % (Math.PI * 2);
    if (normalizedAngle < 0) normalizedAngle += Math.PI * 2;

    // Flip text on left side to keep readable
    const isLeftSide = normalizedAngle > Math.PI / 2 && normalizedAngle < Math.PI * 1.5;
    let rotation = centerAngle;
    if (isLeftSide) {
      rotation += Math.PI;
    }

    this.context.rotate(rotation);

    // Draw text
    if (linesToRender.length === 1) {
      this.context.fillText(linesToRender[0], 0, 0);
    } else {
      const lineHeight = testFontSize * 1.2;
      const totalHeight = linesToRender.length * lineHeight;
      let startY = -totalHeight / 2 + lineHeight / 2;

      for (const line of linesToRender) {
        this.context.fillText(line, 0, startY);
        startY += lineHeight;
      }
    }

    this.context.restore();
  }

  // ============================================================================
  // SIMPLE TEXT RENDERING
  // ============================================================================

  /**
   * Draw simple text on a circle at a specific radius and angle
   * @param {string} text - Text to draw
   * @param {number} radius - Radius for text placement
   * @param {number} angleRad - Angle in radians
   * @param {Object} style - Style options
   */
  drawTextOnCircle(text, radius, angleRad, style = {}) {
    const {
      fontSize = this.size / 50,
      fontWeight = '600',
      color = '#FFFFFF'
    } = style;

    this.context.save();
    this.context.font = `${fontWeight} ${fontSize}px ${this.defaultFont.family}`;
    this.context.fillStyle = color;
    this.context.textAlign = 'center';
    this.context.textBaseline = 'middle';

    const pos = this.polarToCartesian(radius, angleRad);
    this.context.translate(pos.x, pos.y);
    this.context.rotate(angleRad + Math.PI / 2);
    this.context.fillText(text, 0, 0);

    this.context.restore();
  }
}

export default TextRenderer;
