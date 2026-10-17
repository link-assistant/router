#!/usr/bin/env python3
"""Bound the entire explicit reviewed application/recovery, including final evidence.

No proposal generation or independent-review substitute. Sources are modified only
by the selected application command. Partial application and all evidence survive.
"""
from pathlib import Path
import argparse
import atexit
import hashlib
import json
import os
import resource
import shutil
import signal
import stat
import subprocess
import sys
import time

START=time.monotonic()
WALL=60
RSS=1024**3
LIMIT=384*1024**2
START_FREE=3*1024**3
RESERVE=2*1024**3
MAX_ENTRIES=30000

def require(value,message):
    if not value:
        raise RuntimeError(message)

def time_check():
    require(time.monotonic()-START<WALL,'entire controller60s bound')
    current=resource.getrusage(resource.RUSAGE_SELF).ru_maxrss*(1 if sys.platform=='darwin' else 1024)
    require(current<=RSS,'controller preflight/finalization1GiB peak')

def stable(path,maximum=16*1024**2):
    time_check()
    before=path.lstat()
    require(stat.S_ISREG(before.st_mode) and not path.is_symlink() and before.st_size<=maximum,'bounded regular control file')
    with path.open('rb') as stream:
        raw=stream.read(maximum+1)
    time_check()
    after=path.lstat()
    require((before.st_dev,before.st_ino,before.st_size,before.st_mtime_ns,before.st_ctime_ns)==(after.st_dev,after.st_ino,after.st_size,after.st_mtime_ns,after.st_ctime_ns) and len(raw)==before.st_size,'complete stable control bytes')
    return raw

def physical(path):
    time_check()
    value=path.absolute()
    require(value==value.resolve(strict=True),'physical paths without aliases')
    for part in [value,*value.parents]:
        require(not part.is_symlink(),'linked physical ancestor')
    return value

def disjoint(a,b):
    return a!=b and a not in b.parents and b not in a.parents

def census(roots):
    count=logical=allocated=0
    for root in roots:
        pending=[root]
        while pending:
            time_check()
            path=pending.pop()
            count+=1
            require(count<=MAX_ENTRIES,'complete combined evidence entry bound')
            try:
                info=path.lstat()
            except FileNotFoundError:
                require(path!=root,'evidence root disappeared')
                continue
            require(stat.S_ISDIR(info.st_mode) or stat.S_ISREG(info.st_mode) or stat.S_ISLNK(info.st_mode),'special evidence node')
            logical+=info.st_size
            allocated+=max(info.st_size,info.st_blocks*512)
            if stat.S_ISDIR(info.st_mode):
                try:
                    pending.extend(path/name for name in os.listdir(path))
                except FileNotFoundError:
                    require(path!=root,'evidence root disappeared')
    return dict(entries=count,logicalBytes=logical,allocatedBytes=allocated)

def budget():
    observation=census(ROOTS)
    free=min(shutil.disk_usage(path).free for path in ROOTS)
    require(time.monotonic()-START<WALL,'entire application/controller60s including preflight/finalization')
    require(max(observation['logicalBytes'],observation['allocatedBytes'])<=LIMIT,'combined producer/review/application/pending/TMP384MiB')
    require(free>=RESERVE,'2GiB live reserve')
    return dict(**observation,freeBytes=free)

def write(path,value):
    raw=(json.dumps(value,ensure_ascii=True,indent=2)+'\n').encode()
    budget()
    with path.open('xb') as stream:
        for at in range(0,len(raw),1024**2):
            stream.write(raw[at:at+1024**2])
            stream.flush()
            budget()
        os.fsync(stream.fileno())
    require(stable(path)==raw,'complete controller readback')
    budget()

def rss(pid):
    observation=subprocess.run(['ps','-axo','pid=,ppid=,rss='],capture_output=True,check=True,timeout=min(1,max(.01,WALL-(time.monotonic()-START))))
    table={int(a):(int(b),int(c)*1024) for line in observation.stdout.splitlines() if len(parts:=line.split())==3 for a,b,c in [parts]}
    selected={os.getpid(),pid}
    while True:
        extra={p for p,(parent,_) in table.items() if parent in selected}-selected
        if not extra:
            break
        selected.update(extra)
    rows=[dict(pid=p,parent=table[p][0],rssBytes=table[p][1]) for p in sorted(selected) if p in table]
    return dict(aggregateBytes=sum(row['rssBytes'] for row in rows),processes=rows)

OUT_CREATED=False
def unfinished_receipt():
    # Covers preflight exceptions before the ordinary terminal handler. The
    # complete traceback is retained by the calling shell/controller.
    if not OUT_CREATED or (OUT/'receipt.json').exists():
        return
    value=dict(schema='bounded-reviewed-core-adoption-controller-v1',complete=False,phase='preflight-or-unexpected-controller-exit',sourceInstalled=None,partialStatePreserved=True,RustExecuted=False,seconds=time.monotonic()-START)
    try:
        with (OUT/'receipt.json').open('xb') as stream:
            stream.write((json.dumps(value,indent=2)+'\n').encode())
            stream.flush()
            os.fsync(stream.fileno())
        observation=census(ROOTS) if 'ROOTS' in globals() else census([OUT])
        require(max(observation['logicalBytes'],observation['allocatedBytes'])<=LIMIT,'final preflight receipt384MiB')
    except BaseException:
        # A failed final guard never upgrades this already-RED receipt.
        pass
