# Cinema V5 release review

Source: 96727adccdffefdef595dc96e4e29eb383d02fca. All observations are automated or Codex technical inspection; no real expert or independent human aesthetic review is claimed.

The newly executed baseline is 187 PASS, 0 FAIL, 2 environment SKIP. It coincides numerically with historical V4 counts but is a separate fresh run. The final-source comparison contains eight paired owned synthetic fixtures, three aspects, 24 fps, no/single/multiple images, manual settings, and a 12-second portrait SNS output. Six measured readability proxies are unchanged; two are unmeasured. This is preservation evidence for the measured scope, not proof of broad aesthetic improvement. Three pairs have identical RGB frames; changed pixels in the other pairs establish neither improvement nor regression.

QUALITY_GO remains UNVERIFIED: decoded operator-intent realization is unmeasured on all eight final fixtures; mandatory lyric coverage is unavailable on no-image, multi-image legacy, and split-manual paths. The split-manual false timing rejection was fixed and the real same-condition export now succeeds. The legacy observer's zero on manual fragmented lyrics is not sufficient evidence of permanent missing text. Existing creative thresholds were not relaxed. Unknowns remain null.

Human calibration, semantic interpretation, subject/depth separation, sung-syllable timing, and diverse real-song aesthetic improvement remain unverified. No 90/100 certification is made. Missing human ratings alone and slow generation alone are not release blockers; the missing safety/physical quality evidence and unconfirmed requested improvement are material blockers.

The formal UI test at 531eaa7 passed, including one-click below-target save, project restore, actual encoder cancellation/retry, corruption rejection and H264/AAC full decode. The only subsequent runtime change corrects phrase onset validation. A fresh formal UI and immutable exact-HEAD CI are running at 96727ad. Earlier 600-second timeouts and failed trials remain recorded, rather than rewritten as successful tests.

Performance is descriptive: eight fixtures with varying shared host load, not the historical 22-material cohort; source segmentation reuse was measured separately from end-to-end rendering. Post-export JS heap and late-sampled process RSS are not a whole-run peak-memory claim.

Production is unchanged at 5ea7d953f1720654521a2cd9d800706d40f40c49. HTTPS-delivered HTML matches the baseline build hash. This is artifact integrity, not a V5 production browser-E2E PASS.

## Recovery

Source and evidence are on separate GitHub branches. The incremental source bundle requires baseline 5ea7d953f1720654521a2cd9d800706d40f40c49. Concatenate final-real-evidence.tar.gz.part-00 and part-01, verify final-evidence-sha256.txt, then unpack to inspect raw videos, fixtures, actual-clock framehashes, decoded frames, UI reports and the unanswered A/B rubric. Superseded and rejected trials are kept separately. No force push, destructive reset, clean, or production change was used.
