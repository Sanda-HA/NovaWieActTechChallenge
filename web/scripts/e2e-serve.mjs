import {spawnSync} from 'node:child_process';

const env = {...process.env, EDNOVA_BACKEND_PORT: '9998'};
const run = (args) =>
  spawnSync(process.execPath, args, {env, stdio: 'inherit', cwd: new URL('..', import.meta.url)});

const build = run(['./node_modules/vite/bin/vite.js', 'build']);
if (build.status !== 0) process.exit(build.status ?? 1);

const preview = run(['./node_modules/vite/bin/vite.js', 'preview', '--port', '4176', '--strictPort', '--host', '127.0.0.1']);
process.exit(preview.status ?? 0);
