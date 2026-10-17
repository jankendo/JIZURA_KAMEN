'use strict';
// QA-only replay of an actual artifact's measured cache. Never substitutes pixels.
// Caller must authenticate original artifact bytes and retain exact Native equality.
function restoreMeasuredCompositionCache(J, plan, {binding, actualPlanHash, build, inputHash, photoComposition}) {
  const reject = code => { throw new Error(code); };
  if (!binding || !build || build.sourceDirty !== false || binding.sourceCommit !== build.sourceCommit || binding.sourceTreeSHA256 !== build.sourceTreeSHA256 || binding.rendererVersion !== build.sourceTreeSHA256) reject('STALE_COMPOSITION_RENDERER');
  if (!actualPlanHash || binding.planHash !== actualPlanHash) reject('STALE_COMPOSITION_PLAN');
  if (!inputHash || binding.inputHash !== inputHash) reject('STALE_COMPOSITION_INPUT');
  if (!photoComposition || photoComposition.algorithm !== plan.photoCompositionAlgorithm || !Array.isArray(photoComposition.scenes)) reject('ORIGINAL_COMPOSITION_MISSING');
  const scenes = photoComposition.scenes;
  for (const s of scenes) if (![s.from,s.to,s.scrim,s.p90].every(Number.isFinite) || s.from >= s.to || s.scrim < 0 || s.scrim > 1 || !s.box || ![s.box.x0,s.box.x1,s.box.y0,s.box.y1].every(Number.isFinite)) reject('INVALID_ORIGINAL_COMPOSITION');
  const state = J.getPhotoCompositionStatus?.(plan);
  if (!state || !Array.isArray(state.scenes)) reject('COMPOSITION_CACHE_NOT_INITIALIZED');
  const before = JSON.parse(JSON.stringify(state.scenes));
  state.scenes = JSON.parse(JSON.stringify(scenes));
  return {domain:'ACTUAL_MEASURED_RENDERER_CACHE_RESTORE',before,restored:JSON.parse(JSON.stringify(state.scenes)),method:'Immutable original artifact provenance; normal renderer draws all output pixels; exact adopted Native SHA comparison remains mandatory',encodedEffectRealization:'UNMEASURED'};
}
module.exports = {restoreMeasuredCompositionCache};
