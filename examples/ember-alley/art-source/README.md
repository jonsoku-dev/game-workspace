# Ember Alley cast artwork

The runtime sheets are original hand-painted-style artwork produced with the built-in `image_gen` tool, then technically isolated and packed with `pack_cast.py`. No provisional procedural cast frames remain. `generated/prompts.json` contains the exact prompts. The environment is owned separately in `environment.json`.

Canonical generated sources (copied from `~/.codex/generated_images/01a1bd3a-ee07-7e61-9153-aefd35303500/`):

| Source | Tool output | Runtime frames |
| --- | --- | --- |
| `generated/player-a.png` | `exec-469fb6f0-1889-4317-b2d1-2247019c5c9e.png` | player 0–11 |
| `generated/player-b.png` | `exec-6a2f3fb3-f50f-4bc5-8178-f74bb6adcf70.png` | player 12–23; first sheet used as identity reference |
| `generated/foe.png` | `exec-2d421a7b-4c55-4d76-ad79-3cf18cd188e0.png` | foe 0–5; alpha refinement of `exec-bb2510fe-aa87-48de-8f68-79504d524e9d.png` |
| `generated/boss.png` | `exec-cb1c36d6-10c2-4a24-90d7-5b479407ae20.png` | boss 0–7 |

Rebuild from the workspace root:

```sh
python3 examples/ember-alley/art-source/pack_cast.py
```

Requires the existing Pillow and NumPy Python packages. It extracts true-alpha connected components rather than blindly slicing a generated grid, removes detached alpha haze, and downsamples original painted pixels with Lanczos. One constant scale per character preserves anatomy proportions across cels. All grounded frames share their atlas ground line; airborne player cels keep 7 pixels of lift. Horizontal silhouette centering lets long lunges remain completely inside the existing atlas dimensions. Atlas paths, frame dimensions, pivots, ordering and state arrays are unchanged.

`validation.json` records exact source and packed bounds, uniqueness and clipping checks. `contact-sheet.png` shows all cels at native atlas resolution; `*-motion.gif` shows selected sequences. `runtime-scale-{idle,windup,contact}.png` are static compositing checks against the actual furnace background at the exact renderer scales (1.55 player, 1.8 foe, 1.45 boss), not browser gameplay evidence.

Visually reviewed: expressive open-faced hero; articulated strides, coiled windup, extended contact and low recovery; visibly different purple masked raider; broad chained golem with overhead white-core tell, low slam and recovery. All 38 runtime frames are distinct. The small foe atlas necessarily carries less painted detail than its source; visual rhythm and frame timing still need browser gameplay acceptance by the primary session.
