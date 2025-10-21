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
  resolve: {
    alias: {
      // Ensure single React instance
      'react': path.resolve(__dirname, './node_modules/react'),
      'react-dom': path.resolve(__dirname, './node_modules/react-dom'),
    },
    dedupe: ['react', 'react-dom'],
  },
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
          
          // Supabase - split into separate chunks
          if (id.includes('node_modules/@supabase/supabase-js')) {
            return 'supabase-client';
          }
          if (id.includes('node_modules/@supabase/postgrest-js')) {
            return 'supabase-postgrest';
          }
          if (id.includes('node_modules/@supabase/realtime-js')) {
            return 'supabase-realtime';
          }
          if (id.includes('node_modules/@supabase')) {
            return 'supabase-core';
          }
          
          // i18n libraries
          if (id.includes('node_modules/i18next') || id.includes('node_modules/react-i18next')) {
            return 'i18n';
          }
          
          // Icons
          if (id.includes('node_modules/lucide-react')) {
            return 'icons';
          }
          
          // AI SDK (large library, split separately)
          if (id.includes('node_modules/@ai-sdk') || id.includes('node_modules/ai/')) {
            return 'ai-sdk';
          }
          
          // Markdown rendering
          if (id.includes('node_modules/react-markdown') || id.includes('node_modules/remark-')) {
            return 'markdown';
          }
          
          // Date libraries (if any)
          if (id.includes('node_modules/date-fns') || id.includes('node_modules/dayjs')) {
            return 'date-utils';
          }
          
          // Canvas libraries
          if (id.includes('canvas2svg')) {
            return 'canvas-svg';
          }
          if (id.includes('node_modules/canvg')) {
            return 'canvg';
          }
          
          // PDF export library (lazy loaded, but split for when it's needed)
          if (id.includes('jspdf') || id.includes('html2canvas')) {
            return 'pdf-export';
          }
          
          // D3 library (if used)
          if (id.includes('node_modules/d3')) {
            return 'd3';
          }
          
          // Recharts and its dependencies (large chart library)
          if (id.includes('node_modules/recharts')) {
            return 'recharts';
          }
          if (id.includes('node_modules/react-redux') || id.includes('node_modules/@reduxjs/toolkit')) {
            return 'redux';
          }
          if (id.includes('node_modules/victory-') || id.includes('node_modules/d3-')) {
            return 'chart-utils';
          }
          
          // OpenAI/AI SDK (potentially large)
          if (id.includes('node_modules/openai') || id.includes('node_modules/@openai')) {
            return 'openai';
          }
          
          // Zod validation library
          if (id.includes('node_modules/zod')) {
            return 'zod';
          }
          
          // XLSX (Excel library - large)
          if (id.includes('node_modules/xlsx')) {
            return 'xlsx';
          }
          
          // Utility libraries
          if (id.includes('node_modules/immer') || id.includes('node_modules/fuse.js')) {
            return 'utilities';
          }
          
          // Driver.js (onboarding)
          if (id.includes('node_modules/driver.js')) {
            return 'onboarding';
          }
          
          // Stripe (lazy loaded)
          if (id.includes('node_modules/@stripe')) {
            return 'stripe';
          }
          
          // Remaining vendor modules - split by size
          if (id.includes('node_modules')) {
            // Get package name
            const match = id.match(/node_modules\/(@[^/]+\/[^/]+|[^/]+)\//);
            if (match) {
              const packageName = match[1];
              // Group smaller packages together
              return 'vendor-misc';
            }
            return 'vendor';
          }
        },
        // Optimize chunk file names with content hash for better caching
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
    // Increase chunk size warning limit (recharts is large but lazy loaded)
    chunkSizeWarningLimit: 1000,
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
    ],
    exclude: [
      'jspdf', // Lazy loaded, don't pre-bundle
      'xlsx', // Lazy loaded for Excel export
      'recharts', // Lazy loaded on forecast page
    ],
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
