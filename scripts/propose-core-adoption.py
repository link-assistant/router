#!/usr/bin/env python3
"""Capture complete current sources and bound the fixed json-readers gzip proposal."""
from pathlib import Path
import argparse,gzip,hashlib,json,os,re,shutil,signal,stat,subprocess,sys,tempfile,time
sys.dont_write_bytecode=True
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'tools/translation'))
import core_adoption_review as source_review

LIMIT=384*1024**2;RSS=3*1024**3;CAP=900;ENTRY_LIMIT=30000;ACTIVE_TEMP=None

def fail(message):raise RuntimeError(message)
def sha(data):return hashlib.sha256(data).hexdigest()
def identity(s):return (s.st_dev,s.st_ino,s.st_mode,s.st_size,s.st_mtime_ns,s.st_ctime_ns)
def regular(path,maximum=128*1024**2):
 before=path.lstat()
 if path.is_symlink() or not stat.S_ISREG(before.st_mode) or before.st_size>maximum:fail('bounded regular input '+str(path))
 data=path.read_bytes()
 if identity(before)!=identity(path.lstat()) or len(data)!=before.st_size:fail('changed input '+str(path))
 return data

def allocation(directory):
 directory.lstat();pending=[directory];count=logical=observed=0
 while pending:
  path=pending.pop();count+=1
  if count>ENTRY_LIMIT:fail('observed evidence entry bound')
  try:s=path.lstat()
  except FileNotFoundError:
   if path==directory:raise
   continue
  if stat.S_ISDIR(s.st_mode):
   try:pending.extend(path/name for name in os.listdir(path))
   except FileNotFoundError:
    if path==directory:raise
  elif not (stat.S_ISREG(s.st_mode) or stat.S_ISLNK(s.st_mode)):fail('special evidence node')
  logical+=s.st_size;observed+=max(s.st_size,s.st_blocks*512)
 return dict(entriesAttempted=count,logicalBytes=logical,observedBytes=observed)

def budget():
 result=allocation(OUT);tmp=allocation(ACTIVE_TEMP)if ACTIVE_TEMP is not None and ACTIVE_TEMP.exists()else dict(logicalBytes=0,observedBytes=0);free=shutil.disk_usage(OUT).free
 if max(result['logicalBytes']+tmp['logicalBytes'],result['observedBytes']+tmp['observedBytes'])>LIMIT:fail('observed-output-384MiB')
 if free<2*1024**3:fail('free-below-2GiB')
 return dict(output=result,externalTemporary=tmp,freeBytes=free)

def write_bytes(path,data,exclusive=True):
 budget()
 with path.open('xb'if exclusive else'wb')as f:
  for at in range(0,len(data),1048576):f.write(data[at:at+1048576]);budget()
 budget()
def write_json(path,value,exclusive=True):write_bytes(path,(json.dumps(value,ensure_ascii=True,separators=(',',':'))+'\n').encode(),exclusive)

# One pre-child capture only; no accounting facts or source verdict is memoized.
PRECHILD_SOURCE_WRITES=False
def write_prechild_source_bytes(path,data):
 budget()  # Fresh complete OUT+TMP scan and disk reserve before every new blob.
 with path.open('xb')as f:
  for at in range(0,len(data),1048576):
   f.write(data[at:at+1048576])
   # The final chunk uses the fresh complete scan AFTER close below; every
   # earlier MiB keeps its original fresh complete scan/disk reserve check.
   if at+1048576<len(data):budget()
 budget()  # Counts the final chunk, actual allocated blocks, directory growth,
           # and flushed small-file buffers. No allocation estimate is reused.

def capture_prechild_sources():
 global PRECHILD_SOURCE_WRITES
 assert not PRECHILD_SOURCE_WRITES
 PRECHILD_SOURCE_WRITES=True
 try:return capture()
 finally:PRECHILD_SOURCE_WRITES=False

def terminal_receipt(value):
 # Safety stops still retain a bounded honest receipt; they never qualify by
 # bypassing the output/free-space result. No further producer is launched.
 data=(json.dumps([value],separators=(',',':'))+'\n').encode()
 if len(data)>16384:fail('bounded terminal receipt')
 with(OUT/'receipt.json').open('wb')as f:f.write(data)

def retain(path,data):
 h=sha(data);folder=OUT/'input-blobs';folder.mkdir(exist_ok=True);target=folder/(h+'.bin')
 if target.exists():
  if regular(target)!=data:fail('snapshot content-addressed bytes differ')
 else:
  if PRECHILD_SOURCE_WRITES:write_prechild_source_bytes(target,data)
  else:write_bytes(target,data)
 return dict(path=path,bytes=len(data),sha256=h,snapshot=str(target.relative_to(OUT)))

