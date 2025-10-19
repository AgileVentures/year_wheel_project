# How to Export WheelVisualization as SVG for Canva

This guide explains how to export the WheelVisualization component as an SVG file that can be used in Canva for marketing materials.

## Overview

The WheelVisualization component can be rendered in three variants:
- `full` - Complete 360° wheel
- `half` - Upper semicircle (180°)
- `quarter` - Quarter circle (90°)

## Step-by-Step Process

### 1. Configure the Component

Open the file where you want to render the wheel visualization (e.g., `PhilosophySection.jsx`) and set the desired variant:

```jsx
<WheelVisualization variant="half" className="max-w-3xl mx-auto" />
```

**Available variants:**
- `variant="full"` - Complete wheel (best for detailed views)
- `variant="half"` - Half wheel (good for hero sections)
- `variant="quarter"` - Quarter wheel (minimal space usage)

### 2. Render in Browser

1. Start the development server:
   ```bash
   yarn dev
   ```

2. Navigate to the page containing the WheelVisualization component
   - For Philosophy section: Go to landing page and scroll to the philosophy section
   - For other sections: Navigate to the appropriate page

### 3. Extract SVG Code

1. **Open Browser Developer Tools**
   - Right-click on the wheel visualization
   - Select "Inspect Element" or press `F12`

2. **Locate the SVG Element**
   - In the Elements/Inspector tab, find the `<svg>` element
   - The SVG will be nested within the WheelVisualization component
   - Look for `<svg width="..." height="..." viewBox="...">...</svg>`

3. **Copy the SVG Code**
   - Right-click on the `<svg>` element in the inspector
   - Select "Copy" → "Copy outerHTML"
   - This copies the complete SVG markup including all paths, circles, and text

### 4. Clean and Optimize SVG

1. **Open SVG Editor**
   - Go to [https://editsvgcode.com/](https://editsvgcode.com/)
   - Paste the copied SVG code into the editor

2. **Clean the Code (Optional)**
   - Remove any unnecessary attributes like `class` or `style` if needed
   - Adjust `width`, `height`, or `viewBox` if required
   - The code should be clean and optimized

3. **Download the SVG**
   - Click "Download" to save the cleaned SVG file
   - Save with a descriptive name like `yearwheel-half-philosophy.svg`

### 5. Convert for Canva Compatibility

1. **Open Vector Editor**
   - Go to [https://vectorink.io/app/canvas](https://vectorink.io/app/canvas)
   - This step ensures maximum compatibility with Canva

2. **Import the SVG**
   - Click "Import" or drag and drop your SVG file
   - The wheel should appear in the canvas

3. **Select and Export**
   - Select the entire wheel visualization
   - Click "Export Selection"
   - Choose SVG format for best quality
   - Download the final optimized file

### 6. Use in Canva

1. **Upload to Canva**
   - Log in to [https://canva.com](https://canva.com)
   - Create a new design or open existing project
   - Click "Uploads" in the left sidebar
   - Upload your optimized SVG file

2. **Use in Design**
   - Drag the uploaded wheel into your design
   - Resize, rotate, or style as needed
   - The SVG will maintain crisp quality at any size

## Tips and Best Practices

### For Best Quality
- Use `variant="full"` for detailed marketing materials
- Use `variant="half"` for hero sections or banners
- Use `variant="quarter"` for minimal accent elements

### Color Customization
- The wheel uses the default color scheme defined in the component
- Colors can be modified in Canva after import
- For consistent branding, consider updating the component's default colors

### Size Considerations
- SVGs are scalable, so export at a reasonable size (the component's default)
- Canva will allow you to scale without quality loss
- For print materials, ensure the SVG has sufficient detail

### Troubleshooting

**SVG not appearing correctly:**
- Ensure you copied the complete `<svg>` element including closing tag
- Check that all paths and elements are included
- Try refreshing the browser and re-extracting

**Canva upload issues:**
- Use the vectorink.io step to ensure compatibility
- Try exporting as PNG if SVG has issues (though you'll lose scalability)
- Ensure the SVG file size is reasonable (under 5MB)

**Missing elements:**
- Some dynamic elements might not render in the static SVG
- Ensure the component is fully loaded before extracting
- Check browser console for any JavaScript errors

## File Naming Convention

Use descriptive names for your exported files:
- `yearwheel-full-complete.svg` - Complete wheel
- `yearwheel-half-hero.svg` - Half wheel for hero sections
- `yearwheel-quarter-accent.svg` - Quarter wheel for accents
- `yearwheel-full-marketing-blue.svg` - Full wheel with specific color scheme

## Marketing Use Cases

### Social Media
- **Instagram Posts**: Use `variant="full"` for square posts
- **Facebook Covers**: Use `variant="half"` for banner-style layouts
- **LinkedIn**: Use `variant="quarter"` as accent elements

### Print Materials
- **Brochures**: Full wheel for detailed explanations
- **Business Cards**: Quarter wheel as logo accent
- **Posters**: Half wheel for clean, modern look

### Web Graphics
- **Blog Headers**: Half wheel works well
- **Email Signatures**: Quarter wheel as subtle branding
- **Presentation Slides**: Any variant depending on content

## Version Control

When creating multiple versions:
1. Document the variant and purpose in filename
2. Keep source configurations noted
3. Maintain consistent color schemes across materials
4. Store both SVG and any Canva-exported formats

This process ensures you can create high-quality, scalable graphics from the YearWheel component for any marketing need.