#!/usr/bin/env python3
"""Bound complete independent json-readers source/data review; never install source."""
from pathlib import Path
import argparse,hashlib,json,os,re,shutil,signal,stat,subprocess,sys,tempfile,time

CAP=180;RSS=1024**3;LIMIT=384*1024**2;ENTRY_LIMIT=30000
REVIEWER=None

def fail(message):raise RuntimeError(message)
def sha(raw):return hashlib.sha256(raw).hexdigest()
def identity(s):return s.st_dev,s.st_ino,s.st_mode,s.st_size,s.st_mtime_ns,s.st_ctime_ns
def regular(path,maximum=128*1024**2):
 before=path.lstat()
 if path.is_symlink()or not stat.S_ISREG(before.st_mode)or before.st_size>maximum:fail('bounded regular input '+str(path))
 raw=path.read_bytes()
 if identity(before)!=identity(path.lstat())or len(raw)!=before.st_size:fail('changed input '+str(path))
 return raw

def allocation(directory):
 pending=[directory];logical=observed=count=0
 while pending:
  path=pending.pop();count+=1
  if count>ENTRY_LIMIT:fail('complete observed entry bound')
  try:s=path.lstat()
  except FileNotFoundError:
   if path==directory:raise
   continue
  if stat.S_ISDIR(s.st_mode):
   try:pending.extend(path/name for name in os.listdir(path))
   except FileNotFoundError:
    if path==directory:raise
  elif not(stat.S_ISREG(s.st_mode)or stat.S_ISLNK(s.st_mode)):fail('special evidence entry')
  logical+=s.st_size;observed+=max(s.st_size,s.st_blocks*512)
 return dict(entries=count,logicalBytes=logical,observedBytes=observed)

def budget():
 roots=[RUN]+[path for path in TEMP_ROOTS if path.exists()]
 values=[dict(path=str(path),**allocation(path))for path in roots]
 logical=sum(row['logicalBytes']for row in values);observed=sum(row['observedBytes']for row in values);free=shutil.disk_usage(RUN).free
 if max(logical,observed)>LIMIT:fail('combined-producer-review-TMP-384MiB')
 if free<2*1024**3:fail('free-below-2GiB')
 return dict(roots=values,logicalBytes=logical,observedBytes=observed,freeBytes=free)

def write(path,raw):
 budget()
 with path.open('xb')as stream:
  for at in range(0,len(raw),1048576):stream.write(raw[at:at+1048576]);budget()
 budget()
def write_json(path,value):write(path,(json.dumps(value,separators=(',',':'))+'\n').encode())
def receipt(row):
 # A bounded final RED receipt survives a budget stop; it never qualifies it.
 raw=(json.dumps(row,separators=(',',':'))+'\n').encode()
 if len(raw)>16384:fail('bounded terminal receipt')
 with(OUT/'receipt.json').open('wb')as stream:stream.write(raw)

def git(*args):return subprocess.check_output(['git','-C',str(ROOT),*args])
def tracked():
 paths=[p for p in git('ls-files','-z','--','*.rs','Cargo.toml','Cargo.lock','tools/translation','scripts').decode().split('\0')if p]
 return sorted(p for p in paths if p.endswith('.rs')or not p.startswith(('tools/translation/meta/','tools/translation/projects/','tools/translation/js-to-rust/generated/')))