atexit.register(unfinished_receipt)

# POSIX real-time alarm also interrupts a blocked preflight/finalization call.
# Deadline termination is RED; no claim of completed final joins is made.
def hard_deadline(signum,frame):
    current=globals().get('child')
    if current is not None:
        try:
            os.killpg(current.pid,signal.SIGKILL)
        except ProcessLookupError:
            pass
        try:
            current.wait(timeout=.05)
        except BaseException:
            pass
    if globals().get('OUT_CREATED',False):
        try:
            raw=(json.dumps(dict(schema='bounded-reviewed-core-adoption-controller-v1',complete=False,error='hard entire-controller60s deadline',sourceInstalled=None,partialStatePreserved=True,RustExecuted=False,finalSourceJoinsComplete=False))+'\n').encode()
            fd=os.open(str(OUT/'hard-deadline-red.json'),os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600)
            os.write(fd,raw)
            os.close(fd)
        except BaseException:
            pass
    os._exit(124)
signal.signal(signal.SIGALRM,hard_deadline)
signal.setitimer(signal.ITIMER_REAL,max(.001,WALL-(time.monotonic()-START)))

parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('mode',choices=['apply','recover'])
parser.add_argument('--root',type=Path,required=True)
parser.add_argument('--run',type=Path,required=True)
parser.add_argument('--output',type=Path,required=True)
parser.add_argument('--expected-head')
parser.add_argument('--review-sha256')
parser.add_argument('--plan-sha256')
parser.add_argument('--index-sha256')
parser.add_argument('--review-directory')
parser.add_argument('--review-monitor-directory')
parser.add_argument('--application',type=Path)
parser.add_argument('--state-sha256')
args=parser.parse_args()
ROOT=physical(args.root)
RUN=physical(args.run)
OUT=args.output.absolute()
require(not OUT.exists() and OUT==OUT.resolve(strict=False) and physical(OUT.parent)==OUT.parent,'fresh physical controller output')
require(disjoint(ROOT,RUN) and disjoint(ROOT,OUT) and disjoint(RUN,OUT),'disjoint source/run/output')
require(shutil.disk_usage(OUT.parent).free>=START_FREE,'3GiB initial free')
OUT.mkdir(mode=0o700)
OUT_CREATED=True
ROOTS=[RUN,OUT]
if args.mode=='recover':
    require(args.application and args.state_sha256,'explicit recovery selection')
    selected_state=json.loads(stable(physical(args.application)/'application-state.json'))
    require(hashlib.sha256(stable(physical(args.application)/'application-state.json')).hexdigest()==args.state_sha256,'exact recovery selection bytes')
    review_directory=selected_state['selection']['reviewDirectory']
    monitor_directory=selected_state['selection']['reviewMonitorDirectory']
else:
    review_directory=args.review_directory
    monitor_directory=args.review_monitor_directory
for selected in [review_directory,monitor_directory]:
    require(isinstance(selected,str) and selected not in ['.','..'] and selected and selected[0].isascii() and selected[0].isalnum() and all(c.isascii() and (c.isalnum() or c in '._-') for c in selected),'explicit direct review subdirectory')
require(review_directory!=monitor_directory,'distinct review/monitor subdirectories')
for control,key in [('external-temporary-root.json','path'),(monitor_directory+'/external-temporary-roots.json','paths')]:
    value=json.loads(stable(RUN/control))
    values=[value[key]] if key=='path' else value[key]
    require(isinstance(values,list),'complete actual temporary roots')
    for path in values:
        candidate=Path(path)
        if candidate.exists():
            candidate=physical(candidate)
            require(disjoint(candidate,ROOT) and disjoint(candidate,RUN) and disjoint(candidate,OUT),'exclusive captured temporary root')
            if candidate not in ROOTS:
                ROOTS.append(candidate)
if args.application:
    previous=physical(args.application)
    require(all(disjoint(previous,p) for p in ROOTS+[ROOT]),'disjoint explicit recovery application')
    ROOTS.append(previous)
TEMP=OUT/'temporary'
TEMP.mkdir(mode=0o700)
time_check()
implementation=Path(__file__).resolve().parent.parent/'tools/translation/apply-reviewed-core-adoption.mjs'
require(implementation.is_file(),'actual checked-in applicator')
engine=shutil.which('node')
require(engine,'installed Node required')
command=[engine,'--max-old-space-size=512',str(implementation),args.mode,'--output',str(OUT/'application')]
if args.mode=='apply':
    require(all([args.expected_head,args.review_sha256,args.plan_sha256,args.index_sha256,args.review_directory,args.review_monitor_directory]) and not args.application and not args.state_sha256,'explicit reviewed application selection')
    for option,value in [('--root',str(ROOT)),('--run',str(RUN)),('--expected-head',args.expected_head),('--review-sha256',args.review_sha256),('--plan-sha256',args.plan_sha256),('--index-sha256',args.index_sha256),('--review-directory',args.review_directory),('--review-monitor-directory',args.review_monitor_directory)]:
        command.extend([option,value])
