// npm start — run backend and frontend together in one terminal. Ctrl+C stops both.
import { spawn } from 'node:child_process'
import { IS_WIN, ROOT } from './lib.mjs'

const npm = IS_WIN ? 'npm.cmd' : 'npm'
const procs = [
  { name: 'backend ', color: '\x1b[36m', args: ['run', 'backend'] },
  { name: 'frontend', color: '\x1b[35m', args: ['run', 'frontend'] },
].map(({ name, color, args }) => {
  // shell:true is needed on Windows to launch npm.cmd (Node refuses .cmd without it).
  const child = spawn(npm, args, { cwd: ROOT, shell: IS_WIN, env: { ...process.env, FORCE_COLOR: '1' } })
  const prefix = `${color}[${name}]\x1b[0m `
  const pipe = (stream, out) => {
    let buf = ''
    stream.on('data', (d) => {
      buf += d.toString()
      const lines = buf.split(/\r?\n/)
      buf = lines.pop()
      for (const line of lines) out.write(prefix + line + '\n')
    })
  }
  pipe(child.stdout, process.stdout)
  pipe(child.stderr, process.stderr)
  return child
})

console.log('▶ Starting backend (http://localhost:8000) and frontend (http://localhost:5173/dashboard) — Ctrl+C to stop')

let stopping = false
function stopAll(code = 0) {
  if (stopping) return
  stopping = true
  for (const p of procs) {
    if (p.exitCode === null) {
      // On Windows, kill the whole process tree (npm → node/python children).
      if (IS_WIN) spawn('taskkill', ['/pid', String(p.pid), '/T', '/F'], { stdio: 'ignore' })
      else p.kill('SIGTERM')
    }
  }
  setTimeout(() => process.exit(code), 500)
}
for (const p of procs) p.on('exit', (code) => stopAll(code ?? 0))
process.on('SIGINT', () => stopAll(0))
process.on('SIGTERM', () => stopAll(0))
