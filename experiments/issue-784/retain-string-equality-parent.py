"""Preserve complete original/final receiving sources and all failed/pass runs."""
import base64
import gzip
import hashlib
import json
from pathlib import Path
import subprocess

base=Path('ci-logs/issue-784-restart-2')
paths=sorted(base.glob('current-string-equality-parent-*'))
paths += [Path('tools/translation/test/standard-string-equality.test.mjs'),
          Path('tools/translation/test/fixtures/standard-string-git-proxy-original.rs.gz'),
          Path('experiments/issue-784/capture-standard-string-parent.py')]
for name in ['complete-hMtoN1','complete-B8ibTt']:
    root=Path('js/node_modules/.node-case-deadlines')/name
    terminal=json.loads((root/'terminal.json').read_bytes())
    assert terminal['childClosed'] and terminal['groupCleanup']['complete']
    assert not Path('/proc'/Path(str(terminal['groupCleanup']['group']))).exists()
    paths += sorted(path for path in root.rglob('*') if path.is_file())
members=[]
def append(path,raw):
    members.append({'path':str(path),'bytes':len(raw),
                    'sha256':hashlib.sha256(raw).hexdigest(),
                    'base64':base64.b64encode(raw).decode()})
for path in paths:
    append(path,path.read_bytes())
append('git:4e7093eb9:tools/translation/test/standard-string-equality.test.mjs',
       subprocess.check_output(['git','show','4e7093eb9:tools/translation/test/standard-string-equality.test.mjs']))
packet={'schema':'complete-string-equality-parent-receiving-v1',
        'baseHead':'4e7093eb98b2170bac2cd5fd24c0c777e6bcf4b2',
        'members':members,'nodeVersion':'20.20.2','bunVersion':'1.4.4',
        'typescriptVersion':'5.9.3','nodeHeapMiB':512,
        'firstDraftNodePassed':False,'finalNodePassed':True,'finalBunPassed':True,
        'noSourceDeclaredFiniteDeadlinesAdded':True,'allOriginalAssertionsRetained':True,
        'currentProductionDeclarationsChecked':True,'realCrateAdmission':False,
        'productionExecutableGain':0,'fullGatePassed':False,'rustExecuted':False}
raw=json.dumps(packet,separators=(',',':')).encode()
path=Path('docs/case-studies/issue-784/evidence/current-string-equality-parent.json.gz')
with path.open('xb') as stream:
    stream.write(gzip.compress(raw,mtime=0))
assert gzip.decompress(path.read_bytes())==raw
for row in json.loads(gzip.decompress(path.read_bytes()))['members']:
    content=base64.b64decode(row['base64'],validate=True)
    assert len(content)==row['bytes'] and hashlib.sha256(content).hexdigest()==row['sha256']
print(json.dumps({'path':str(path),'bytes':path.stat().st_size,'members':len(members),
                  'sha256':hashlib.sha256(path.read_bytes()).hexdigest()}))
