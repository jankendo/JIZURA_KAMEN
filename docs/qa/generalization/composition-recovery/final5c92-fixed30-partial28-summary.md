# Frozen 5c92 partial fixed30 comparison

PARTIAL 28/30 only; not a final30 statistic or QUALITY_GO. Source 5c92 frozen, old app exports unchanged. Artistic calibration/HUMAN_UNVERIFIED.

28 quality-bound completed rows; holdout-14 completed MP4 decodes but its unsaved evaluation remains UNVERIFIED; holdout-15 was not executed. The recovery workflow only reruns these two cases.

| Fixture | main typography | previous5e typography | current typography | Previous/current conditions | FAV |
|---|---:|---:|---:|---|---|
| development-01 | 37 | 29 | 29 | NONMATCHED_OR_CONFOUNDED | MEASURED |
| development-02 | 34 | 51 | 37 | NONMATCHED_OR_CONFOUNDED | MEASURED |
| development-03 | 100 | 72 | 24 | NONMATCHED_OR_CONFOUNDED | MEASURED |
| development-04 | 13 | 78 | 79 | NONMATCHED_OR_CONFOUNDED | MEASURED |
| development-05 | 67 | 37 | 42 | NONMATCHED_OR_CONFOUNDED | MEASURED |
| development-06 | 41 | 30 | 30 | MATCHED | MEASURED |
| development-07 | 29 | 31 | 31 | MATCHED | MEASURED |
| development-08 | 27 | 25 | 25 | MATCHED | MEASURED |
| development-09 | 64 | 51 | 57 | MATCHED | MEASURED |
| development-10 | 25 | 67 | 67 | MATCHED | MEASURED |
| development-11 | 20 | 17 | 72 | NONMATCHED_OR_CONFOUNDED | MEASURED |
| development-12 | 23 | 23 | 23 | NONMATCHED_OR_CONFOUNDED | MEASURED |
| development-14 | 36 | 49 | 53 | NONMATCHED_OR_CONFOUNDED | MEASURED |
| development-15 | 54 | 49 | 29 | NONMATCHED_OR_CONFOUNDED | MEASURED |
| holdout-01 | 61 | 6 | 63 | NONMATCHED_OR_CONFOUNDED | MEASURED |
| holdout-02 | 84 | 79 | 99 | NONMATCHED_OR_CONFOUNDED | MEASURED |
| holdout-03 | 47 | 42 | 61 | NONMATCHED_OR_CONFOUNDED | MEASURED |
| holdout-04 | 46 | 60 | 60 | NONMATCHED_OR_CONFOUNDED | MEASURED |
| holdout-05 | 19 | 19 | 19 | NONMATCHED_OR_CONFOUNDED | MEASURED |
| holdout-06 | 31 | 31 | 31 | MATCHED | MEASURED |
| holdout-07 | 74 | 69 | 69 | MATCHED | MEASURED |
| holdout-08 | 35 | 43 | 43 | MATCHED | MEASURED |
| holdout-09 | 39 | 77 | 77 | MATCHED | MEASURED |
| holdout-10 | 23 | 28 | 28 | MATCHED | MEASURED |
| holdout-11 | 32 | 29 | 29 | NONMATCHED_OR_CONFOUNDED | MEASURED |
| holdout-12 | 64 | 33 | 57 | NONMATCHED_OR_CONFOUNDED | MEASURED |
| supplemental-development-13 | 23 | 21 | 21 | NONMATCHED_OR_CONFOUNDED | MEASURED |
| supplemental-holdout-13 | 23 | 36 | 83 | NONMATCHED_OR_CONFOUNDED | MEASURED |

Statistics apply only to these 28 conditions; missing data are not zeros and must not be reported as the final30 lower tail. PCM differences are retained as confounding even when source WAV/profile are identical. Raw metrics are engineering observations, not artistic certification.

{"previous5eCovered28": {"n": 28, "mean": 42.214285714285715, "worst": 6, "lower20Mean": 18.5}, "currentCovered28": {"n": 28, "mean": 47.785714285714285, "worst": 19, "lower20Mean": 23.333333333333332}, "mainCovered28": {"n": 28, "mean": 41.82142857142857, "worst": 13, "lower20Mean": 20.166666666666668}, "pairedMeasured": 28, "improved": 10, "same": 15, "lower": 3}

Strict PCM/profile/input matched subset: 10 conditions, typography 1 improved / 9 equal / 0 lower (mean45.2→45.8; lower20 unchanged26.5). The other18 share the source WAV but differ in decoded PCM, so the raw28 statistics are descriptive and cannot alone establish causal algorithm improvement.

Matched development09 improves typography51→57, foreground81→89, temporal9→20 while hook64→38 and perceptual100→97 decline. Matched holdout08 changes foreground100→97, temporal37→16 and motion41→25.5 while localContrast80→99 and hook57→68 improve. These tradeoffs require actual-film diagnosis; no threshold or coefficient was changed.
