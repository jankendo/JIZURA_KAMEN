"""Preserve local QA outputs without inventing a GitHub artifact identity."""
import argparse, gzip, hashlib, json, pathlib, shutil

def preserve(source, root, name):
    source, root = pathlib.Path(source), pathlib.Path(root)
    dest = root / 'composition-recovery' / name
    dest.mkdir(parents=True, exist_ok=True)
    entries = []
    for p in sorted(source.iterdir()):
        if not p.is_file():
            continue  # Inputs are authenticated by their existing canonical manifest.
        b = p.read_bytes()
        digest = hashlib.sha256(b).hexdigest()
        if p.suffix in ('.mp4', '.wav'):
            target = root / 'media' / (digest + p.suffix)
            target.parent.mkdir(exist_ok=True)
            if not target.exists():
                target.write_bytes(b)
            assert hashlib.sha256(target.read_bytes()).hexdigest() == digest
            encoding = 'identity'
        elif p.suffix == '.gz':
            target = dest / p.name
            target.write_bytes(b)
            encoding = 'identity'  # Original file already gzip; no double compression.
        else:
            target = dest / (p.name + '.gz')
            target.write_bytes(gzip.compress(b, mtime=0))
            encoding = 'gzip'
        entries.append({'member': p.name, 'bytes': len(b), 'SHA256': digest,
                        'preserved': str(target.relative_to(root)),
                        'storageEncoding': encoding,
                        'storedSHA256': hashlib.sha256(target.read_bytes()).hexdigest()})
    report = {'schema': 1, 'captureOrigin': 'LOCAL_BROWSER_QA',
              'githubArtifactId': None, 'files': entries,
              'inputs': 'Existing immutable canonical reference/WAV; see preregistration.'}
    (dest / 'local-capture-manifest.json').write_text(json.dumps(report, indent=2)+'\n')
    return report

if __name__ == '__main__':
    a=argparse.ArgumentParser();a.add_argument('source');a.add_argument('root');a.add_argument('name')
    n=a.parse_args();r=preserve(n.source,n.root,n.name)
    print(json.dumps({'name':n.name,'preservedFiles':len(r['files']),'origin':r['captureOrigin']}))
