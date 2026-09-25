// npm run backend — thin wrapper around `python backend/run.py` (the real launcher).
import { spawn } from 'node:child_process'
import path from 'node:path'
import { BACKEND, ROOT, fail, systemPython } from './lib.mjs'

const py = systemPython()
if (!py) fail('Python 3.10+ not found. Install it from https://www.python.org')
const child = spawn(py[0], [...py[1], path.join(BACKEND, 'run.py'), ...process.argv.slice(2)], { cwd: ROOT, stdio: 'inherit' })
child.on('exit', (code) => process.exit(code ?? 0))
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => child.kill(sig))
