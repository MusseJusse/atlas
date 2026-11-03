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
        const styles = new Map(Object.values(bundle ?? {}).flatMap((entry) =>
          entry.type === 'asset' && entry.fileName.endsWith('.css')
            ? [[entry.fileName, String(entry.source)] as const]
            : [],
        ));
        return injectFirstPaint(html, markup, styles);
      },
    },
  };
}

/** Fail the build if the HTML template or emitted styles no longer match the prerender path. */
export function injectFirstPaint(html: string, markup: string, styles: ReadonlyMap<string, string>) {
  const root = '<div id="root"></div>';
  if (html.split(root).length !== 2 || !markup.trim())
    throw new Error('First paint requires exactly one empty root and nonempty rendered markup.');
  let inlined = 0;
  const result = html.replace(root, () => `<div id="root">${markup}</div>`)
    .replace(/<link\b[^>]*rel="stylesheet"[^>]*>/g, (link) => {
      const href = /href="([^"]+)"/.exec(link)?.[1];
      const asset = [...styles].find(([fileName]) => href?.endsWith(`/${fileName}`));
      if (!asset || !asset[1].trim()) throw new Error(`First paint could not inline stylesheet: ${href}`);
      inlined++;
      return `<style>${asset[1]}</style>`;
    });
  if (!inlined) throw new Error('First paint did not find an emitted stylesheet.');
  return result;
}
