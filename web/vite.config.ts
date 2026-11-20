import react from '@vitejs/plugin-react';
import {astryxStylex} from '@astryxdesign/build/vite';
import {lingui} from '@lingui/vite-plugin';
import {defineConfig} from 'vite';
import {backendPortFromEnv, ednovaServer} from './server/ednovaServer.ts';

const backendPort = backendPortFromEnv(process.env.EDNOVA_BACKEND_PORT);
const backendHost = process.env.EDNOVA_BACKEND_HOST || undefined;

export default defineConfig({
  plugins: [
    ...astryxStylex({layers: {product: 'ednova'}}),
    lingui({macroTransform: true}),
    react(),
    ednovaServer({backendPort, backendHost}),
  ],
  server: {port: 4175, host: '127.0.0.1', strictPort: true, cors: false},
  preview: {port: 4175, host: '127.0.0.1', strictPort: true, cors: false},
  // React and the router change far less often than the app: their own chunk stays cached across releases.
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {groups: [{name: 'react', test: /[\\/]node_modules[\\/](react|react-dom|scheduler|react-router)[\\/]/}]},
      },
    },
  },
});
