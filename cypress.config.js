import { defineConfig } from 'cypress';
import { compare } from 'odiff-bin';
import path from 'path';
import os from 'os';
import fs from 'fs';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:5173',
    chromeWebSecurity: false,
    video: false,
    retries: 1,
    screenshotOnRunFailure: false,
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    supportFile: 'cypress/support/e2e.js',
    setupNodeEvents(on, config) {
      // Visual regression testing: Compare before/after canvas images
      on('task', {
        async compareBeforeAfter({ beforeFilename, afterFilename }) {
          const beforeImage = path.join('cypress', 'downloads', beforeFilename);
          const afterImage = path.join('cypress', 'downloads', afterFilename);
          const diffImage = path.join('cypress', 'downloads', 'diff-' + afterFilename);

          // Check if before image exists
          if (!fs.existsSync(beforeImage)) {
            console.error('Before image not found:', beforeImage);
            return { different: false, error: 'before-image-missing' };
          }

          console.log('Comparing before image %s to after image %s', beforeImage, afterImage);
          const result = await compare(
            beforeImage,
            afterImage,
            diffImage,
            { threshold: 0.1 }
          );

          // For this test, we WANT them to be different (activity was added)
          // odiff returns match: true if images are the SAME
          // So we invert it: different = !match
          return { 
            different: !result.match,
            match: result.match,
            reason: result.match ? 'images-identical' : 'images-different'
          };
        },

        async compareImage({ filename, options = {} }) {
          const baseFolder = path.join('cypress', 'images');
          const osName = os.platform();
          const basename = path.basename(filename);
          const baseImage = path.join(baseFolder, osName, basename);
          const newImage = path.join('cypress', 'downloads', filename);
          const diffImage = path.join('cypress', 'downloads', 'diff-' + basename);

          // If no baseline exists, this is the first run - save as baseline
          if (!fs.existsSync(baseImage)) {
            console.log('No baseline found, creating baseline image:', baseImage);
            fs.mkdirSync(path.dirname(baseImage), { recursive: true });
            fs.copyFileSync(newImage, baseImage);
            return { match: true, reason: 'baseline-created' };
          }

          console.log('Comparing base image %s to new image %s', baseImage, newImage);
          const result = await compare(
            baseImage,
            newImage,
            diffImage,
            { threshold: 0.1, ...options }
          );

          return result;
        }
      });

      return config;
    },
  },
  component: {
    devServer: {
      framework: 'react',
      bundler: 'vite',
    },
    specPattern: 'cypress/component/**/*.cy.{js,jsx,ts,tsx}',
    supportFile: 'cypress/support/component.js',
  },
  viewportWidth: 1280,
  viewportHeight: 720,
});
