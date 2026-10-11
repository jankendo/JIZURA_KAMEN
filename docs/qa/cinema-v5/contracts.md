# Cinema V5 contracts (implementation in progress)

Baseline: `5ea7d953f1720654521a2cd9d800706d40f40c49`. Historical V4 results are not V5 verification.

Safety is checked before creative selection. Input/lock identity, registered decoded lyric presence and original strings, lyric timeline, technical MP4 structure/audio/endpoints, raster protection and measured readability cannot be traded for novelty. Unknown evidence remains null and excludes certification. A failed first artifact is rejected; a failed repair retains the previous artifact.

The old universal >=90 no-decrease rule is replaced for **non-safety** creative observations only. The versioned provisional policy permits at most two score points (0.02 for normalized indices), requires compatible method/profile/input/renderer/sample count/confidence/affected lines, and positive weighted utility >0.25 for repair acceptance. Pareto dominance precedes utility; measured cost is only a tie-breaker. The weights and physical indices are not human-calibrated and cannot certify artistic quality. Missing dimensions retain disclosed weight and aggregate UNMEASURED status.

The shared lyric layout preserves the original string, explicit newlines and grapheme clusters. Natural boundaries are linguistic heuristics, not a semantic or sung-syllable model. Canvas font measurements and unknown fallback widths are distinguished. Manual breaks are retained.

Decoded frame timestamps are authoritative. Seeking requested times do not certify timing. Temporal distribution, background structure excluding registered primary glyph tiles, operator-specific foreground geometry, and musical event matching are separate evidence. Decorations/subjects without verified segmentation and convergence without element tracking stay UNMEASURED. A general full-frame difference cannot prove impact.

Music-driven direction uses measured section context and confidence rather than assigning intro/climax/outro by row number. Existing non-image paths, locked settings and retained legacy finalists remain protected. Automatic edge regions cannot be represented as verified subject/depth layers. Repair budgets and mathematical-equivalence caches are unchanged.

Release remains blocked until fresh regression, real browser export and comparable completed MP4 quality evidence support TECHNICAL_GO and QUALITY_GO. Independent human evaluation is HUMAN_UNVERIFIED; no artistic 100 claim.

The sequential decoder calls `onSample(requestedTime, pixels, {timestamp,duration})`. V5 uses the third argument for actual time and retains the first as requestedTime. The existing sequential decoder contract now checks both clocks separately; all closure/disposal/count/abort assertions remain. Pre-correction smoke runs are superseded, not final quality evidence.

Text segmentation reuses native Segmenter instances and bounded immutable Unicode results. Returned arrays are owned by the caller. This cache has no renderer/pixel/font/evidence state; environment and native-constructor changes invalidate the relevant results.

Semantic layout measures both full-string font width and the actual per-cluster advance geometry used by the renderer. A protected long word may shrink to the existing native fitting size before any illegal split; an explicitly supplied minimum remains respected. Japanese postpositions attach to their preceding word rather than starting a new row. Glyph coverage and human judgement remain separate unmeasured evidence.
