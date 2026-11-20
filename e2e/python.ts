import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

const venvPython = fileURLToPath(new URL('../Backend/.venv/Scripts/python.exe', import.meta.url));

/** The backend's own virtualenv when it exists, then EDNOVA_PYTHON, then `python` on the PATH. */
export const python = existsSync(venvPython) ? venvPython : (process.env.EDNOVA_PYTHON ?? 'python');
