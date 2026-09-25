// Shared helpers for the run/setup scripts (plain Node, no dependencies).
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
export const BACKEND = path.join(ROOT, 'backend')
export const IS_WIN = process.platform === 'win32'

/** Python inside backend/.venv, or null if the environment has not been created yet. */
export function venvPython() {
  const p = IS_WIN
    ? path.join(BACKEND, '.venv', 'Scripts', 'python.exe')
    : path.join(BACKEND, '.venv', 'bin', 'python')
  return existsSync(p) ? p : null
}

export function fail(message) {
  console.error(`\n✖ ${message}\n`)
  process.exit(1)
}

/** [command, prefixArgs] for a system Python 3, or null. */
export function systemPython() {
  const candidates = IS_WIN ? [['py', ['-3']], ['python', []]] : [['python3', []], ['python', []]]
  for (const [cmd, pre] of candidates) {
    const r = spawnSync(cmd, [...pre, '--version'], { encoding: 'utf8' })
    if (r.status === 0) return [cmd, pre]
  }
  return null
}
