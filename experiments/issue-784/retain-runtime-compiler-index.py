"""Retain complete source, reports and independent deadline receipts for one draft."""
import base64
import gzip
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess

base = Path('ci-logs/issue-784-restart-2')
paths = sorted(set(base.glob('current-runtime-compiler-*')) | set(base.glob('current-runtime-index-*')))
paths += [Path(name) for name in [
 'tools/translation/prepare-runtime-compiler-selections.mjs',
 'tools/translation/prepare-runtime-import-current-sources.mjs',
 'tools/translation/prepare-owned-runtime-import-current.mjs',
 'tools/translation/test/runtime-compiler-selections.test.mjs',
 'tools/translation/test/runtime-import-current.test.mjs',
 'experiments/issue-784/probe-runtime-compiler-selection-walks.mjs',
 'experiments/issue-784/probe-runtime-compiler-selection-walks-pre-replay-fix.mjs.gz',
 'experiments/issue-784/probe-current-runtime-source-profile.mjs',
 'experiments/issue-784/inspect-runtime-cpu-profile.py',
 'experiments/issue-784/retain-runtime-compiler-index.py',
]]
for path in list(paths):
 if path.suffix == '.log':
  for matched in re.findall(r'Complete Node deadline evidence: (.+)', path.read_text()):
   directory = Path(matched)
   assert directory.parent.resolve() == Path('js/node_modules/.node-case-deadlines').resolve()
   paths.extend(sorted(directory.iterdir()))
members = []
def retain(path, raw):
 members.append(dict(path=path, bytes=len(raw), sha256=hashlib.sha256(raw).hexdigest(),
                     base64=base64.b64encode(raw).decode()))
for path in sorted(set(paths)):
 assert path.is_file() and not path.is_symlink()
 retain(str(path), path.read_bytes())
for path in ['tools/translation/prepare-runtime-import-current-sources.mjs',
             'tools/translation/prepare-owned-runtime-import-current.mjs']:
 retain('git:764222b6e6d4f0ce1efb0341396cfb6a87661e85:'+path,
        subprocess.check_output(['git','show','764222b6e6d4f0ce1efb0341396cfb6a87661e85:'+path]))
profile = Path('experiments/issue-784/current-runtime-index-384.cpuprofile.gz')
with gzip.open(profile,'rb') as stream:
 raw_hash, length = hashlib.sha256(), 0
 while block := stream.read(65536):
  length += len(block)
  raw_hash.update(block)
assert length == 20724296 and raw_hash.hexdigest() == '6bf2bc05c266cc2f12baf75d7f629468ee63647587a61eb403c23c1cd0cf210a'
profile_record = dict(path=str(profile), bytes=profile.stat().st_size,
                     sha256=hashlib.sha256(profile.read_bytes()).hexdigest(),
                     wholeOriginalBytes=length, wholeOriginalSha256=raw_hash.hexdigest())
record = dict(schema='whole-runtime-compiler-index-receiving-v1', members=members,
              completeProfile=profile_record, newlyExecutableProductionFunctions=0,
              completeAsciiDeadlineQualified=False, fullGatePassed=False, runtimeParity=False)
packed = gzip.compress(json.dumps(record,separators=(',',':')).encode(),mtime=0)
total = 0
for root in ['ci-logs','docs/case-studies/issue-784','experiments/issue-784',
             'js/node_modules/.node-case-deadlines']:
 for parent, directories, files in os.walk(root):
  if parent == 'experiments/issue-784':
   directories[:] = [name for name in directories if name != 'toolchain']
  total += sum((Path(parent)/name).stat().st_size for name in files
               if not (Path(parent)/name).is_symlink())
assert total + len(packed) < 500000000
target = Path('docs/case-studies/issue-784/evidence/current-runtime-compiler-index.json.gz')
with target.open('xb') as output: output.write(packed)
for member in json.loads(gzip.decompress(target.read_bytes()))['members']:
 raw = base64.b64decode(member['base64'],validate=True)
 assert len(raw)==member['bytes'] and hashlib.sha256(raw).hexdigest()==member['sha256']
print(json.dumps(dict(path=str(target),bytes=len(packed),members=len(members),
                     evidenceBytesAfter=total+len(packed),wholeReadbackVerified=True)))
