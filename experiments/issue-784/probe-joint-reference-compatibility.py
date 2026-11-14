"""Compare complete original and drafted parser subjects, always restoring the draft."""
import gzip
import hashlib
import json
from pathlib import Path
import subprocess

path = Path('tools/translation/extensions/host-contracts.mjs')
head = 'e88183bb894b9ea62c9d6ae170c3fc099047685b'
original = subprocess.check_output(['git', 'show', head + ':' + str(path)])
draft = path.read_bytes()
assert original != draft
subjects = [f"pub fn read(value:&&'static {kind})->{kind}{{**value}}" for kind in ['f64', 'u32']]
subjects += [f"pub fn read<'a>(value:&&'a {kind})->{kind}{{**value}}" for kind in ['f64', 'u32']]
subjects += [f"pub fn read<'a,'b>(value:&'a &'b {kind})->{kind}{{**value}}" for kind in ['f64', 'u32']]
code = "import {translateSource} from './tools/translation/translate.mjs';const rows=" + json.dumps(subjects) + "; console.log(JSON.stringify(rows.map(source=>({source,result:translateSource(source)}))));"
results = []
try:
    for label, source in [('draft', draft), ('original', original)]:
        path.write_bytes(source)
        process = subprocess.run(['node', '--input-type=module', '-e', code], capture_output=True)
        assert len(process.stdout) + len(process.stderr) < 16 * 1024 * 1024
        results.append(dict(label=label, source=source.decode(), sha256=hashlib.sha256(source).hexdigest(),
                            status=process.returncode, stdout=process.stdout.decode(), stderr=process.stderr.decode()))
finally:
    path.write_bytes(draft)
assert path.read_bytes() == draft
raw = json.dumps(dict(schema='complete-joint-reference-original-comparison-v1', results=results,
                      draftRestored=True, rustExecuted=False), separators=(',', ':')).encode()
output = Path('ci-logs/issue-784-restart-2/joint-reference-original-comparison.json.gz')
with output.open('xb') as target:
    target.write(gzip.compress(raw, mtime=0))
assert gzip.decompress(output.read_bytes()) == raw
for row in results:
    print(row['label'], row['status'])
    if row['status']:
        print(row['stderr'])
        continue
    for subject in json.loads(row['stdout']):
        owner = next(item for item in subject['result']['ir']['items'] if item.get('name') == 'read')
        print(subject['source'], owner['status'], owner.get('diagnostic'))
