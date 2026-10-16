# Final artifact repair checkpoint

Source: `9a1d1bd235e89d34f6b1e9336d661e3e27eb739d` (PR13, Draft). Main remains unchanged.

The post-final evaluator omitted its required lock signature. The fix preserves the original lock invariant and captures it before asynchronous snapshot generation. The real evaluator now has a mutation counterexample; the prior source aee6739 integration completed with both complete H.264/AAC artifacts and no history-binding errors.

Artifact-scoped unit IDs include planHash, so using them directly between policy-only plans prevented correspondence. A strict bijection now joins immutable source-unit, text/origin and exact fragment contracts. It does not reuse evidence by line number or replace original artifact IDs. Tests cover altered units, fragments, frame ownership and duplicates.

Retained source1088 MP4 observations show actual translation for development04, development11 and supplemental holdout13. The first two also regress existing composition measures and remain rejected. Development15 has no positive measured displacement. These observations are historical source-bound results, not certification of the final source.

Current exact-head MP4 integration passed: the continuity repair was accepted, 188/188 registered positive displacement points matched across 32 actual decoded frames, and baseline/repaired MP4s fully decoded with all 3 lyric units MEASURED. A separate licensed variable-font upload/static fallback browser export also fully decoded, with both formal-SKIP alternative wrappers PASS; variable-axis animation remains UNVERIFIED. Full exact-head CI and the three fixed preregistered input confirmations are running. Important non-primary effects and independent final-source improvements remain unverified; QUALITY_GO is not promoted. No main merge or deployment has been performed.
