import { createServer, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { benchmarkData } from './benchmark-data.ts';

/** Render the default page at build time, with chart frames ready for client measurements. */
export function firstPaint(): Plugin {
  return {
    name: 'first-paint',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      async handler(html, { bundle }) {
        const server = await createServer({
          configFile: false,
          plugins: [benchmarkData(), react()],
          server: { middlewareMode: true, hmr: false, watch: null },
          optimizeDeps: { noDiscovery: true, include: [] },
          appType: 'custom',
        });
        let markup: string;
        try {
          const { App } = await server.ssrLoadModule('/src/App.tsx') as typeof import('../src/App');
          markup = renderToString(createElement(App));
        } finally {
          await server.close();
        }
        return html
          .replace('<div id="root"></div>', () => `<div id="root">${markup}</div>`)
          .replace(/<link\b[^>]*rel="stylesheet"[^>]*>/g, (link) => {
            const href = /href="([^"]+)"/.exec(link)?.[1];
            const asset = Object.values(bundle ?? {}).find(
              (entry) => entry.type === 'asset' && href?.endsWith(`/${entry.fileName}`),
            );
            return asset?.type === 'asset' ? `<style>${asset.source}</style>` : link;
          });
      },
    },
  };
}
