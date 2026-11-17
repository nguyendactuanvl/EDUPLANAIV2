import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(
        process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || ''
      ),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        'react': path.resolve(__dirname, 'node_modules/react'),
        'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
      },
      dedupe: ['react', 'react-dom'],
    },
    optimizeDeps: {
      entries: ['index.html'],
      include: [
        'react',
        'react-dom',
        'react/jsx-runtime',
        'react/jsx-dev-runtime',
        'react-dom/client',
        'lucide-react',
        'clsx',
        'tailwind-merge',
      ],
    },
    build: {
      target: 'esnext',
      chunkSizeWarningLimit: 3000,
      minify: 'esbuild',
      sourcemap: false,
      reportCompressedSize: false,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined;
            if (id.includes('three')) return 'vendor-three';
            if (id.includes('pdfjs-dist')) return 'vendor-pdfjs';
            if (id.includes('xlsx')) return 'vendor-xlsx';
            if (id.includes('docx') || id.includes('html-to-docx') || id.includes('mammoth')) return 'vendor-docx';
            if (id.includes('jspdf') || id.includes('html2canvas') || id.includes('html2pdf')) return 'vendor-pdfout';
            if (id.includes('jsxgraph') || id.includes('mathjs') || id.includes('recharts')) return 'vendor-mathviz';
            if (id.includes('firebase')) return 'vendor-firebase';
            if (id.includes('lucide-react') || id.includes('motion')) return 'vendor-ui';
            return undefined;
          },
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify file watching is disabled to prevent flickering during agent edits.
      hmr: false,
      ws: false,
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {
        ignored: ['**/public/assets/**', '**/dist/**', '**/node_modules/**', '**/.git/**', '**/shared_exams.json'],
      },
    },
  };
});