def git(*args):return subprocess.check_output(['git','-C',str(ROOT),*args])
def tracked():
 names=[p for p in git('ls-files','-z','--','*.rs','Cargo.toml','Cargo.lock','**/Cargo.toml','**/Cargo.lock','tools/translation','scripts').decode().split('\0')if p]
 # Preserve the old generated-JS exclusion, while guarding EVERY tracked Rust
 # path, including the genuine owned-core-witness.rs outside the API src tree.
 return sorted(p for p in names if p.endswith('.rs')or not p.startswith(('tools/translation/meta/','tools/translation/projects/','tools/translation/js-to-rust/generated/')))

def capture():
 if git('rev-parse','HEAD').decode().strip()!=HEAD or git('status','--porcelain'):fail('HEAD/clean guard')
 names=tracked();rows=[];snapshots=[]
 child=subprocess.Popen(['git','-C',str(ROOT),'cat-file','--batch'],stdin=subprocess.PIPE,stdout=subprocess.PIPE)
 try:
  for name in names:
   child.stdin.write((HEAD+':'+name+'\n').encode());child.stdin.flush();header=child.stdout.readline().split()
   if len(header)!=3 or header[1]!=b'blob':fail('Git blob '+name)
   count=int(header[2])
   if count>128*1024**2:fail('Git blob bound')
   data=child.stdout.read(count)
   if len(data)!=count or child.stdout.read(1)!=b'\n':fail('Git blob stream')
   path=ROOT/name;present=path.exists()or path.is_symlink()
   if present:
    if regular(path)!=data:fail('physical/Git source '+name)
   elif not name.startswith('docs/case-studies/issue-759/'):fail('missing physical source '+name)
   row=retain(name,data);snapshots.append({**row,'physicalPresent':present});rows.append({key:row[key]for key in ['path','bytes','sha256']})
  child.stdin.close()
  if child.wait()!=0:fail('Git stream exit')
 finally:
  if child.poll()is None:child.kill();child.wait()
 compiler=(ROOT/'js/node_modules/typescript').resolve();paths=sorted(p for p in compiler.rglob('*')if p.is_file())
 if len(paths)!=132 or any(p.is_symlink()for p in compiler.rglob('*'))or json.loads(regular(compiler/'package.json'))['version']!='5.9.3':fail('complete installed132 TypeScript5.9.3')
 for path in paths:
  name='js/node_modules/typescript/'+path.relative_to(compiler).as_posix();row=retain(name,regular(path));snapshots.append({**row,'physicalPresent':True});rows.append({key:row[key]for key in ['path','bytes','sha256']})
 rust=[r for r in snapshots if source_review.is_rust_cargo_path(r['path'])]
 if {r['path']for r in rust}!={p for p in git('ls-files','-z','--','*.rs','Cargo.toml','Cargo.lock','**/Cargo.toml','**/Cargo.lock').decode().split('\0')if p}:fail('all-current Rust/Cargo census')
 return dict(sourceHead=HEAD,inputs=rows),snapshots,rust

# Complete receiving-source observations, not source/owner/checker verdicts.
# The first capture is freshly joined to Git and all physical source bytes.
SOURCE_FREEZE=None

def source_freeze(captured,snapshots,rust):
 paths=sorted(row['path']for row in rust if row['path'].startswith(source_review.repository_rust_layout(ROOT)['productionPrefix']))
 return dict(schema='captured-producer-source-freeze-v1',sourceHead=HEAD,root=str(ROOT),inputs=captured['inputs'],allTrackedRustCargoPaths=sorted(row['path']for row in rust),physicalSrcPaths=paths,census=dict(trackedCompilerScriptRustCargo=sum(not row['path'].startswith('js/node_modules/typescript/')for row in snapshots),allTrackedRustCargo=len(rust),physicalSrcRust=len(paths),installedTypeScript=132,totalCapturedInputs=len(snapshots)))

