# 솔바람 정찰대 · Fern scout

Original character drawn for this task on 2026-11-08. No proprietary sprite, downloaded reference, image-generation service, or third-party character design was used. Integer-grid polygons and pixel marks in `recipe.py` author the teal field cap and fern sprig, three-quarter gaze, copper scarf, fitted tunic, pouch, trousers and boots once into the single 96×96 transparent `master.png`.

The original artwork and recipe are offered under CC0-1.0 to the extent any rights exist. No trademark or third-party rights are granted. The shared renderer retains its repository's existing terms.

## Reproduce

From the workspace root:

```sh
assets/.venv/bin/python examples/rive-character/art/recipe.py
```

The recipe requires the existing Pillow environment and `assets/src/pixel_asset_pipeline/motion.py`. It writes only sibling `art/` and `poses/` files. `motion.request.json` is the normal producer input, with six core action overrides, named wave/cheer extras, `single_body:true`, master, pivot, masks and authored joint supports. Its `approved:true` admits this original synthetic working master to the producer; it records no claim of user art acceptance.

Eleven disjoint masks assign every visible master pixel once, including separate thighs/calves and upper arms/forearms. Three otherwise disconnected sleeve edge pixels are bound to the touching scarf. All pose PNGs use the shared `motion.render` implementation. There is no demo-only renderer and no independently drawn or retouched pose.

## Connected joints

Rigid disjoint cutouts exposed arm pixels that the scarf had originally hidden. This revision adds explicit `joint_underlap` capsules behind the cutouts. Their endpoints follow the parent and child transforms. Interior and edge colors are sampled from declared visible pixels belonging to those original adjacent parts. The inverse capsule mapping clips the patch to existing master alpha at rest; a global rigid pose adds no support. This is authored palette-sampled seam support, not recovery of unseen anatomy or pixels.

Walking and running use twelve poses per cycle. Knees lift on their own side; counter-rotating calves keep the boots under the same hips. The stance boot contact determines the baseline. Running adds a small forward lean, bent opposing arms and short flight. Jump has a compressed grounded landing and two recovery steps. The frontal rig supports an in-place jog; it does not supply a side-view sprint.

## Evidence and limits

`poses/animations.json` is the requested self-contained contract: eight actions, 74 frames, paths relative to `poses/`, exact durations and loop flags. GIFs enlarge those same PNGs 4× on a dark background; GIF timing is rounded, so JSON is authoritative.

Recipe assertions verify disjoint ownership, exact neutral reconstruction, original palette preservation, zero clipped pixels, and exactly one eight-connected foreground component in every pose, including formerly detached attack and waving forearms. `inspection.json` also reports four-connected component sizes, named joint-region metrics, anchors and shoe contact coordinates for every frame. Tiny diagonal fern/rotated-edge connections can be separate under four-neighbor connectivity; this is distinct from detached eight-connected body islands.

Viewed directly: native/enlarged master, full pose montage, and enlarged critical poses. Timed runtime review and engine/export validation are separately owned by the primary session. Structural checks do not constitute user art acceptance. No claim of production art quality is made solely from connectedness or palette checks.
