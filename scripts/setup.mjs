// npm run setup — thin wrapper around `python backend/install.py` (the real installer).
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { BACKEND, ROOT, fail, systemPython } from './lib.mjs'

const py = systemPython()
if (!py) fail('Python 3.10+ not found. Install it from https://www.python.org')
const r = spawnSync(py[0], [...py[1], path.join(BACKEND, 'install.py')], { cwd: ROOT, stdio: 'inherit' })
process.exit(r.status ?? 1)
