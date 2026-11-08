# V2 cast resolution and furnace arena

This packet changes only `game/art/*.v2.png`, `game/scenery/furnace-v2.webp` and this directory. It does not integrate runtime references or change animation timing, geometry or state ordering.

The V2 cels are extracted directly from the original illustrated masters in `../generated/`. They have twice the native cell dimensions and source scale of V1. They are not enlargements of the previous runtime PNGs. Each actor uses one shared source scale. Grounded cels align their bottom alpha bounds with the existing relative ground pivot; airborne player cels 17, 22 and 23 retain twice the previous lift. The full silhouette is centered horizontally, as in V1. This is silhouette centering, not bone registration; pose changes intentionally move the torso within the cel.

| Actor | Cell | Frames | Pivot | Sheet |
| --- | --- | --- | --- | --- |
| player | 192 × 192 | 24 | 96, 176 | 4608 × 192 |
| foe | 144 × 144 | 6 | 72, 134 | 864 × 144 |
| boss | 288 × 288 | 8 | 144, 260 | 2304 × 288 |

Keep the original frame order and state indices. Relative pivots are unchanged. The consuming renderer must compensate for the 2× cell dimensions to preserve physical size; dividing each previous draw scale by two does that. Runtime integration belongs to the primary implementation packet.

`furnace-source.png` is the canonical original built-in `image_gen` output; `furnace-prompt.json` preserves its full prompt and origin. The new enclosed arena has a chained pouring crucible and hot back-wall furnace above an open, subdued floor. It is technically resized to 1920 × 1080 and encoded as WebP quality 94. The original generation was 1672 × 941, approximately 16:9.

Reproduce with the already available Python Pillow and NumPy packages:

```sh
python3 examples/ember-alley/art-source/polish/pack_v2.py
```

The packer asserts 38 unique images and 38 unique binary-alpha silhouettes across actors, isolated source components, complete cell padding, center alignment and exact ground alignment for each frame. `validation.json` contains bounds and hashes. `source-detail-comparison.png` compares V1 and V2 at the same enlarged display size; `scale-{idle,windup,contact}.png` uses the original physical actor footprint over the new environment. These are static technical composites, not browser gameplay evidence. Higher resolution improves painted detail; it does not add poses or establish motion quality.
