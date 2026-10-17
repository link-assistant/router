import hashlib,json,os,resource,subprocess,sys,time
from pathlib import Path
root=Path('/Users/konard/Code/Archive/link-assistant/router/.worktrees/issue-759-full-protocols')
engine=sys.argv[1]
files=['arithmetic-source-fragments','arithmetic-source-data','arithmetic-associated-source','json-roundtrip-num-expansions','json-roundtrip-limb-fragments']
args=['node','--test','--test-concurrency=1'] if engine=='node' else ['bun','test']
args += ['tools/translation/test/'+name+'.test.mjs' for name in files]
log=Path('/tmp/router-759-arithmetic-0d627-retry-'+engine+'.log')
head=subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip()
status=subprocess.check_output(['git','status','--porcelain'],cwd=root,text=True)
inputs=[root/'Cargo.toml',root/'Cargo.lock']
inputs += list((root/'tools/translation').glob('*.mjs'))
inputs += list((root/'tools/translation/source-profiles/json-macro').rglob('*'))
inputs += list((root/'tools/translation/source-profiles/json-roundtrip').rglob('*'))
inputs += [root/path for path in args if path.endswith('.test.mjs')]
rows=[{'path':str(path.relative_to(root)),'bytes':path.stat().st_size,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()} for path in sorted(set(inputs)) if path.is_file()]
before=resource.getrusage(resource.RUSAGE_CHILDREN)
started=time.time()
with log.open('wb') as output:
 proc=subprocess.run(args,cwd=root,stdout=output,stderr=subprocess.STDOUT)
elapsed=time.time()-started
after=resource.getrusage(resource.RUSAGE_CHILDREN)
receipt={'sourceHead':head,'sourceStatus':status,'command':args,'elapsedSeconds':elapsed,'exitCode':proc.returncode,'logPath':str(log),'logBytes':log.stat().st_size,'logSha256':hashlib.sha256(log.read_bytes()).hexdigest(),'inputHashes':rows,'resourceScope':'This Python harness subprocess and its child processes only; not machine-wide or per-case. ru_maxrss is cumulative RUSAGE_CHILDREN high-water in bytes on macOS.','childUserSeconds':after.ru_utime-before.ru_utime,'childSystemSeconds':after.ru_stime-before.ru_stime,'childMaxRssBytes':after.ru_maxrss}
Path('/tmp/router-759-arithmetic-0d627-retry-'+engine+'-receipt.json').write_text(json.dumps(receipt,indent=2)+'\n')
print(json.dumps({key:receipt[key] for key in ['sourceHead','elapsedSeconds','exitCode','logPath','logBytes','logSha256','childMaxRssBytes']},indent=2))
print(log.read_text(errors='replace')[-6500:])
sys.exit(proc.returncode)
