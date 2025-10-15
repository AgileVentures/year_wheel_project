import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import fs from 'fs'
import path from 'path'

// Custom plugin to inline critical CSS and optimize loading
const optimizeCSSPlugin = () => {
  return {
    name: 'optimize-css',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        // Read critical CSS
        const criticalCSS = fs.readFileSync(
          path.resolve(__dirname, 'src/critical.css'),
          'utf-8'
        );
        
        // Inject critical CSS inline in head
        html = html.replace(
          '</head>',
          `<style>${criticalCSS}</style></head>`
        );
        
        // Replace CSS link tags with preload + async load pattern
        html = html.replace(
          /<link rel="stylesheet" crossorigin href="([^"]+\.css)">/g,
          '<link rel="preload" as="style" href="$1" onload="this.onload=null;this.rel=\'stylesheet\'" /><noscript><link rel="stylesheet" href="$1" /></noscript>'
        );
        
        return html;
      }
    }
  };
};

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), optimizeCSSPlugin()],
  build: {
    // Optimize chunk splitting for better performance
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Core React libraries
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'react-core';
          }
          
          // React Router
          if (id.includes('node_modules/react-router')) {
            return 'react-router';
          }
          
          // Supabase
          if (id.includes('node_modules/@supabase')) {
            return 'supabase';
          }
          
          // i18n libraries
          if (id.includes('node_modules/i18next') || id.includes('node_modules/react-i18next')) {
            return 'i18n';
          }
          
          // Icons
          if (id.includes('node_modules/lucide-react')) {
            return 'icons';
          }
          
          // Date libraries (if any)
          if (id.includes('node_modules/date-fns') || id.includes('node_modules/dayjs')) {
            return 'date-utils';
          }
          
          // Canvas libraries
          if (id.includes('canvas2svg') || id.includes('node_modules/canvas')) {
            return 'canvas';
          }
          
          // PDF export library
          if (id.includes('jspdf')) {
            return 'pdf-export';
          }
          
          // Split large vendor modules
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        },
        // Optimize chunk file names with content hash for better caching
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 600,
    // Disable source maps in production for smaller bundles
    sourcemap: false,
    // Use terser for better minification
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug', 'console.trace'],
        passes: 2, // Run compression twice for better results
      },
      mangle: {
        safari10: true, // Fix Safari 10/11 bugs
      },
      format: {
        comments: false, // Remove all comments
      },
    },
    // Enable CSS code splitting
    cssCodeSplit: true,
    // Target modern browsers for smaller bundle
    target: 'es2020',
  },
  // Optimize dependencies pre-bundling
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'react-i18next',
      'i18next',
      'jspdf',
    ],
    exclude: [], // Let Vite handle all dependencies
    force: true, // Force re-optimization
  },
  // Enable advanced tree-shaking
  esbuild: {
    // Drop console and debugger in production
    drop: ['console', 'debugger'],
    // Use legal comments for license compliance
    legalComments: 'none',
    // Minify identifiers
    minifyIdentifiers: true,
    // Minify syntax
    minifySyntax: true,
    // Minify whitespace
    minifyWhitespace: true,
  },
})
