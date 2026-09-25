// npm run test:backend — run the backend pytest suite (offline; never uses real keys).
import { spawnSync } from 'node:child_process'
import { BACKEND, fail, venvPython } from './lib.mjs'

const python = venvPython()
if (!python) fail('Backend environment not found. Run "npm run setup" once first.')

const r = spawnSync(python, ['-m', 'pytest', '-q', ...process.argv.slice(2)], { cwd: BACKEND, stdio: 'inherit' })
process.exit(r.status ?? 1)
