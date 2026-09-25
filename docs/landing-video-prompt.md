# Landing Page Scroll Video — Gemini (Veo) Prompt

The landing page's scroll animation is built from this clip. As the visitor
scrolls, the video is scrubbed frame by frame: hero mangrove tree → camera
sinks through the waterline → the underwater scene becomes the backdrop for
the project explanation.

## How to generate

1. Open Gemini → Video (Veo).
2. **Attach the reference mangrove image as the starting frame** (image-to-video).
   Frame 1 of the video then matches the hero exactly, so the switch from the
   static hero to the scrolling video is seamless.
3. Paste the **Main prompt** below. Choose **16:9, 1080p (or the highest
   available), no audio needed**.
4. Generate 2–3 variations and pick the one with the **smoothest, steadiest
   camera and no cuts**.
5. Send back the original `.mp4` (do not re-compress it or trim it in a phone editor).

---

## Main prompt (paste this)

```
A single continuous 10-second cinematic shot, 16:9, photorealistic, National Geographic quality, no cuts, no transitions, no text, no logos, no watermarks, no people.

OPENING FRAME (0–2s): A split-level half-above / half-below water view of a single majestic Sundarbans mangrove tree standing in a calm tidal estuary at golden hour. Above the waterline: a wide dense green canopy, arching stilt roots entering the water, a distant mangrove forest shoreline, soft warm sunlight and a pale blue sky with light clouds. Below the waterline: crystal-clear emerald-teal water, a tangle of underwater prop roots, small silver fish, and dark organic seabed sediment. The waterline sits exactly at the vertical middle of the frame. The camera is almost still, with only a very slight forward drift.

THE DIVE (2–6s): The camera slowly and smoothly sinks straight down along the trunk. The waterline rises up through the frame and passes the lens with a gentle, clean meniscus ripple and a few tiny bubbles, then the camera is fully underwater. Sun rays (god rays) pierce the water surface from above. The movement is one steady, constant-speed vertical descent — no shaking, no zooming, no rotation, no speed ramps.

UNDERWATER (6–10s): The camera keeps descending slowly, moving past the thick stilt roots toward the seabed. Tiny glowing particles of carbon drift in the water — soft cyan and warm amber specks, like floating dissolved and particulate organic carbon. At the seabed, dark layered sediment glows faintly with deep blue-cyan points of light, suggesting stored blue carbon locked in the soil. The mangrove roots stay on the right third of the frame; the left and center of the frame become open, calm, deep emerald-to-dark-teal water with soft light, leaving clean empty negative space. The final frame is still and peaceful, deep dark green-teal (#041f1a to #0b4a36 tones), suitable as a background for overlaid text.

STYLE: Ultra-detailed, natural colors, emerald and teal underwater palette, warm golden-hour light above water, shallow haze underwater, soft volumetric light, gentle caustics on the roots, realistic water physics, smooth 24fps motion, steady gimbal camera, no motion blur smearing, high dynamic range, crisp focus throughout.

AVOID: text, captions, labels, subtitles, logos, watermarks, people, boats, cartoon style, fast camera moves, camera shake, cuts, fades to black, zooms, time-lapse, flickering, distorted fish, morphing roots.
```

### Why "no text" in the video

The title, labels and project explanation will be rendered by the website
itself as crisp HTML text in the dashboard fonts, animated in sync with scroll.
AI-generated text in video is usually misspelled and blurry, can't be
translated (EN/BN), and can't be read by judges on a large screen. So the video
is a clean backdrop and the text lives in code.

---

## Optional: if you want Gemini to render text anyway

Append this to the end of the main prompt. The fonts match the dashboard
(`src/index.css`: `--font-condensed` = Bebas Neue, `--font-subtitle` = Montserrat).

```
TEXT (only in the final 2 seconds, fading in gently on the left side of the frame over the open dark water):
- Headline in a tall condensed bold all-caps sans-serif typeface exactly like "Bebas Neue", pure white, wide letter spacing: "SUNDARBAN BLUE CARBON"
- Below it, a small thin light-weight all-caps sans-serif subtitle exactly like "Montserrat ExtraLight", very wide letter spacing, soft mint green (#a8efb5): "AI & SATELLITE MANGROVE INTELLIGENCE"
Text must be perfectly spelled, sharp, flat 2D, not warped, not moving with the water.
```

---

## Optional second clip (only if the 10s clip feels too short)

Use the **last frame of clip 1** as the starting frame:

```
A continuous 8-second shot, 16:9, photorealistic, no cuts, no text. Starting underwater in calm deep emerald-teal water beside mangrove stilt roots on the right side of the frame. The camera slowly glides forward and slightly down along the dark seabed. The layered sediment glows with faint cyan-blue points of light (stored blue carbon), and tiny cyan and amber particles drift slowly upward. Soft god rays from above. The left and center of the frame stay open, dark and calm (#041f1a to #0b4a36) as negative space for text overlays. Steady constant-speed gimbal motion, no zoom, no shake, no fades. Ends on a still, peaceful, dark underwater frame.
```

---

## What happens after the video is delivered

1. The MP4 is split into ~120–240 WebP frames with `ffmpeg` (1920px wide,
   compressed) and stored under `public/landing/frames/`.
2. A sticky full-screen `<canvas>` on the landing page draws the frame matching
   the current scroll position (preloaded, `requestAnimationFrame`, so it plays
   smoothly forward and backward).
3. Scroll stages layered on top, in the dashboard fonts:
   - **Hero** (frame 1): "SUNDARBAN BLUE CARBON" (Bebas Neue) + Montserrat subtitle + CTA to `/dashboard`.
   - **Dive** (waterline passes): hero text fades out.
   - **Underwater**: project explanation cards appear one by one over the dark
     left-side water — Sentinel-2 imagery → Random Forest classification →
     change detection → IPCC Tier 1 carbon accounting → Gemini AI insights →
     bilingual community reports.
4. Desktop-first layout; on mobile it falls back to a static poster frame.
