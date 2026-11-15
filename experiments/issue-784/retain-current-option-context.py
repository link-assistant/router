"""Retain whole original-parent diagnostics and failed complete Option attempts."""
import base64
import gzip
import hashlib
import json
from pathlib import Path
import re
import subprocess
base=Path('ci-logs/issue-784-restart-2')
paths=[Path(__file__),Path('tools/translation/test/original-option-regression-owners.test.mjs'),Path('experiments/issue-784/trace-original-option-parents.mjs')]
for pattern in ['current-original-option-*','current-original-output-limit-*','current-original-vk-*']:
 paths.extend(p for p in base.glob(pattern) if p.is_file() and 'retention' not in p.name)
paths.extend([Path('rust/src/lib.rs'),Path('rust/Cargo.toml'),Path('Cargo.lock'),Path('rust/src/translation_core.rs')])
paths.extend(Path('rust/src/translation_core').rglob('*.rs'))
paths.extend(Path('rust/src')/p for p in ['output_limit.rs','usage.rs','vk.rs','stream_termination.rs','subscription_usage.rs','subscription/types.rs'])
audits=[]
for path in list(paths):
 if path.suffix!='.log':continue
 for name in re.findall(r'Complete Node deadline evidence: (.+)',path.read_text()):
  directory=Path(name);assert directory.parent.resolve()==Path('js/node_modules/.node-case-deadlines').resolve()
  paths.extend(p for p in directory.iterdir() if p.is_file());audits.append(name)
members=[]
def retain(path,raw,version):members.append(dict(path=str(path),version=version,bytes=len(raw),sha256=hashlib.sha256(raw).hexdigest(),base64=base64.b64encode(raw).decode()))
test=Path('tools/translation/test/original-option-regression-owners.test.mjs')
retain(test,subprocess.check_output(['git','show','910e8dadf:'+str(test)]),'910e8dadf')
for path in sorted(set(paths)):
 assert path.is_file() and not path.is_symlink(),str(path)
 retain(path,path.read_bytes(),'current')
record=dict(schema='whole-option-parent-context-receiving-attempts-v1',members=members,nodeDeadlineAudits=audits,
 rootProjectionLabeled=True,wholePhysicalParentsRetained=True,productionRootQualified=False,
 node384CompleteFilePassed=False,node448CompleteFilePassed=False,bunCompleteFilePassed=False,
 node384ChangedCasesPassed=3,node448ChangedCasesPassed=3,bunChangedCasesPassed=3,
 unchangedSubscriptionUsageDeadlinePassed=False,remainingCasesQualified=False,
 heapRetryBasis='384 MiB V8 heap exhausted below unchanged cgroup guard; fresh preflight allowed 448 MiB. Both complete Node attempts fail without modifying original deadlines.',
 fullGatePassed=False,runtimeParity=False,rustExecuted=False,newlyExecutableProductionFunctions=0)
raw=json.dumps(record,separators=(',',':')).encode();target=Path('docs/case-studies/issue-784/evidence/current-option-context.json.gz')
with target.open('xb') as f:f.write(gzip.compress(raw,mtime=0))
for row in json.loads(gzip.decompress(target.read_bytes()))['members']:
 raw=base64.b64decode(row['base64'],validate=True);assert len(raw)==row['bytes'] and hashlib.sha256(raw).hexdigest()==row['sha256']
print(json.dumps(dict(path=str(target),bytes=target.stat().st_size,members=len(members),wholeReadbackVerified=True)))
