"""Read-only source DATA audit; never invokes a compiler or issues a type permit."""
import argparse
import gzip
import hashlib
import json
import re
import stat
import subprocess
from pathlib import Path

HISTORICAL_SHA256 = 'cedf88e59222e3107b1dfac8018f370115ed8201b154739c547b8d0cb57cd70d'
GUARDS = [
    'tools/translation/vendor/meta-language/translation/rust.js',
    'tools/translation/extensions/host-contracts.mjs',
    'tools/translation/extensions/named-lifetimes.mjs',
    'tools/translation/extensions/source-contract-types.mjs',
    'tools/translation/extensions/source-links.mjs',
    'tools/translation/extensions/json-values.mjs',
    'tools/translation/json-macro-runtime.mjs',
    'tools/translation/json-update-runtime.mjs',
    'tools/translation/owned-json-flow.mjs',
    'tools/translation/router-core-json-updates.mjs',
    'tools/translation/migrate-core-json-updates.mjs',
    'tools/translation/test/router-core-json-updates.test.mjs',
    'tools/translation/test/owned-json-flow.test.mjs',
    'tools/translation/test/owned-json-reader-loans.test.mjs',
    'rust/src/translation_core.rs',
    'rust/src/translation_core/primitives.rs',
    'rust/src/lib.rs',
]
SIGNATURE = r'&\s*mut\s+(?:serde_json\s*::\s*)?Value\b'

def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def capture(root, historical):
    root = root.resolve(strict=True)
    packed = historical.read_bytes()
    if sha(packed) != HISTORICAL_SHA256:
        raise ValueError('complete historical source archive differs')
    with gzip.open(historical, 'rb') as stream:
        raw = stream.read(16 * 1024 * 1024 + 1)
    if len(raw) > 16 * 1024 * 1024:
        raise ValueError('historical source DATA bound exceeded')
    old = json.loads(raw)
    group = next(row for row in old['families']
                 if row['name'] == 'Mutation and unique owned edits')
    members = set(group['functions'])
    rows = [row for row in old['functions']
            if row['originalIndex'] in members
            and re.search(SIGNATURE, row['body'].split('{', 1)[0])]
    if len(members) != 201 or len(rows) != 49:
        raise ValueError('complete historical function membership differs')
    def git(*args):
        return subprocess.check_output(['git', *args], cwd=root)
    head = git('rev-parse', 'HEAD').decode().strip()
    inventory = git('ls-files', '--stage', '-z')
    if git('rev-parse', '--show-object-format').strip() != b'sha1':
        raise ValueError('source packet Git object equation requires SHA1')
    tracked = {}
    for entry in inventory.split(b'\0'):
        if not entry:
            continue
        meta, path = entry.split(b'\t', 1)
        mode, oid, stage = meta.decode().split()
        if stage != '0':
            raise ValueError('unmerged source inventory')
        tracked[path.decode()] = (mode, oid)
    saved = {}
    observed_bytes = 0
    def read(path):
        nonlocal observed_bytes
        if path in saved:
            return saved[path]
        target = root / path
        if target.resolve(strict=True).is_relative_to(root) is False:
            raise ValueError('physical source escapes root')
        if not stat.S_ISREG(target.lstat().st_mode):
            raise ValueError('complete regular physical source required: ' + path)
        data = target.read_bytes()
        if len(data) > 32 * 1024 * 1024:
            raise ValueError('source file bound exceeded')
        observed_bytes += len(data)
        if len(saved) >= 8192 or observed_bytes > 256 * 1024 * 1024:
            raise ValueError('complete source input count/byte bound exceeded')
        saved[path] = data
        return data
    paths = sorted({row['path'] for row in rows})
    for row in rows:
        source = read(row['path'])
        span = row['span']
        body = source[span['byteStart']:span['byteEnd']]
        utf16 = source.decode().encode('utf-16-le')
        if (sha(body) != row['sha256'] or body.decode() != row['body']
                or utf16[span['start'] * 2:span['end'] * 2].decode('utf-16-le')
                != row['body']):
            raise ValueError('complete original function/source coordinates differ')
    sources = []
    for path in sorted(set(paths + GUARDS)):
        data = read(path)
        mode, oid = tracked[path]
        actual_oid = hashlib.sha1(b'blob ' + str(len(data)).encode() + b'\0' + data).hexdigest()
        sources.append({'path': path, 'bytes': len(data), 'sha256': sha(data),
                        'source': data.decode(), 'gitMode': mode, 'gitBlob': oid,
                        'physicalMatchesGitBlob': actual_oid == oid})
    rust_cargo = []
    for path, (mode, oid) in sorted(tracked.items()):
        if not (path.endswith('.rs') or Path(path).name in ('Cargo.toml', 'Cargo.lock')):
            continue
        data = read(path)
        actual_oid = hashlib.sha1(b'blob ' + str(len(data)).encode() + b'\0' + data).hexdigest()
        rust_cargo.append({'path': path, 'bytes': len(data), 'sha256': sha(data),
                           'gitMode': mode, 'gitBlob': oid,
                           'physicalMatchesGitBlob': actual_oid == oid})
    if sum(map(len, saved.values())) > 256 * 1024 * 1024:
        raise ValueError('complete source input byte bound exceeded')
    for path, data in saved.items():
        if (root / path).read_bytes() != data:
            raise ValueError('physical source changed during capture: ' + path)
    if git('rev-parse', 'HEAD').decode().strip() != head or git('ls-files', '--stage', '-z') != inventory:
        raise ValueError('complete Git source inventory changed')
    return {
        'schema': 'mutable-json-exclusive-root-next-batch-source-DATA-v1',
        'physicalRootHead': head,
        'historicalArchive': {'sha256': sha(packed), 'bytes': len(packed),
                              'decodedSha256': sha(raw), 'decodedBytes': len(raw),
                              'rootHead': old['rootHead']},
        'historicalCoverage': old['historicalCoverage'],
        'historicalMutationFamily': group,
        'selection': {'pattern': SIGNATURE, 'region': 'body prefix before first opening brace',
                      'classification': 'lexical source spelling only; no canonical Value owner proof',
                      'functionCount': 49, 'wholeParentCount': len(paths)},
        'functions': rows, 'completePhysicalSources': sources,
        'completeTrackedRustCargoVectors': rust_cargo,
        'sourceChangesApplied': False, 'cstAdoptionExecuted': False,
        'freshSemanticVerdicts': False, 'runtimeExecuted': False,
        'rustExecuted': False, 'executableGainMeasured': 0, 'semanticAuthority': False,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', required=True, type=Path)
    parser.add_argument('--historical', required=True, type=Path)
    parser.add_argument('--output', required=True, type=Path)
    args = parser.parse_args()
    value = capture(args.root, args.historical)
    raw = (json.dumps(value, ensure_ascii=False, separators=(',', ':')) + '\n').encode()
    packed = gzip.compress(raw, mtime=0)
    if len(packed) > 8 * 1024 * 1024:
        raise ValueError('complete source evidence bound exceeded')
    with args.output.open('xb') as output:
        output.write(packed)
    if json.loads(gzip.decompress(args.output.read_bytes())) != value:
        raise ValueError('complete source DATA archive readback differs')
    print(json.dumps({'output': str(args.output), 'sha256': sha(packed),
                      'bytes': len(packed), 'decodedBytes': len(raw),
                      'functions': len(value['functions']),
                      'wholeParents': value['selection']['wholeParentCount'],
                      'executableGainMeasured': 0}))


if __name__ == '__main__':
    main()
