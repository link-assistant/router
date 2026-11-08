"""Preserve whole lifetime-scope controls, receiving runs and failed ASCII audit."""
import base64,gzip,hashlib,json,os,re,subprocess
from pathlib import Path
base=Path('ci-logs/issue-784-restart-2')
paths=sorted(set(base.glob('current-runtime-compiler-lifetime-*'))|set(base.glob('current-runtime-lifetime-*')))
paths += [Path(name) for name in [
 'tools/translation/prepare-runtime-compiler-lifetime.mjs',
 'tools/translation/test/runtime-compiler-lifetime.test.mjs',
 'tools/translation/prepare-runtime-import-current-sources.mjs',
 'tools/translation/prepare-owned-runtime-import-current.mjs',
 'tools/translation/test/runtime-import-current.test.mjs',
 'tools/translation/test/router-core-ascii-assets.test.mjs',
 'experiments/issue-784/retain-runtime-compiler-lifetime.py']]
for path in list(paths):
 if path.suffix=='.log':
  for matched in re.findall(r'Complete Node deadline evidence: (.+)',path.read_text()):
   directory=Path(matched)
   assert directory.parent.resolve()==Path('js/node_modules/.node-case-deadlines').resolve()
   paths.extend(sorted(directory.iterdir()))
members=[]
def retain(path,raw):members.append(dict(path=path,bytes=len(raw),sha256=hashlib.sha256(raw).hexdigest(),base64=base64.b64encode(raw).decode()))
for path in sorted(set(paths)):retain(str(path),path.read_bytes())
for path in ['tools/translation/prepare-runtime-import-current-sources.mjs','tools/translation/prepare-owned-runtime-import-current.mjs']:
 retain('git:2dd86d8e6999bfee2d418e75566566581bdf90d1:'+path,subprocess.check_output(['git','show','2dd86d8e6999bfee2d418e75566566581bdf90d1:'+path]))
record=dict(schema='whole-runtime-compiler-lifetime-receiving-v1',members=members,
 newlyExecutableProductionFunctions=0,completeAsciiDeadlineQualified=False,
 bunWholeCurrentConsumerResourceGuard=True,fullGatePassed=False,runtimeParity=False)
packed=gzip.compress(json.dumps(record,separators=(',',':')).encode(),mtime=0)
total=0
for root in ['ci-logs','docs/case-studies/issue-784','experiments/issue-784','js/node_modules/.node-case-deadlines']:
 for parent,directories,files in os.walk(root):
  if parent=='experiments/issue-784':directories[:]=[name for name in directories if name!='toolchain']
  total+=sum((Path(parent)/name).stat().st_size for name in files if not (Path(parent)/name).is_symlink())
assert total+len(packed)<500000000
target=Path('docs/case-studies/issue-784/evidence/current-runtime-compiler-lifetime.json.gz')
with target.open('xb') as out:out.write(packed)
for member in json.loads(gzip.decompress(target.read_bytes()))['members']:
 raw=base64.b64decode(member['base64'],validate=True)
 assert len(raw)==member['bytes'] and hashlib.sha256(raw).hexdigest()==member['sha256']
print(json.dumps(dict(path=str(target),bytes=len(packed),members=len(members),wholeReadbackVerified=True,evidenceBytesAfter=total+len(packed))))