def require_current_capture(captured,snapshots,rust):
 if captured!=dict(sourceHead=HEAD,inputs=SOURCE_FREEZE['inputs']):fail('complete original compiler/Rust/Cargo/132TS source capture')
 expected=SOURCE_FREEZE['census']
 if len(captured['inputs'])!=expected['totalCapturedInputs'] or len(rust)!=expected['allTrackedRustCargo']:fail('original all-input/Rust-Cargo field count')
 if sorted(row['path']for row in rust)!=SOURCE_FREEZE['allTrackedRustCargoPaths']:fail('original full all-tracked Rust/Cargo paths')
 if len([row for row in snapshots if row['path'].startswith('js/node_modules/typescript/')])!=expected['installedTypeScript']:fail('original complete TypeScript132 count')
 paths=[];entries=0
 for base,dirs,files in os.walk(ROOT/source_review.repository_rust_layout(ROOT)['productionPrefix'],followlinks=False):
  entries+=1+len(dirs)+len(files)
  if entries>ENTRY_LIMIT:fail('physical src census entry bound')
  if any((Path(base)/name).is_symlink()for name in dirs):fail('physical src symlink directory')
  for name in files:
   if name.endswith('.rs'):
    path=Path(base)/name;current=path.lstat()
    if not stat.S_ISREG(current.st_mode)or path.is_symlink():fail('physical src bounded regular file')
    paths.append(path.relative_to(ROOT).as_posix())
 paths.sort()
 if len(paths)!=expected['physicalSrcRust']or paths!=SOURCE_FREEZE['physicalSrcPaths']:fail('complete original physical src Rust paths')
 if paths!=sorted(row['path']for row in rust if row['path'].startswith(source_review.repository_rust_layout(ROOT)['productionPrefix'])):fail('physical src/current Git capture join')

def output_index():
 rows=[]
 if PAYLOAD.exists():
  for path in sorted(PAYLOAD.rglob('*')):
   if path.is_symlink()or not(path.is_file()or path.is_dir()):fail('special proposal output')
   if path.is_file():
    before=path.lstat();h=hashlib.sha256()
    with path.open('rb')as f:
     while data:=f.read(1048576):h.update(data);budget()
    if identity(before)!=identity(path.lstat()):fail('changed complete output')
    rows.append(dict(path=str(path),bytes=before.st_size,allocatedBytes=before.st_blocks*512,sha256=h.hexdigest()))
 return rows

def retain_temp(directory):
 rows=[]
 for path in sorted(directory.rglob('*')):
  s=path.lstat();row=dict(path=str(path.relative_to(directory)),mode=s.st_mode,dev=s.st_dev,ino=s.st_ino,size=s.st_size,mtimeNs=s.st_mtime_ns,ctimeNs=s.st_ctime_ns)
  if stat.S_ISLNK(s.st_mode):row.update(kind='symlink',target=os.readlink(path))
  elif stat.S_ISDIR(s.st_mode):row['kind']='directory'
  elif stat.S_ISREG(s.st_mode):
   archive=OUT/'external-tmp-blobs'/(sha(row['path'].encode())+'.gz');archive.parent.mkdir(exist_ok=True);h=hashlib.sha256()
   with path.open('rb')as original,archive.open('xb')as target,gzip.GzipFile(filename='',mode='wb',fileobj=target,mtime=0)as packed:
    while data:=original.read(1048576):h.update(data);packed.write(data);budget()
   budget()
   with path.open('rb')as original,gzip.open(archive,'rb')as decoded:
    while True:
     data=original.read(1048576)
     if decoded.read(len(data))!=data:fail('temporary full byte comparison')
     budget()
     if not data:
      if decoded.read(1):fail('temporary extra bytes')
      break
   row.update(kind='file',sha256=h.hexdigest(),archive=str(archive.relative_to(OUT)),archiveBytes=archive.stat().st_size,fullStreamByteEqualityVerified=True)
  else:fail('special temporary output')
  if identity(s)!=identity(path.lstat()):fail('changed terminal temporary')
  rows.append(row)
  if len(rows)>ENTRY_LIMIT:fail('temporary census bound')
 write_json(OUT/'external-temporary-complete-census.json',dict(root=str(directory),files=rows,complete=True,symlinksNeverFollowed=True))
 # Remove only this monitor's exclusive completed TMP after every full byte was
 # retained/reopened/compared; proposal-owned output is NEVER removed here.
 shutil.rmtree(directory);budget()

OUTPUT_CREATED=False

