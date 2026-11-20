import {execFileSync} from 'node:child_process';
import {python} from './python';

import {e2eDatabaseUrl} from './helpers';

const postgresContainer = process.env.EDNOVA_E2E_POSTGRES_CONTAINER ?? 'ednova-test-pg';

async function requireService(name: string, url: string): Promise<void> {
  try {
    const response = await fetch(url, {signal: AbortSignal.timeout(5000)});
    if (response.ok) return;
  } catch {}
  throw new Error(`${name} is not reachable at ${url}. Start it before running the browser tests.`);
}

function run(command: string, args: string[], options: {cwd?: string; env?: NodeJS.ProcessEnv} = {}): string {
  return execFileSync(command, args, {encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...options});
}

export default async function globalSetup(): Promise<void> {
  await requireService('The agent (llm_service)', 'http://127.0.0.1:8100/health');
  await requireService('The e2e backend', 'http://127.0.0.1:9998/openapi.json');

  try {
    run('docker', ['exec', postgresContainer, 'psql', '-U', 'ednova', '-d', 'postgres', '-c', 'CREATE DATABASE ednova_e2e']);
  } catch (error) {
    const text = String((error as {stderr?: string}).stderr ?? error);
    if (!text.includes('already exists')) {
      throw new Error(`Could not create the ednova_e2e database in the ${postgresContainer} container: ${text.trim()}`);
    }
  }

  run(python, ['-m', 'alembic', 'upgrade', 'head'], {
    cwd: '../Backend',
    env: {...process.env, DATABASE_URL: e2eDatabaseUrl, SECRET_KEY: 'e2e-only'},
  });
  run('docker', ['exec', postgresContainer, 'psql', '-U', 'ednova', '-d', 'ednova_e2e', '-c', 'TRUNCATE users CASCADE']);
}
