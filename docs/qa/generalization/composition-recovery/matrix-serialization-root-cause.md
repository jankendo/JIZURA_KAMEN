# Completed MP4 matrix serialization failure

Frozen source: `5c92e27e6216962d09ec73927fd0df6ce50d0560`. Run: https://github.com/jankendo/JIZURA_KAMEN/actions/runs/38675390891.

The holdout-c partition finished holdout-14 export and logged PASS, then the harness failed while serializing the accumulating, heavily duplicated trace object with `JSON.stringify`: `RangeError: Invalid string length`. This is a harness evidence-write failure, not an application rendering failure. The MP4 and reference were written earlier and are preserved, as are the failure log and the earlier three completed rows. The holdout-14 evaluation object was not durably written; its scores and final verification must remain UNVERIFIED. Holdout-15 had not started.

The evidence-only harness now serializes bounded JSON tokens to a temporary file, fsyncs it and atomically renames it. It writes an independent per-case row before the cumulative report. Reference output uses the same writer. Serialization failure leaves the existing report untouched. No input fixture, app source, output profile, candidate rule or quality threshold changed.

Focused tests compare exact JSON bytes for 72 standard serialization cases, including sparse arrays, undefined, nonfinite numbers, typed arrays, toJSON, surrogate boundaries and shared references; BigInt and cycles reject. A 24 MiB multi-string object matches the standard serializer byte-for-byte. A failed atomic write preserves the previous JSON. This test avoids allocating an artificial 512 MiB full string; the writer itself never builds one.

Recovery workflow runs holdout-14 and holdout-15 as separate one-case jobs against the same frozen app commit and original preregistration. Existing successful cases and all failed evidence remain intact. The original holdout-14 movie remains separate from the new replay and must not be relabelled as a quality-certified result.
