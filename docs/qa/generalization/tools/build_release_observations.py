#!/usr/bin/env python3
"""Hash-checked extraction; never infers creative, semantic or UI PASS.
Config: releaseSourceCommit, evidenceRoot, archives:[archive-manifest paths],
outputDirectory. All relative paths resolve against the config directory.
Existing gates are never read/overwritten. Original rows remain in their
SHA-bound archive member; normalized JSON records contain exact JSON pointers.
"""
import argparse
import gzip
import hashlib
import json
from pathlib import Path
import re


def digest(data):
    return hashlib.sha256(data).hexdigest()


def dump(path, value):
    data = (json.dumps(value, ensure_ascii=False, indent=2) + '\n').encode()
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists() and path.read_bytes() != data:
        raise ValueError(f'refusing to replace different observation: {path}')
    path.write_bytes(data)
    return {'path': path.name, 'sha256': digest(data)}


def member_bytes(root, entry):
    path = (root / entry['preserved']).resolve()
    if not path.is_relative_to(root.resolve()):
        raise ValueError('archive member outside evidenceRoot')
    stored = path.read_bytes()
    data = gzip.decompress(stored) if path.suffix == '.gz' else stored
    if digest(data) != entry['SHA256'] or len(data) != entry['bytes']:
        raise ValueError(f'archive member SHA/size mismatch: {path}')
    return data, {'path': str(path), 'sha256': digest(stored),
                  'uncompressedSHA256': digest(data), 'archiveMember': entry['member']}


