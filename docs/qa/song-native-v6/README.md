# Acoustic Trajectory v6

The fetched main was f02e1e19bb666d8cad27c55ea2491192abd18509,
identical to the supplied baseline.

Source-level causes: v5 stops interpolation after the boundary transition;
its sampler spends the 64-frame budget on section boundaries before adding
lyric starts; its closing metric compares glyph occupancy changes against a
geometry-only target. Consequently a disappearing final lyric can be mistaken
for unwanted motion. The supplied 6/0 scores cannot be reproduced exactly
without that project's inputs and observation evidence.

v6 reuses the measured spectral timeline, v5 coordinate optimization, glyph
fitting, aspect-correct background crops, camera ablation and save machinery.
Locally significant multi-feature changes create C1 trajectory knots; measured
quiet sections hold. Bounded monotone DTW links corresponding internal times
without copying complete repeated compositions. Glyph groups (up to 6) and
image regions (up to 4) retain cost/readability limits. Region geometry also
uses the real source aspect ratio. No extra FFT or stored PCM/SSM is added.

Coverage selection reserves endpoints and the first in-range lyric, then
balances acoustic/rest/recurrence/lyric/interior/time coverage within 64 frames.
It does not change complete-LRC export checks. Endpoint metrics distinguish
occupancy, geometry, background movement and actual coverage. Missing evidence
stays UNMEASURED; measured static closure is permitted. Realization and raster
novelty are separate metrics; neither certifies audience or artistic quality.

Validation scope: four v6 synthetic/Canvas test groups, existing v3/v4/v5 fast
contracts, export UI, syntax, production build and brief Chromium UI generation,
quality, final-plan commit and restore. No full suite, MP4 encode, performance
comparison or human artistic evaluation. CI runs this bounded release path.
