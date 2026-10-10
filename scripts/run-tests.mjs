import { writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tests = [
  'audio_persistence_test.js', 'auto_direction_diversity_test.js', 'auto_direction_lrc_test.js',
  'background_test.js', 'chant_mode_test.js', 'direction_quality_test.js', 'diversity_audit_test.js',
  'export_fallback_cleanup_test.js', 'export_validation_test.js', 'image_palette_test.js',
  'motion_dna_test.js', 'product_phase2_test.js', 'upstream_export_regression_test.js',
  'stability_2_test.js',
  'style_reachability_test.js','style_dead_zone_test.js','style_selection_test.js','style_realization_test.js','style_palette_fusion_test.js','style_typography_test.js','direction_reality_test.js','camera_safe_area_test.js','repetition_development_test.js','title_readability_test.js','quality_score_v2_test.js','candidate_style_competition_test.js','auto_reoptimization_v2_test.js',
  'hook_engine_test.js','visual_energy_density_test.js','repetition_hype_progression_test.js','kinetic_tokenization_test.js','scroll_stop_score_test.js','social_hook_generation_test.js','hype_readability_balance_test.js',
  'quality_domain_split_test.js','visual_stagnation_test.js','perceptual_novelty_test.js','style_arc_test.js','style_transition_coherence_test.js','multi_style_realization_test.js','registry_hyper_palette_test.js','attention_budget_test.js','layer_depth_test.js','section_contrast_test.js','climax_impact_test.js','social_hook_reedit_test.js','director_json_schema_test.js','director_json_invalid_id_test.js','director_json_roundtrip_test.js','typography_token_test.js','director_plan_reality_test.js','director_v2_schema_test.js',
  'vertical_safe_area_test.js','lyric_presence_test.js','layout_raster_matrix_test.js',
  'vertical_raster_test.js','vertical_motion_test.js','vertical_all_layouts_test.js','lyric_partial_clip_test.js',
  'scene_arc_test.js','background_variant_test.js','style_arc_visual_test.js','foreground_novelty_test.js',
  'typography_v4_test.js','attention_budget_layer_test.js','pattern_interrupt_test.js','social_hype_9x16_test.js',
  'director_multiwindow_test.js','director_reality_test.js','director_pack_test.js',
];
tests.push('musical_section_test.js','section_boundary_snap_test.js','beat_salience_test.js','visual_hit_alignment_test.js','scene_distinctness_test.js','motif_arc_test.js','motif_fatigue_test.js','typography_v5_test.js','variable_font_fallback_test.js','portrait_layout_resolver_test.js','social_hype_v3_test.js','social_loop_test.js','credit_choreography_test.js','director_context_v3_test.js','director_macro_section_test.js','director_candidate_tournament_test.js','foreground_channels_test.js','pro_asset_deck_test.js','clean_backup_restore_test.js');
tests.push('event_realization_test.js','strong_event_repair_test.js','musical_salience_alignment_test.js','semantic_direction_test.js','visual_verb_resolver_test.js','visual_world_distinctness_test.js','motif_physics_test.js','motif_development_test.js','director_context_v4_test.js','director_revision_pack_test.js','director_revision_roundtrip_test.js','director_tournament_test.js','portrait_saliency_test.js','social_subject_avoidance_test.js','variable_font_browser_test.js','browser_export_e2e_test.js','export_certification_test.js');
tests.push('observer_visual_peak_test.js','event_target_type_test.js','observed_hit_alignment_test.js','visual_world_intelligence_test.js','world_distance_realization_test.js','motif_physics_v2_test.js','motif_reality_test.js','semantic_reality_test.js','semantic_verb_family_test.js','typography_semantic_motion_test.js','audience_impact_test.js','climax_dominance_test.js','negative_space_test.js','repetition_intelligence_test.js','layout_fatigue_v2_test.js','director_context_v5_test.js','director_revision_v2_test.js','director_observer_tournament_test.js','social_director_v5_test.js','adaptive_fps_test.js','platform_policy_test.js','export_provenance_test.js','quality_bottleneck_test.js');
tests.push('certification_guard_test.js','override_preservation_test.js','director_intent_preservation_test.js','quality_hard_gate_count_test.js','quality_range_consistency_test.js','observer_range_origin_test.js','negative_space_layers_test.js');
tests.push('multi_image_regression_test.js','asset_direction_pixel_test.js');
tests.push('kamen_font_availability_test.cjs');
tests.push('kamen_musical_photo_test.cjs','kamen_encoder_liveness_test.cjs','kamen_song_selection_test.cjs','kamen_story_director_test.cjs');
tests.push('kamen_measurement_policy_test.cjs','kamen_weak_tail_retention_test.cjs','kamen_encoded_proxy_test.cjs','kamen_phase_quality_test.cjs','kamen_closed_loop_test.cjs','kamen_architecture_test.cjs','kamen_contract_test.cjs');
tests.push('kamen_single_image_cinema_test.cjs','kamen_layered_cinema_test.cjs','kamen_shot_grammar_test.cjs','kamen_render_feedback_test.cjs','kamen_artifact_style_test.cjs');
tests.push('kamen_machine_refinement_test.cjs','kamen_quality_target_test.cjs');
tests.push('kamen_registry_selection_test.cjs','kamen_registry_render_guard_test.cjs');
tests.push('kamen_social_choreography_test.cjs','kamen_social_range_test.cjs','kamen_presentation_evidence_test.cjs','kamen_export_ui_test.cjs','one_click_save_test.cjs','cinema_actual_frame_cache_test.cjs','kamen_glyph_contrast_test.cjs','kamen_export_gates_test.cjs','kamen_photo_composition_test.cjs','kamen_quality_evidence_test.cjs','kamen_sync_evidence_test.cjs','kamen_photo_readability_test.cjs','kamen_phrase_outro_test.cjs','kamen_save_pipeline_test.cjs','kamen_sequential_decode_test.cjs','kamen_delayed_lyrics_test.cjs','custom_edition_regression_test.cjs','single_background_quality_test.cjs','kamen_progress_test.cjs','kamen_lrc_test.cjs','audio_exact_performance_test.cjs','kamen_quality_test.cjs');
tests.push('cinema_v3_final_quality_test.cjs','cinema_v3_readability_protection_test.cjs','cinema_v3_contract_test.cjs','cinema_v3_immutability_test.cjs','cinema_v3_metric_calibration_test.cjs','cinema_v3_state_machine_test.cjs','cinema_v3_grammar_adaptation_test.cjs');
const testResults=[];let failures = 0, skipped = 0;
for (const test of tests) {
  console.log(`\n> ${test}`);
  const result = spawnSync(process.execPath, [path.join(root, 'dev', test)], { cwd: root, stdio:'inherit' });
  if(['variable_font_browser_test.js','browser_export_e2e_test.js'].includes(test)&&!process.env.JIZURA_BROWSER_QA_REPORT)skipped++;
  if(test==='export_validation_test.js'&&spawnSync('ffmpeg',['-version'],{stdio:'ignore'}).status!==0)skipped++;
  testResults.push({name:test,status:result.error||result.status!==0?'FAIL':(['variable_font_browser_test.js','browser_export_e2e_test.js'].includes(test)&&!process.env.JIZURA_BROWSER_QA_REPORT?'SKIP':'PASS')});
  if (result.error || result.status !== 0) {
    failures++;
    console.error(`${test}: FAILED`);
  }
}
console.log(`\n${tests.length - failures - skipped}/${tests.length} engine regression tests passed. ${skipped} SKIPPED_ENVIRONMENT_MISSING.`);
if(process.env.JIZURA_TEST_SUMMARY)writeFileSync(process.env.JIZURA_TEST_SUMMARY,JSON.stringify({total:tests.length,passed:tests.length-failures-skipped,failed:failures,skipped,tests:testResults},null,2));
if (failures) process.exitCode = 1;