def source_join():
 """Attempt every original source/TS input even after a resource/child failure.

 Bytes already retained by the producer are not copied. The current vector is
 hashed in order and compared to every full captured row. This is not a source,
 owner or verdict cache and is never an input to the independent verifier.
 """
 errors=[];checks=0;current=[]
 def problem(message):
  if len(errors)<12:errors.append(message[:500])
 expected_git=tracked();expected_non_ts=[row['path']for row in INPUTS if not row['path'].startswith(TS_PREFIX)]
 if expected_git!=expected_non_ts:problem('complete tracked compiler/Rust/Cargo census changed')
 actual_rust={p for p in git('ls-files','-z','--','*.rs','Cargo.toml','Cargo.lock').decode().split('\0')if p}
 if actual_rust!={p for p in expected_non_ts if p.endswith('.rs')or p in ['Cargo.toml','Cargo.lock']}:problem('all tracked Rust/Cargo scope changed')
 child=subprocess.Popen(['git','-C',str(ROOT),'cat-file','--batch'],stdin=subprocess.PIPE,stdout=subprocess.PIPE)
 try:
  for row in INPUTS:
   name=row['path'];data=None
   try:
    if name.startswith(TS_PREFIX):data=regular(COMPILER/name[len(TS_PREFIX):])
    else:
     child.stdin.write((HEAD+':'+name+'\n').encode());child.stdin.flush();header=child.stdout.readline().split()
     if len(header)!=3 or header[1]!=b'blob':fail('complete expected Git blob '+name)
     length=int(header[2])
     if length>128*1024**2:fail('Git source bound')
     original=child.stdout.read(length)
     if len(original)!=length or child.stdout.read(1)!=b'\n':fail('Git source stream')
     path=ROOT/name
     if path.exists()or path.is_symlink():
      data=regular(path)
      if data!=original:problem('physical/Git full bytes differ '+name)
     elif name.startswith('docs/case-studies/issue-759/'):data=original
     else:problem('physical original missing '+name)
     if len(original)!=row['bytes']or sha(original)!=row['sha256']:problem('captured expected Git bytes differ '+name)
    if data is not None:
     actual=dict(path=name,bytes=len(data),sha256=sha(data));current.append(actual)
     if actual!=row:problem('captured current input differs '+name)
   except BaseException as error:problem(name+': '+type(error).__name__+': '+str(error))
   checks+=1
  child.stdin.close()
  if child.wait()!=0:problem('Git source stream exit')
 finally:
  if child.poll()is None:child.kill();child.wait()
 paths=sorted(p for p in COMPILER.rglob('*')if p.is_file())
 if len(paths)!=132 or any(p.is_symlink()for p in COMPILER.rglob('*'))or {TS_PREFIX+p.relative_to(COMPILER).as_posix()for p in paths}!={row['path']for row in INPUTS if row['path'].startswith(TS_PREFIX)}:problem('complete installed132 TypeScript census changed')
 try:
  if json.loads(regular(COMPILER/'package.json'))['version']!='5.9.3':problem('TypeScript version changed')
 except BaseException as error:problem('TypeScript version: '+str(error))
 head=git('rev-parse','HEAD').decode().strip();clean=not bool(git('status','--porcelain'))
 if head!=HEAD:problem('HEAD changed')
 if not clean:problem('worktree dirty')
 if regular(RUN/'inputs.json',16*1024**2)!=CAPTURED_RAW:problem('captured complete input vector changed')
 if regular(REVIEWER)!=REVIEWER_RAW:problem('complete reviewer source changed')
 return dict(completeInputChecksAttempted=checks,expectedInputs=len(INPUTS),allInputBytesUnchanged=current==INPUTS,fullFreshVectorSha256=sha((json.dumps(current,separators=(',',':'))+'\n').encode()),capturedInputVectorSha256=sha(CAPTURED_RAW),headUnchanged=head==HEAD,cleanAfter=clean,reviewerSourceUnchanged=regular(REVIEWER)==REVIEWER_RAW,errors=errors,allFreshJoinsPassed=checks==len(INPUTS)and current==INPUTS and not errors and head==HEAD and clean)

def temporary_census():
 rows=[]
 for directory in TEMP_ROOTS:
  if not directory.exists():rows.append(dict(root=str(directory),absent=True));continue
  for path in sorted(directory.rglob('*')):
   state=path.lstat();row=dict(root=str(directory),path=path.relative_to(directory).as_posix(),identity=list(identity(state)))
   if stat.S_ISLNK(state.st_mode):row.update(kind='symlink',target=os.readlink(path))
   elif stat.S_ISDIR(state.st_mode):row['kind']='directory'
   elif stat.S_ISREG(state.st_mode):
    digest=hashlib.sha256()
    with path.open('rb')as stream:
     while raw:=stream.read(1048576):digest.update(raw);budget()
    row.update(kind='file',sha256=digest.hexdigest(),retainedAtOriginalPath=True)
   else:fail('special external TMP entry')
   if identity(state)!=identity(path.lstat()):fail('terminal external TMP changed')
   rows.append(row)
   if len(rows)>ENTRY_LIMIT:fail('bounded full TMP census')
 return rows

OUTPUT_CREATED=False

