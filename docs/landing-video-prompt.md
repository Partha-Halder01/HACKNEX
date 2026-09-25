# Landing Page Scroll Video — Storyboard & Gemini (Veo) Prompts

The landing page is one long scroll-scrubbed film. Each Gemini clip shows one
stage of the project **visually, underwater**. The website then adds the
headings and explanations as HTML text (Bebas Neue + Montserrat, the dashboard fonts)
over the empty left side of each frame.

| # | Clip | Project stage it explains | Status |
|---|------|---------------------------|--------|
| 1 | Tree → dive into water (10s) | Hero / intro | ✅ Done (`gemini_generated_video_8a2eed7f.mp4`, used from 1.5s, after the labels fade) |
| 2 | Satellite scan beam (10s) | Sentinel-2 imagery + Random Forest 5-class classification | ✅ Done (`gemini_generated_video_d1ba5ad8.mp4` = clip 1 + clip 2 extended, 20s, seamless at 10s) |
| 3 | Roots grow & fade (8s) | Change detection 2020 → now (gain / loss) | ⏳ |
| 4 | Carbon sinks into seabed layers (8s) | IPCC Tier 1 blue carbon (AGB → BGB → SOC) | ⏳ |
| 5 | Particles form a delta map, rise to surface (8s) | Gemini AI insights + community reports → CTA | ⏳ |

## Rules for every clip (important)

**Best method: Gemini's "Extend" feature.** Clip 2 was made by extending clip 1,
so the result is one continuous 20s video with a perfect join. Keep doing this:
open the latest video in Gemini, choose Extend, and paste the next clip's
prompt. The final result is one ~40–50s video. If Extend isn't available, use
the starting-frame method below with `docs/clip2-last-frame.png`.

1. **Chain the clips.** For every clip, attach the **last frame of the previous
   clip** as the starting image. For clip 2, use `docs/clip1-last-frame.png`.
   To get a last frame from Gemini, pause the video at the very end and take a
   full-resolution screenshot, or send me the MP4 and I'll extract it.
2. 16:9, highest resolution. Generate 2–3 variations and pick the steadiest one.
3. Send me the original `.mp4` files unedited.
4. Never ask for words, numbers or letters. Veo writes misspelled text. All
   explanation text is added by the website.

---

## Clip 2 — "Eyes in orbit" (Sentinel-2 + AI classification)

```
Continue seamlessly from the provided starting frame: a calm underwater Sundarbans mangrove scene, emerald-teal water, stilt roots on the right side, dark seabed with faint cyan glowing specks. One continuous 8-second shot, 16:9, photorealistic, no cuts.

Far above, seen through the rippling water surface, a tiny bright satellite glints like a moving star. From it, a thin flat horizontal sheet of soft emerald-cyan scanning light slowly descends through the water from the top of the frame to the bottom, like a gentle laser scanner. Everywhere the scan line passes, the scene briefly turns into a glowing semi-transparent holographic pixel grid overlay: the mangrove roots light up as bright green pixel squares, the open water as deep blue pixel squares, the mud as sandy tan pixel squares, then the grid softly fades back into the realistic scene behind the line. Tiny floating square pixels drift like plankton.

The camera glides very slowly forward at constant speed. The roots stay on the right third of the frame; the left and center stay open, calm, dark emerald-teal water as clean negative space. The shot ends on a calm, still underwater frame with the pixel grid fully faded.

Style: photorealistic underwater cinematography mixed with subtle futuristic holographic data visualization, soft volumetric god rays, emerald #16865f, mint #a8efb5 and dark teal #041f1a palette, steady gimbal motion, 24fps.
Avoid: text, letters, numbers, labels, UI panels, logos, watermarks, people, divers, cuts, fades to black, camera shake, zooms, fast motion.
```

## Extend prompts (10s each, pasted into Gemini "Extend")

The video is currently 20s (clip 1 + clip 2). Each Extend adds 10s:
20s → 30s (clip 3) → 40s (clip 4) → 50s (clip 5).

### Clip 3 — Extend 20s → 30s: "Watching the forest change"

