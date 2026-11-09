"""Complete current receiving files in fresh sequential Bun processes."""
import hashlib
import json
from pathlib import Path
import subprocess
import sys

root=Path.cwd()
base=root/'ci-logs/issue-784-restart-2'
names=['project-namespace-progress','project-progress-source-history',
       'project-proof-byte-operation','core-adoption-progress',
       'project-facade-retention','default-proof-byte-adoption',
       'project-derived-enclosing-context','project-method-owner-scope']
files=['tools/translation/test/'+name+'.test.mjs' for name in names]
inputs=files+['tools/translation/project.mjs',
 'tools/translation/prepare-project-facade-retention.mjs',
 'tools/translation/test/project-progress-source-history.mjs',
 'tools/translation/source-profiles/project-namespace-composition/source-rules.json',
 'tools/translation/operation-proof-byte-bridge.mjs',
 'tools/translation/operation-proof-byte-consumer-scope.mjs']
def snapshots():
 return [{'path':name,'sha256':hashlib.sha256((root/name).read_bytes()).hexdigest()}
         for name in inputs]
before=snapshots()
records=[]
for name,source in zip(names,files):
 prefix='project-progress-fresh-bun-'+name+'-1'
 receipt=base/(prefix+'-resource.json')
 assert not receipt.exists()
 command=[sys.executable,'-B','experiments/issue-784/run-observed-check.py',
  '--log',str(base/(prefix+'.log')),'--receipt',str(receipt),
  '--','bun','test','./'+source]
 result=subprocess.run(command,cwd=root,stdout=subprocess.PIPE,stderr=subprocess.STDOUT)
 print(result.stdout.decode(),end='',flush=True)
 records.append({'file':source,'observerExitCode':result.returncode,
  'resource':json.loads(receipt.read_bytes()) if receipt.exists() else None})
after=snapshots()
passed=before==after and all(row['observerExitCode']==0 for row in records)
report={'schema':'complete-project-progress-fresh-bun-v1','before':before,'after':after,
 'inputsUnchanged':before==after,'records':records,'allCompleteFilesPassed':passed,
 'originalCasesAndDeadlinesUnchanged':True,'performanceQualified':False,
 'productionExecutableGain':0,'runtimeParity':False,'fullGateQualified':False}
with (base/'project-progress-fresh-bun-1-receipt.json').open('x') as output:
 json.dump(report,output)
raise SystemExit(0 if passed else 1)
