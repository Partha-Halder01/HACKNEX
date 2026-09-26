// npm run frames — cut assets/landing/dive.mp4 into WebP frames for the scroll-driven landing page.
//   public/landing/frames/f0001.webp … + manifest.json
// Re-run whenever the video changes. Options: --width 1280 --quality 72
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import ffmpeg from 'ffmpeg-static'
import { ROOT, fail } from './lib.mjs'

const arg = (name, dflt) => {
  const i = process.argv.indexOf(`--${name}`)
  return i > -1 ? process.argv[i + 1] : dflt
}
const width = Number(arg('width', 1280))
const quality = Number(arg('quality', 72))
const src = path.join(ROOT, 'assets', 'landing', 'dive.mp4')
const out = path.join(ROOT, 'public', 'landing', 'frames')

if (!existsSync(src)) fail(`Video not found: ${src}`)
rmSync(out, { recursive: true, force: true })
mkdirSync(out, { recursive: true })

console.log(`Extracting frames (${width}px wide, WebP q${quality}) …`)
const r = spawnSync(
  ffmpeg,
  ['-hide_banner', '-loglevel', 'error', '-i', src, '-vf', `scale=${width}:-2:flags=lanczos`,
   '-c:v', 'libwebp', '-quality', String(quality), '-compression_level', '6', path.join(out, 'f%04d.webp')],
  { stdio: 'inherit' },
)
if (r.status !== 0) fail('ffmpeg failed')

const files = readdirSync(out).filter((f) => f.endsWith('.webp')).sort()
const bytes = files.reduce((s, f) => s + statSync(path.join(out, f)).size, 0)
const height = Math.round((width * 9) / 16)
writeFileSync(path.join(out, 'manifest.json'), JSON.stringify({ count: files.length, width, height, pattern: 'f{n}.webp', pad: 4 }, null, 2))
console.log(`✔ ${files.length} frames, ${(bytes / 1024 / 1024).toFixed(1)} MB total → public/landing/frames/`)