def main():
 global ROOT,RUN,HEAD,PAYLOAD,OUT,REPORT,TS_PREFIX,COMPILER,REVIEWER,REVIEWER_RAW,START_FREE,CAPTURED_RAW,INPUTS,TEMP_ROOTS,OUTPUT_CREATED
 parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--root',type=Path,required=True);parser.add_argument('--run',type=Path,required=True);parser.add_argument('--expected-head',required=True);parser.add_argument('--review-directory',required=True);parser.add_argument('--review-monitor-directory',required=True);args=parser.parse_args()
 ROOT=args.root.resolve();RUN=args.run.resolve();HEAD=args.expected_head;PAYLOAD=RUN/'migration-proposal';OUT=RUN/args.review_monitor_directory;REPORT=RUN/args.review_directory;TS_PREFIX='js/node_modules/typescript/';COMPILER=(ROOT/TS_PREFIX).resolve()
 if sys.platform not in ['darwin','linux']:fail('POSIX Darwin/Linux resource receiving required')
 for value in [args.review_directory,args.review_monitor_directory]:
  if not re.fullmatch('[A-Za-z0-9][A-Za-z0-9._-]*',value)or value in ['.','..']:fail('explicit direct review subdirectory')
 if OUT==REPORT or Path(__file__).resolve()!=ROOT/'scripts/review-core-adoption.py':fail('distinct fresh report paths and captured checked-in review controller')
 REVIEWER=ROOT/'tools/translation/core_adoption_json_readers_review.py'
 if not re.fullmatch('[a-f0-9]{40}',HEAD)or ROOT==RUN or ROOT in RUN.parents or RUN in ROOT.parents or not PAYLOAD.is_dir()or OUT.exists()or REPORT.exists():fail('complete disjoint producer run/fresh reviewer output/full HEAD')
 START_FREE=shutil.disk_usage(RUN).free
 REVIEWER_RAW=regular(REVIEWER)
 # Fresh full source_join below checks this fixed reviewer and every helper
 # against the same captured Git/physical HEAD; no checkpoint digest list.

 CAPTURED_RAW=regular(RUN/'inputs.json',16*1024**2);captured=json.loads(CAPTURED_RAW)
 if set(captured)!=set(['sourceHead','inputs'])or captured['sourceHead']!=HEAD or not isinstance(captured['inputs'],list):fail('exact complete captured producer input shape/head')
 INPUTS=captured['inputs'];seen=set()
 for row in INPUTS:
  if set(row)!=set(['path','bytes','sha256'])or not isinstance(row['path'],str)or not re.fullmatch('[a-f0-9]{64}',row['sha256'])or type(row['bytes'])is not int or not 0<=row['bytes']<=128*1024**2:fail('captured input row')
  p=Path(row['path'])
  if p.is_absolute()or '..'in p.parts or str(p)!=row['path']or row['path']in seen:fail('captured path normalization/uniqueness')
  seen.add(row['path'])
 required=['scripts/propose-core-adoption.py','scripts/review-core-adoption.py','tools/translation/core_adoption_review.py','tools/translation/core_adoption_json_readers_review.py']
 if not set(required).issubset(seen):fail('complete captured controller/reviewer closure required')
 old_temp=json.loads(regular(RUN/'external-temporary-root.json',1048576));old_path=Path(old_temp['path']).resolve()
 if set(old_temp)!=set(['path','outsideSourceRoot'])or old_temp['outsideSourceRoot']is not True or old_path.parent!=RUN.parent or not old_path.name.startswith('router-core-adoption-proposal-')or old_path==RUN or ROOT in old_path.parents or old_path in ROOT.parents:fail('exclusive physical producer TMP sibling')
 producer_command=json.loads(regular(RUN/'proposal.command.json',1048576))
 if producer_command.get('cwd')!=str(ROOT)or producer_command.get('sourceHead')!=HEAD or producer_command.get('temporaryEnvironment')!={key:str(old_path)for key in ['TMPDIR','TMP','TEMP']}:fail('exact producer temporary descriptor/command/environment join')
 TEMP_ROOTS=[old_path];OUT.mkdir();OUTPUT_CREATED=True
 try:
  if START_FREE<3*1024**3:fail('start-free-below-3GiB')
  temporary=Path(tempfile.mkdtemp(prefix='router-core-adoption-review-',dir=str(RUN.parent)));TEMP_ROOTS.append(temporary);budget()
  write(OUT/'executed-monitor.py',Path(__file__).read_bytes());write_json(OUT/'external-temporary-roots.json',dict(paths=[str(path)for path in TEMP_ROOTS],rawFilesRetained=True,symlinksNeverFollowed=True));before=source_join();write_json(OUT/'source-join-before.json',before)
  if not before['allFreshJoinsPassed']:fail('complete pre-review original source joins failed')
  command=[sys.executable,'-B',str(REVIEWER),'--root',str(ROOT),'--run',str(RUN),'--payload',str(PAYLOAD),'--report',str(REPORT),'--expected-head',HEAD]
  write_json(OUT/'command.json',dict(command=command,cwd=str(ROOT),capSeconds=CAP,aggregateRssCapBytes=RSS,combinedEvidenceBytes=LIMIT,sourceHead=HEAD,readOnlyIndependentDataReview=True,RustExecuted=False));env={**os.environ,'PYTHONDONTWRITEBYTECODE':'1',**{key:str(temporary)for key in ['TMPDIR','TMP','TEMP']}};budget();start=time.monotonic();reason=None;peak=0;reaped=False
  with(OUT/'stdout.raw.log').open('xb')as stdout,(OUT/'stderr.raw.log').open('xb')as stderr,(OUT/'resource-samples.jsonl').open('x')as samples:
   child=subprocess.Popen(command,cwd=ROOT,env=env,stdout=stdout,stderr=stderr,start_new_session=True)
   try:
    while True:
     pid,status,usage=os.wait4(child.pid,os.WNOHANG)
     if pid:reaped=True;break
     elapsed=time.monotonic()-start
     if elapsed>=CAP:reason='whole-review-deadline';break
     observation=subprocess.run(['ps','-axo','pid=,ppid=,rss='],capture_output=True,text=True,check=True,timeout=min(2,CAP-elapsed));table={int(a):(int(b),int(c)*1024)for line in observation.stdout.splitlines()if len(parts:=line.split())==3 for a,b,c in [parts]};selected={child.pid,os.getpid()}
     while True:
      more={pid for pid,(parent,rss)in table.items()if parent in selected}-selected
      if not more:break
      selected|=more
     amount=sum(table[p][1]for p in selected if p in table);peak=max(peak,amount);disk=budget();samples.write(json.dumps(dict(seconds=elapsed,aggregateRssBytes=amount,processes=[dict(pid=p,ppid=table[p][0],rssBytes=table[p][1])for p in sorted(selected)if p in table],**disk))+'\n');samples.flush();budget()
     if amount>RSS:reason='aggregate-1GiB';break
     time.sleep(min(.5,CAP-elapsed))
   except BaseException as error:reason=type(error).__name__+': '+str(error)
   finally:
    if not reaped:
     try:os.killpg(child.pid,signal.SIGKILL)
     except ProcessLookupError:pass
     _,status,usage=os.wait4(child.pid,0)
    child.returncode=os.waitstatus_to_exitcode(status)
  waited_peak=usage.ru_maxrss*(1 if sys.platform=='darwin'else 1024)
  if waited_peak>RSS and reason is None:reason='waited-child-peak-1GiB'
  row=dict(command=command,sourceHead=HEAD,exitCode=child.returncode,elapsedSeconds=time.monotonic()-start,resourceReason=reason,capSeconds=CAP,aggregateRssCapBytes=RSS,peakSampledAggregateRssBytes=peak,maxWaitedChildRssBytes=waited_peak,userCpuSeconds=usage.ru_utime,systemCpuSeconds=usage.ru_stime,finalSourceJoinsComplete=False,reviewerQualified=False,RustExecuted=False,sourceInstalled=False)
  receipt(row)
  # These fresh checks run even after a deadline, memory or evidence stop. Full
  # original source bytes are already retained by the producer, never copied here.
  try:
   after=source_join();row['finalSourceJoinsComplete']=after['completeInputChecksAttempted']==after['expectedInputs'];row['finalSourceJoins']=after
   try:write_json(OUT/'source-join-after.json',after)
   except BaseException as error:row['resourceReason']=row['resourceReason']or(type(error).__name__+': '+str(error))
  except BaseException as error:row['finalSourceJoinError']=type(error).__name__+': '+str(error)
  try:write_json(OUT/'complete-external-temporary-census.json',dict(paths=temporary_census(),allOriginalRawFilesRetained=True));row['finalEvidenceBudget']=budget()
  except BaseException as error:row['resourceReason']=row['resourceReason']or(type(error).__name__+': '+str(error))
  row['reviewerQualified']=row['exitCode']==0 and row['resourceReason']is None and row.get('finalSourceJoins',{}).get('allFreshJoinsPassed')is True
  receipt(row)
  try:budget()
  except BaseException as error:row['resourceReason']=row['resourceReason']or(type(error).__name__+': '+str(error));row['reviewerQualified']=False;receipt(row)
  print(json.dumps(row),flush=True)
 except Exception as error:
  row=dict(sourceHead=HEAD,exitCode=None,resourceReason=type(error).__name__+': '+str(error),capSeconds=CAP,aggregateRssCapBytes=RSS,reviewerQualified=False,sourceInstalled=False,RustExecuted=False,phase='preflight-or-terminal-monitor-failure')
  try:
   after=source_join();row['finalSourceJoins']=after;row['finalSourceJoinsComplete']=after['completeInputChecksAttempted']==after['expectedInputs']
  except Exception as join_error:row['finalSourceJoinError']=type(join_error).__name__+': '+str(join_error)
  receipt(row);print(json.dumps(row),flush=True)
 raise SystemExit(0 if row['reviewerQualified']else 1)

if __name__=='__main__':
 try:main()
 except Exception as error:
  if OUTPUT_CREATED:
   row=dict(sourceHead=HEAD,exitCode=None,resourceReason=type(error).__name__+': '+str(error),reviewerQualified=False,finalSourceJoinsComplete=False,sourceInstalled=False,RustExecuted=False,phase='preflight-or-unexpected-controller-failure')
   try:receipt(row);budget()
   except Exception:pass
  raise