else:
    require(args.application and args.state_sha256,'explicit reviewed recovery state')
    state=json.loads(stable(previous/'application-state.json'))
    require(Path(state['root'])==ROOT and Path(state['run'])==RUN,'controller/recovery root and original run join')
    command.extend(['--application',str(previous),'--state-sha256',args.state_sha256])
child=None
error=None
peak=0
exitcode=None
empty=False
receipt=dict(schema='bounded-reviewed-core-adoption-controller-v1',mode=args.mode,complete=False,sourceInstalled=None,allFilesAtomic=False,automaticRecovery=False,RustExecuted=False,wallCapSeconds=WALL,aggregateRssCapBytes=RSS,sharedEvidenceCapBytes=LIMIT,startFreeBytes=START_FREE,reserveFreeBytes=RESERVE)
try:
    write(OUT/'command.json',dict(command=command,cwd=str(ROOT),implementationSha256=hashlib.sha256(stable(implementation)).hexdigest(),environment={key:str(TEMP) for key in ['TMPDIR','TMP','TEMP']}))
    write(OUT/'executed-controller.json',dict(source=Path(__file__).read_text(),sha256=hashlib.sha256(Path(__file__).read_bytes()).hexdigest()))
    budget()
    with (OUT/'stdout.raw.log').open('xb') as stdout,(OUT/'stderr.raw.log').open('xb') as stderr,(OUT/'resources.jsonl').open('x') as samples:
        child=subprocess.Popen(command,cwd=ROOT,env={**os.environ,**{key:str(TEMP) for key in ['TMPDIR','TMP','TEMP']}},stdout=stdout,stderr=stderr,start_new_session=True)
        while True:
            observation=rss(child.pid)
            peak=max(peak,observation['aggregateBytes'])
            require(peak<=RSS,'complete descendant/controller1GiB RSS')
            limits=budget()
            samples.write(json.dumps(dict(seconds=time.monotonic()-START,rss=observation,evidence=limits))+'\n')
            samples.flush()
            if child.poll() is not None:
                exitcode=child.returncode
                break
            time.sleep(.1)
        require(exitcode==0,'application child RED; partial state/evidence retained')
        result=json.loads(stable(OUT/'stdout.raw.log'))
        receipt['sourceInstalled']=result.get('sourceInstalled',False) if args.mode=='apply' else False
        receipt['explicitRecoveryCompleted']=result.get('complete',False) if args.mode=='recover' else False
except BaseException as problem:
    error=type(problem).__name__+': '+str(problem)
finally:
    if child:
        for sig in [signal.SIGTERM,signal.SIGKILL]:
            try:
                os.killpg(child.pid,sig)
            except ProcessLookupError:
                pass
            try:
                child.wait(timeout=.1)
            except subprocess.TimeoutExpired:
                pass
        table=subprocess.run(['ps','-axo','pid=,pgid='],capture_output=True,check=True,timeout=1)
        empty=not any(len(parts:=line.split())==2 and int(parts[1])==child.pid for line in table.stdout.splitlines())
        exitcode=child.returncode
        if not empty:
            error=error or 'application descendant group remains'
    waited=resource.getrusage(resource.RUSAGE_CHILDREN).ru_maxrss*(1 if sys.platform=='darwin' else 1024)
    if waited>RSS:
        error=error or 'waited child peak above1GiB'
    try:
        receipt['finalEvidenceBudget']=budget()
    except BaseException as problem:
        error=error or type(problem).__name__+': '+str(problem)
    receipt.update(complete=error is None and exitcode==0 and empty,error=error,exitCode=exitcode,seconds=time.monotonic()-START,peakSampledAggregateRssBytes=peak,maxWaitedChildRssBytes=waited,processGroupEmpty=empty,applicationDirectory=str(OUT/'application'),partialStatePreserved=True)
    # Receipt retention is attempted after RED as well; status is never upgraded.
    raw=(json.dumps(receipt,indent=2)+'\n').encode()
    require(len(raw)<=16384,'finite final controller receipt')
    with (OUT/'receipt.json').open('xb') as stream:
        stream.write(raw)
        stream.flush()
        os.fsync(stream.fileno())
    try:
        budget()  # Count final receipt, every pending file and retained TMP too.
    except BaseException as problem:
        receipt.update(complete=False,error=receipt.get('error') or type(problem).__name__+': '+str(problem))
        (OUT/'receipt.json').write_text(json.dumps(receipt,indent=2)+'\n')
    print(json.dumps(receipt),flush=True)
time_check()
signal.setitimer(signal.ITIMER_REAL,0)
sys.exit(0 if receipt['complete'] else 1)
