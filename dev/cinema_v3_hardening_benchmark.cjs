// Existing 24 inputs and four repeats, with inclusive timing instrumentation.
// KAMEN_MATRIX_ROUND=1 reverses within-pair order without changing inputs.
'use strict';
process.env.KAMEN_MATRIX_PROFILE='1';
require('./cinema_v3_matrix_benchmark.cjs');