def build(config, base):
    source = config['releaseSourceCommit']
    if not re.fullmatch('[0-9a-f]{40}', source):
        raise ValueError('exact releaseSourceCommit required')
    root = (base / config['evidenceRoot']).resolve()
    out = (base / config['outputDirectory']).resolve()
    if out.name in ('final-gates.json', 'current-root-fix-gates.json'):
        raise ValueError('outputDirectory must be an observation directory')
    by_source, failures, inventory = {}, [], []
    for archive_name in config['archives']:
        archive_path = (base / archive_name).resolve()
        archive_raw = archive_path.read_bytes()
        archive = json.loads(archive_raw)
        files = {f['member']: f for f in archive['files']}
        result_names = [n for n in files if n.endswith('results.json')]
        decode_names = [n for n in files if n.endswith('strict-decode.json')]
        if not result_names or not decode_names:
            inventory.append({'archive': str(archive_path), 'status': 'UNVERIFIED',
                              'reason': 'results/strict-decode members missing'})
            continue
        all_decodes = []
        for name in decode_names:
            data, locator = member_bytes(root, files[name])
            for di, dec in enumerate(json.loads(data).get('entries', [])):
                all_decodes.append((di, dec, locator))
        all_rows = []
        for name in result_names:
            data, locator = member_bytes(root, files[name])
            for index, row in enumerate(json.loads(data).get('rows', [])):
                all_rows.append((index, row, locator))
        inventory.append({'archive': str(archive_path), 'status': 'EXTRACTED',
                          'resultMembers': result_names, 'decodeMembers': decode_names,
                          'observedRows': len(all_rows), 'decodeEntries': len(all_decodes)})
        for index, row, result_locator in all_rows:
            locator = {**result_locator, 'jsonPointer': f'/rows/{index}',
                       'archiveManifest': str(archive_path),
                       'archiveManifestSHA256': digest(archive_raw)}
            fixture = row.get('fixture', {})
            video_hash = row.get('sha256')
            matches = [(i, d, loc) for i, d, loc in all_decodes
                       if d.get('fixture') == fixture.get('id') and
                       d.get('variant') == row.get('variant') and
                       d.get('videoSHA256') == video_hash]
            if len(matches) != 1:
                failures.append({'rawObservation': locator, 'fixture': fixture.get('id'),
                                 'variant': row.get('variant'), 'rowStatus': row.get('status'),
                                 'status': 'UNVERIFIED', 'reason': 'no unique hash-bound full decode'})
                continue
            di, dec, decode_locator = matches[0]
            binding = dec.get('binding', {})
            original_source = binding.get('sourceCommit')
            if not re.fullmatch('[0-9a-f]{40}', original_source or ''):
                raise ValueError('decode observation has no exact original sourceCommit')
            mp4s = [f for f in archive['files'] if f['member'].endswith('.mp4') and
                    f['SHA256'] == video_hash]
            if len(mp4s) != 1:
                raise ValueError('missing/ambiguous completed MP4 archive member')
            _, video_locator = member_bytes(root, mp4s[0])
            if binding.get('sourceDirty') is not False:
                raise ValueError('dirty or unspecified source cannot certify exact source provenance')
            if binding.get('videoSHA256') != video_hash:
                raise ValueError('final artifact binding differs from MP4')
            streams = row.get('ffprobe', {}).get('streams', [])
            vc = next((s.get('codec_name') for s in streams if s.get('codec_type') == 'video'), None)
            ac = next((s.get('codec_name') for s in streams if s.get('codec_type') == 'audio'), None)
            # This maps the explicit strict FFmpeg result; it does not turn a
            # successful container parse or proxy decode into complete decode.
            complete = dec.get('completeDecode') == 'PASS'
            raw = {'schema': 1, 'sourceCommit': original_source,
                   'videoSHA256': video_hash, 'decodeComplete': complete,
                   'decodeExitCode': 0 if complete else None,
                   'originalCompleteDecode': dec.get('completeDecode'),
                   'rawObservation': locator,
                   'strictDecodeObservation': {**decode_locator, 'jsonPointer': f'/entries/{di}'},
                   'videoFile': video_locator, 'binding': binding,
                   'fixture': fixture, 'metrics': row.get('decoded', {}).get('metrics'),
                   'originalRowStatus': row.get('status'),
                   'originalManualLockUnchanged': row.get('manualLockUnchanged'),
                   'sourceInvariant': row.get('sourceInvariant'),
                   'semanticStatus': 'UNVERIFIED', 'significantRegression': None}
            name = f'{video_hash}-{original_source[:12]}-{digest(archive_raw)[:12]}.json'
            raw_ref = dump(out / name, raw)
            movie = {'id': f"{fixture.get('id')}:{row.get('variant')}:{video_hash}",
                     'sourceCommit': original_source, 'fixtureId': fixture.get('id'),
                     'variant': row.get('variant'), 'videoSHA256': video_hash,
                     'decodeExitCode': raw['decodeExitCode'], 'decodeComplete': complete,
                     'hashMatches': True, 'codecVideo': vc, 'codecAudio': ac,
                     'hasVideo': vc is not None, 'hasAudio': ac is not None,
                     **{k: binding.get(k) for k in ('inputHash','planHash','outputProfile',
                                                   'rendererVersion','selectedCandidateId')},
                     'observation': raw_ref}
            by_source.setdefault(original_source, {})[movie['id']] = movie
    groups = {}
    for original_source, movies in by_source.items():
        groups[original_source] = dump(out / f'artifacts-{original_source}.json',
                                      {'schema': 1, 'sourceCommit': original_source,
                                       'movies': list(movies.values())})
    manifest = {'releaseSourceCommit': source, 'evidence': {},
                'observationGroupsByOriginalSourceCommit': groups,
                'unverified': ['CI final HEAD', 'full regression/build', 'actual browser UI',
                               'fixed30 + unused independent comparisons',
                               'important semantic isolated encoded controls',
                               'significant regressions and all-path source correspondence'],
                'failedOrIncompleteAttempts': failures, 'archiveInventory': inventory,
                'normalizationPolicy': 'Original sourceCommit and original raw rows retained. No inferred quality PASS, no silent source equivalence.'}
    if source in groups:
        manifest['evidence']['artifacts'] = groups[source]
    dump(out / 'release-observation-manifest.json', manifest)
    return {'movieCount': sum(len(m) for m in by_source.values()),
            'sourceGroups': list(groups), 'incompleteAttempts': len(failures),
            'outputDirectory': str(out)}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('config', type=Path)
    args = parser.parse_args()
    config_path = args.config.resolve()
    print(json.dumps(build(json.loads(config_path.read_text()), config_path.parent), indent=2))
