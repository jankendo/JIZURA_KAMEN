# KAMEN Custom Edition 2.0.13

This release fixes unbounded encoder/decoder waiting and input-insensitive photographic direction.

- Encoder queue drain and video/audio flush have elapsed-time watchdogs, including hidden tabs. Cancellation closes native encoders and cancels AAC/decode jobs; cleanup never waits for a stuck audio job. Video retains H.264, resolution, FPS and bitrate, using realtime latency to avoid prolonged buffering. The UI allows a bounded software video/AAC retry before the existing MP4 recorder fallback.
- The standard export improves a raster plan in at most two passes, then encodes once. Decoded MP4 validation, provenance and the original scoring remain mandatory. Low artistic scores are retained in QA; they do not trigger five full encodes. Explicit internal refinement tests still exercise restoration of the best artifact.
- Selected readable entrance/hold motions survive later photograph planning. Audio compatibility has 50% of the photographic style profile weighting, with image 18%, lyric 18%, direction 14%. Readability remains a hard eligibility gate. Layout and camera direction use measured energy, onset density, beat strength, tempo, timbre and section contrast. Saved measured selections include an audio signature; a changed input cannot reuse them. Same inputs remain deterministic, and manual/director choices remain authoritative.
- Background camera transitions are continuous at section boundaries. Calm music keeps a lower crop/motion budget. Sequential decoded-frame inspection reports actual progress and releases decoded frames.

## Verification

The full 166-test engine run completed with 163 passing, one obsolete assertion of `latencyMode=quality` failing, and two browser-only tests skipped. The assertion was updated to the intentional realtime configuration; the complete save/pipeline test then passed, comparing frame pixels, timestamps, keyframes, PCM, codec and bitrate. The encoder liveness and fallback cleanup tests also passed after the final changes. The aggregated executed checks therefore have no unresolved failure; browser tests remain unverified.

Fault injection covers hidden stalled queues, never-resolving video/native-audio flush, stalled WASM audio, cancellation during flush, recorder cancellation while animation frames are suspended, and resource cleanup. Standard export encodes once even when artistic scores are below target.

A same-background/same-lyrics test compared four synthetic music profiles. Acoustic selected gold/flow, percussion crimson/punch, rock caution/drive, and ambient gold/drift; layouts, hold motions and cameras differed, with original lyric text and measured eligibility retained. The measured registry selection test compared 24 styles / 748 catalogue entries with 1,112 rendered frames and 72 phrase/aspect samples.

The existing supplied 50.8-second source was rendered at 720p30 (1,524 frames), encoded to H.264/AAC with native Canvas + FFmpeg, inspected and decoded. Exported/source audio PCM hashes matched. This is a real native rendering/container smoke test, **not** browser WebCodecs verification. The native smoke test preceded the final camera-boundary continuity adjustment; that adjustment passed phrase/aspect and explicit boundary continuity tests.

Chrome/Edge browser executables and a supported cloud browser control skill were unavailable. No browser export, requested-face availability, aesthetic perfection or viral performance claim is made. Existing scoring thresholds were not reduced.