```
Extend this video by 10 seconds as one continuous shot from the exact last frame, same camera, same lighting, same underwater mangrove scene, no cuts.

Seconds 0–2: The water is calm and still after the scan; the camera keeps a very slow forward drift.
Seconds 2–8: A gentle underwater time-lapse of years passing. Light overhead softly pulses brighter and dimmer like passing seasons. New young stilt roots and small mangrove seedlings sprout from the seabed and grow downward, each outlined with a soft glowing bright green rim light (forest gain). On the far right edge, two or three old thin roots slowly turn a dim warm amber-red and dissolve into drifting particles (forest loss). Growth clearly dominates loss.
Seconds 8–10: The time-lapse stops; a denser, healthier root system stands calm and still.

Keep the roots on the right third of the frame; the left and center stay open, calm, dark emerald-teal water as negative space. Photorealistic, emerald, mint and dark teal palette with small amber accents, soft god rays, steady camera, 24fps.
Avoid: text, letters, numbers, labels, UI panels, logos, people, cuts, fades to black, camera shake, zooms, flickering, morphing shapes.
```

### Clip 4 — Extend 30s → 40s: "Counting blue carbon"

```
Extend this video by 10 seconds as one continuous shot from the exact last frame, same underwater mangrove scene, same lighting, no cuts.

Seconds 0–3: The camera slowly and smoothly descends straight down toward the seabed below the roots.
Seconds 3–5: The camera passes into the seabed, which opens into a clean cinematic cross-section cutaway of the mangrove soil, like a geological diagram come to life, with three horizontal layers: roots at the top, dense root-filled mud in the middle, deep dark organic sediment at the bottom.
Seconds 5–9: Thousands of tiny glowing cyan-blue carbon particles flow down from the roots like slow luminous rain and settle into the layers. The layers light up one after another, top to bottom, with a soft cyan-blue glow.
Seconds 9–10: The deepest layer is a rich, dense, shimmering band of stored blue carbon; the frame holds still.

The glow is brightest on the right; the left side stays darker and calmer as negative space. Photorealistic macro cinematography with subtle scientific visualization, deep dark teal #041f1a background, glowing cyan and emerald particles, soft bloom, steady constant-speed descent, 24fps.
Avoid: text, letters, numbers, labels, arrows, charts, UI panels, logos, people, cuts, fades to black, camera shake, zooms.
```

### Clip 5 — Extend 40s → 50s: "From data to people"

```
Extend this video by 10 seconds as one continuous shot from the exact last frame, no cuts.

Seconds 0–3: The glowing cyan and emerald carbon particles rise out of the sediment layers and swirl upward into the water.
Seconds 3–6: The particles gather into a floating translucent 3D holographic map of a river delta: branching glowing blue river channels between bright green mangrove islands, with a few soft pulsing points of light connected by thin light threads, like a neural network over the delta. The map floats center-right and slowly rotates.
Seconds 6–9: The camera rises smoothly upward past the map toward the bright water surface and sun rays.
Seconds 9–10: The camera gently breaks the surface into a warm golden sunrise over a vast, healthy green mangrove forest on a calm river, and holds.

Photorealistic underwater and nature cinematography with an elegant holographic data visualization, emerald, mint and cyan palette, warm golden light at the end, soft bloom, steady smooth motion, 24fps.
Avoid: text, letters, numbers, labels, UI panels, screens, logos, people, cuts, fades to black, camera shake, fast motion.
```


## Website text for each stage (added in code, not in the video)

| Clip | Heading (Bebas Neue) | Subtitle (Montserrat) |
|------|----------------------|-----------------------|
| 1 | SUNDARBAN BLUE CARBON | AI & satellite mangrove intelligence |
| 2 | EYES IN ORBIT | Sentinel-2 imagery → Random Forest: mangrove, water, aquaculture, bare land, vegetation |
| 3 | WATCHING THE FOREST CHANGE | Gross gain, loss and net change since 2020 |
| 4 | COUNTING BLUE CARBON | IPCC Tier 1: biomass + roots + soil carbon, ±18.3% uncertainty |
| 5 | FROM DATA TO PEOPLE | Gemini AI insights with hallucination checks, bilingual reports → Open dashboard |

## Integration plan

- The clips are joined, the Gemini sparkle watermark (bottom-right) is cropped
  out by a slight zoom, and the result is exported as WebP frames under
  `public/landing/frames/`.
- A sticky full-screen `<canvas>` draws the frame for the current scroll
  position. Each clip gets one scroll section, and its text animates in and
  out on the left side.
- Desktop-first. On mobile, a static frame is shown per section.
