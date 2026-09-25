# Landing Page Scroll Video — Storyboard & Gemini (Veo) Prompts

The landing page is one long scroll-scrubbed film. Each Gemini clip shows one
stage of the project **visually, underwater**. The website then adds the
headings and explanations as HTML text (Bebas Neue + Montserrat, the dashboard fonts)
over the empty left side of each frame.

| # | Clip | Project stage it explains | Status |
|---|------|---------------------------|--------|
| 1 | Tree → dive into water (10s) | Hero / intro | ✅ Done (`gemini_generated_video_8a2eed7f.mp4`, used from 1.5s, after the labels fade) |
| 2 | Satellite scan beam (8s) | Sentinel-2 imagery + Random Forest 5-class classification | ⏳ |
| 3 | Roots grow & fade (8s) | Change detection 2020 → now (gain / loss) | ⏳ |
| 4 | Carbon sinks into seabed layers (8s) | IPCC Tier 1 blue carbon (AGB → BGB → SOC) | ⏳ |
| 5 | Particles form a delta map, rise to surface (8s) | Gemini AI insights + community reports → CTA | ⏳ |

## Rules for every clip (important)

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

## Clip 3 — "Watching the forest change" (change detection)

```
Continue seamlessly from the provided starting frame: a calm underwater Sundarbans mangrove scene, emerald-teal water, stilt roots on the right side, dark seabed. One continuous 8-second shot, 16:9, photorealistic, no cuts.

A gentle underwater time-lapse of years passing: soft light cycles overhead, and the mangrove root system visibly grows. New young stilt roots and small mangrove seedlings sprout from the seabed and extend downward, each outlined with a soft glowing bright green rim light (forest gain). On the far right edge, a few old thin roots slowly fade to a dim warm amber-red glow and gently dissolve into drifting particles (forest loss). The growth clearly dominates the loss.

The camera stays almost still, with only a very slow forward drift. The left and center of the frame stay open, calm, dark emerald-teal water as clean negative space. Ends on a calm still frame of a denser, healthier root system.

Style: photorealistic nature documentary time-lapse, soft volumetric god rays, emerald, mint green and dark teal palette with small warm amber accents, steady camera, 24fps.
Avoid: text, letters, numbers, labels, UI panels, logos, watermarks, people, cuts, fades to black, camera shake, zooms, flickering, morphing distorted shapes.
```

## Clip 4 — "Counting blue carbon" (IPCC carbon accounting)

```
Continue seamlessly from the provided starting frame: a calm underwater Sundarbans mangrove scene, emerald-teal water, stilt roots on the right side, dark seabed. One continuous 8-second shot, 16:9, photorealistic, no cuts.

The camera slowly and smoothly descends straight down into the seabed, which opens into a clean cinematic cross-section cutaway of the mangrove soil, like a geological diagram come to life. Three horizontal layers are visible: the roots at the top, dense root-filled mud in the middle, and deep dark organic sediment at the bottom. Thousands of tiny glowing cyan-blue carbon particles flow down from the roots like slow luminous rain and settle into the layers. The layers light up one after another from top to bottom with a soft cyan-blue glow, and the deepest layer ends as a rich, dense, shimmering band of stored blue carbon.

The layers span the full width, but the glow is brightest on the right; the left side stays darker and calmer as negative space. Ends on a still, glowing cross-section frame.

Style: photorealistic macro cinematography mixed with subtle scientific visualization, deep dark teal #041f1a background, glowing cyan and emerald particles, soft bloom, steady constant-speed descent, 24fps.
Avoid: text, letters, numbers, labels, arrows, charts, UI panels, logos, watermarks, people, cuts, fades to black, camera shake, zooms.
```

## Clip 5 — "From data to people" (Gemini AI insights → community)

```
Continue seamlessly from the provided starting frame: a dark underground cross-section of mangrove soil glowing with cyan-blue carbon particles. One continuous 8-second shot, 16:9, photorealistic, no cuts.

The glowing cyan and emerald particles rise out of the sediment and swirl together into the water, gathering into a floating translucent 3D holographic map of a river delta: branching glowing blue river channels between bright green mangrove islands, with a few soft pulsing points of light connected by thin light threads, like a neural network over the delta. The holographic map floats in the center-right of the frame and slowly rotates. The camera then rises upward past the map toward the bright water surface with sun rays, and in the final second gently breaks the surface into a warm golden sunrise over a vast, healthy green mangrove forest on a calm river.

Style: photorealistic underwater and nature cinematography mixed with an elegant holographic data visualization, emerald, mint and cyan palette, warm golden light at the end, soft bloom, steady smooth upward motion, 24fps.
Avoid: text, letters, numbers, labels, UI panels, screens, logos, watermarks, people, cuts, fades to black, camera shake, fast motion.
```

---

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
