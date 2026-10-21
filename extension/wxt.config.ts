import { defineConfig } from 'wxt';

export default defineConfig({
  manifestVersion: 3,
  vite: () => ({
    resolve: {
      conditions: ['onnxruntime-web-use-extern-wasm'],
    },
  }),
  manifest: ({ browser }) => ({
    name: 'Chessme',
    description:
      'See what a human at a chosen Elo would likely play, via the Maia2 rapid/blitz models, running fully locally.',

    permissions: browser === 'firefox' ? ['tabs', 'storage'] : ['tabs', 'storage', 'offscreen'],

    action: {
      default_title: 'Chessme',
    },
    content_security_policy: {
      extension_pages: "script-src 'self' 'wasm-unsafe-eval'; object-src 'self'",
    },

    browser_specific_settings: {
      gecko: {
        id: 'chessme@chessus.local',
        data_collection_permissions: { required: ['none'] },
      },
    },
  }),
});
