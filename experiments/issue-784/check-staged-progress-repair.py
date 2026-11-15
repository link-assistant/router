"""Parse every complete staged JavaScript author input without importing it.

This is draft syntax evidence only. It does not execute receiving cases, check
bindings, install a generated output, or qualify the complete JavaScript gate.
"""
import argparse
import gzip
import hashlib
import json
from pathlib import Path
import subprocess

root = Path.cwd()
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--version', type=int, choices=[3,4], default=4)
args = parser.parse_args()
packet = root / f'ci-logs/issue-784-restart-2/namespace-progress-authored-inputs-v{args.version}.json.gz'
data = json.loads(gzip.decompress(packet.read_bytes()))
node = root / 'experiments/issue-784/toolchain/node20/bin/node'
rows = []
for path, row in data['files'].items():
    if not path.endswith('.mjs'):
        continue
    raw = bytes.fromhex(row['after'])
    assert len(raw) < 262144
    child = subprocess.run([str(node), '--max-old-space-size=128',
        '--input-type=module', '--check'], input=raw, capture_output=True)
    rows.append(dict(path=path, bytes=len(raw), sha256=hashlib.sha256(raw).hexdigest(),
        exitCode=child.returncode, stdout=child.stdout.decode(), stderr=child.stderr.decode()))
receipt = dict(schema='complete-staged-progress-syntax-v1', files=rows,
    nativeSyntaxOnly=True, sourceInstalled=False, nativeBindingsChecked=False,
    cstChecked=False, receivingExecuted=False, runtimeParity=False)
out = root / f'ci-logs/issue-784-restart-2/namespace-progress-staged-syntax-v{args.version}.json'
assert not out.exists()
out.write_text(json.dumps(receipt, indent=2) + '\n')
print(json.dumps(dict(files=len(rows), failures=[row['path'] for row in rows if row['exitCode']])))
raise SystemExit(1 if any(row['exitCode'] for row in rows) else 0)
