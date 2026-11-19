import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// Python renders shared static templates; Vite compiles Vue and bundles modules.
export default defineConfig({
  plugins: [vue()],
  base: './',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    // Preserve exact rgba values: CSS minification can round their alpha channels.
    cssMinify: false,
    rolldownOptions: {
      input: ['index.html', 'app.html', 'terms.html', 'privacy.html'],
    },
  },
});
