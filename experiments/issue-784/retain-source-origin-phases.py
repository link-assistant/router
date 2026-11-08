"""Retain the complete separate source-origin domain and whole receiving controls."""
import base64,gzip,hashlib,json,os,re
from pathlib import Path
base=Path('ci-logs/issue-784-restart-2')
paths=list(base.glob('current-source-origin-*'))
for name in ['private-parser-sequential-phases.mjs','concrete-sequential-phases.mjs','concrete-sequential-equations.mjs','private-parser-source-origin-phases.mjs','concrete-source-origin-phases.mjs','concrete-source-origin-equations.mjs','prepare-source-origin-concrete-phases.mjs','test/concrete-source-origin-phases.test.mjs']:
 paths.append(Path('tools/translation')/name)
paths.append(Path('experiments/issue-784/retain-source-origin-phases.py'))
for path in list(paths):
 if path.suffix=='.log':
  for value in re.findall(r'Complete Node deadline evidence: (.+)',path.read_text()):
   directory=Path(value)
   assert directory.parent.resolve()==Path('js/node_modules/.node-case-deadlines').resolve()
   paths.extend(sorted(directory.iterdir()))
members=[]
for path in sorted(set(paths)):
 assert path.is_file() and not path.is_symlink()
 raw=path.read_bytes();members.append(dict(path=str(path),bytes=len(raw),sha256=hashlib.sha256(raw).hexdigest(),base64=base64.b64encode(raw).decode()))
record=dict(schema='whole-source-origin-phase-receiving-v1',members=members,
 freshIndependentBuildsPerTransport=2,nodeWholeControlsPass=7,bunWholeControlsPass=7,
 newlyExecutableProductionFunctions=0,currentProducerAdoption=False,originalDeadlineQualified=False,
 fullGatePassed=False,runtimeParity=False)
packed=gzip.compress(json.dumps(record,separators=(',',':')).encode(),mtime=0)
total=0
for root in ['ci-logs','docs/case-studies/issue-784','experiments/issue-784','js/node_modules/.node-case-deadlines']:
 for parent,directories,files in os.walk(root):
  if parent=='experiments/issue-784':directories[:]=[name for name in directories if name!='toolchain']
  total+=sum((Path(parent)/name).stat().st_size for name in files if not (Path(parent)/name).is_symlink())
assert total+len(packed)<500000000
target=Path('docs/case-studies/issue-784/evidence/current-source-origin-phases.json.gz')
with target.open('xb') as output:output.write(packed)
for row in json.loads(gzip.decompress(target.read_bytes()))['members']:
 raw=base64.b64decode(row['base64'],validate=True)
 assert len(raw)==row['bytes'] and hashlib.sha256(raw).hexdigest()==row['sha256']
print(json.dumps(dict(path=str(target),bytes=len(packed),members=len(members),wholeReadbackVerified=True,evidenceBytesAfter=total+len(packed))))