def main():
 global ROOT,HEAD,OUT,PAYLOAD,ACTIVE_TEMP,SOURCE_FREEZE,OUTPUT_CREATED
 parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--root',type=Path,required=True);parser.add_argument('--expected-head',required=True);parser.add_argument('--output',type=Path,required=True);parser.add_argument('--sequence',choices=['json-readers'],required=True);args=parser.parse_args()
 ROOT=args.root.resolve();HEAD=args.expected_head;OUT=args.output.resolve()
 if sys.platform not in ['darwin','linux']:fail('POSIX Darwin/Linux resource receiving required')
 if Path(__file__).resolve()!=ROOT/'scripts/propose-core-adoption.py':fail('execute the captured checked-in proposal controller')
 if not re.fullmatch('[a-f0-9]{40}',HEAD)or OUT.exists()or ROOT==OUT or ROOT in OUT.parents or OUT in ROOT.parents:fail('fresh disjoint output/full SHA')
 if shutil.disk_usage(OUT.parent).free<3*1024**3:fail('start free below3GiB')
 OUT.mkdir();OUTPUT_CREATED=True;PAYLOAD=OUT/'migration-proposal';ACTIVE_TEMP=Path(tempfile.mkdtemp(prefix='router-core-adoption-proposal-',dir=str(OUT.parent)));budget()
 write_json(OUT/'external-temporary-root.json',dict(path=str(ACTIVE_TEMP),outsideSourceRoot=True))
 write_bytes(OUT/'executed-monitor.py',Path(__file__).read_bytes())
 before,snapshots,rust_before=capture_prechild_sources()
 required=['scripts/propose-core-adoption.py','scripts/review-core-adoption.py','tools/translation/core_adoption_review.py','tools/translation/core_adoption_json_readers_review.py']
 if not set(required).issubset(row['path']for row in before['inputs']):fail('complete committed controller/reviewer closure required')
 SOURCE_FREEZE=source_freeze(before,snapshots,rust_before);write_json(OUT/'captured-input-pins.json',SOURCE_FREEZE);require_current_capture(before,snapshots,rust_before);write_json(OUT/'inputs.json',before);write_json(OUT/'full-input-snapshots-before.json',dict(sourceHead=HEAD,files=snapshots));write_json(OUT/'all-rust-cargo-before.json',dict(sourceHead=HEAD,files=rust_before))
 source_count=len([p for p in(ROOT/source_review.repository_rust_layout(ROOT)['productionPrefix']).rglob('*.rs')if p.is_file()]);write_json(OUT/'scope.json',dict(adoption='Unmodified CLI complete physical src application census',adoptionInputs=source_count,allTrackedRustCargoGuards=len(rust_before),installedTypeScriptFiles=132,scopeNotCoverage=True))
 executable=shutil.which('node')
 if not executable:fail('Node absent')
 version=subprocess.run([executable,'--version'],capture_output=True,timeout=10,check=True);write_json(OUT/'engine-version.json',dict(path=executable,stdout=version.stdout.decode('utf8'),stderr=version.stderr.decode('utf8')))
 env={**os.environ};env.update({key:str(ACTIVE_TEMP)for key in ['TMPDIR','TMP','TEMP']});env['ROUTER_TRANSLATION_TSC']=str(ROOT/'js/node_modules/typescript/bin/tsc')
 command=[executable,'--max-old-space-size=1792','tools/translation/propose-core-adoption-corpus.mjs','--root',str(ROOT),'--output',str(PAYLOAD),'--sequence','json-readers','--packet-storage','gzip']
 write_json(OUT/'proposal.command.json',dict(command=command,cwd=str(ROOT),capSeconds=CAP,sourceHead=HEAD,proposalOnly=True,packetStorage='gzip',RustExecuted=False,temporaryEnvironment={key:env[key]for key in ['TMPDIR','TMP','TEMP']}));budget()
 start=time.monotonic();peak=0;reason=None;reaped=False
 with(OUT/'proposal.stdout.raw.log').open('xb')as stdout,(OUT/'proposal.stderr.raw.log').open('xb')as stderr,(OUT/'proposal.resource-samples.jsonl').open('x')as samples:
  child=subprocess.Popen(command,cwd=ROOT,env=env,stdout=stdout,stderr=stderr,start_new_session=True);write_json(OUT/'running.json',dict(pid=child.pid,sourceHead=HEAD,capSeconds=CAP,command=command))
  try:
   while True:
    pid,status,usage=os.wait4(child.pid,os.WNOHANG)
    if pid:reaped=True;break
    elapsed=time.monotonic()-start
    if elapsed>=CAP:reason='stage-deadline';break
    observation=subprocess.run(['ps','-axo','pid=,ppid=,rss='],capture_output=True,text=True,check=True,timeout=min(2,CAP-elapsed));table={int(a):(int(b),int(c)*1024)for line in observation.stdout.splitlines()if len(parts:=line.split())==3 for a,b,c in [parts]};selected={child.pid,os.getpid()}
    while True:
     more={pid for pid,(parent,rss)in table.items()if parent in selected}-selected
     if not more:break
     selected|=more
    amount=sum(table[p][1]for p in selected if p in table);peak=max(peak,amount);disk=budget();samples.write(json.dumps(dict(seconds=elapsed,aggregateRssBytes=amount,processes=[dict(pid=p,ppid=table[p][0],rssBytes=table[p][1])for p in sorted(selected)if p in table],**disk))+'\n');samples.flush();budget()
    if amount>RSS:reason='aggregate-3GiB';break
    time.sleep(min(.5,CAP-elapsed))
  except BaseException as error:reason=type(error).__name__+': '+str(error)
  finally:
   if not reaped:
    try:os.killpg(child.pid,signal.SIGKILL)
    except ProcessLookupError:pass
    _,status,usage=os.wait4(child.pid,0)
   child.returncode=os.waitstatus_to_exitcode(status)
 elapsed=time.monotonic()-start
 waited_peak=usage.ru_maxrss*(1 if sys.platform=='darwin'else 1024)
 if waited_peak>RSS and reason is None:reason='waited-child-peak-above-3GiB'
 row=dict(stage='proposal',command=command,sourceHead=HEAD,exitCode=child.returncode,elapsedSeconds=elapsed,capSeconds=CAP,resourceReason=reason,inputsUnchanged=False,headUnchanged=git('rev-parse','HEAD').decode().strip()==HEAD,peakSampledAggregateRssBytes=peak,aggregateRssCapBytes=RSS,maxWaitedChildRssBytes=waited_peak,waitedRssScope='POSIX direct waited child bytes; monitor+all descendant aggregate sampled separately',userCpuSeconds=usage.ru_utime,systemCpuSeconds=usage.ru_stime,runtimeParity=False,fullGatePass=False,RustExecuted=False)
 # Retain an honest terminal receipt before any optional terminal evidence work.
 terminal_receipt(row)
 after_capture_succeeded=False
 try:
  after,after_snapshots,rust_after=capture();require_current_capture(after,after_snapshots,rust_after);after_capture_succeeded=True;row['inputsUnchanged']=before==after and snapshots==after_snapshots and rust_before==rust_after;write_json(OUT/'proposal.inputs-after.json',after);write_json(OUT/'full-input-snapshots-after.json',dict(sourceHead=HEAD,files=after_snapshots));write_json(OUT/'all-rust-cargo-after.json',dict(sourceHead=HEAD,files=rust_after));outputs=output_index();write_json(OUT/'complete-generated-output-index.json',dict(schema='complete-generated-output-index-v1',sourceHead=HEAD,files=outputs,totalFiles=len(outputs),totalBytes=sum(r['bytes']for r in outputs),proposalComplete=child.returncode==0 and reason is None,packetStorage='gzip',runtimeParity=False,RustExecuted=False));retain_temp(ACTIVE_TEMP);ACTIVE_TEMP=None;row['finalEvidenceBudget']=budget()
 except BaseException as error:row['resourceReason']=row['resourceReason']or(type(error).__name__+': '+str(error))
 row['headUnchanged']=git('rev-parse','HEAD').decode().strip()==HEAD;row['cleanAfter']=not bool(git('status','--porcelain'));row['sourceGuardsAfterFailureStatus']='complete-fresh-byte-rejoin'if after_capture_succeeded else 'fresh-rejoin-failed; inputsUnchanged is false'
 terminal_receipt(row)
 # Last check counts every final byte, all stored/pending proposal data and any TMP
 # left after an evidence failure. No manual producer-owned file deletion occurs.
 try:final=budget()
 except BaseException as error:row['resourceReason']=row['resourceReason']or(type(error).__name__+': '+str(error));terminal_receipt(row);final=None
 print(json.dumps(row),flush=True)
 sys_exit=0 if final is not None and row['exitCode']==0 and row['resourceReason']is None and row['inputsUnchanged']and row['headUnchanged']and row['cleanAfter']else 1
 raise SystemExit(sys_exit)

if __name__=='__main__':
 try:main()
 except Exception as error:
  if OUTPUT_CREATED:
   row=dict(stage='proposal',phase='preflight-or-unexpected-controller-failure',sourceHead=HEAD,exitCode=None,resourceReason=type(error).__name__+': '+str(error),inputsUnchanged=False,sourceGuardsAfterFailureStatus='fresh-rejoin-incomplete',RustExecuted=False,fullGatePass=False)
   try:terminal_receipt(row);budget()
   except Exception:pass
  raise
