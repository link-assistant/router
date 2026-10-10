#!/usr/bin/env python3
"""Archive public GitHub CI evidence with pagination, attempt history and provenance.

Requires authenticated gh. Expanded logs are retained; ZIPs stay in memory.
"""
import concurrent.futures, datetime, fcntl, gzip, hashlib, io, json, lzma, os, pathlib, re, subprocess, threading, time, urllib.parse, zipfile

ROOT = pathlib.Path(__file__).resolve().parent
GH_CWD=ROOT
for ancestor in ROOT.parents:
    if ancestor.name=='.worktrees':GH_CWD=ancestor.parent;break
LOCK = threading.Lock()
MANIFEST = []
BUDGET_EXHAUSTED = threading.Event()
XZ_COMPRESSORS = threading.Semaphore(2)
REPOS = [('link-assistant/router',749),('link-foundation/meta-language',201),('link-foundation/relative-meta-logic',184),('link-assistant/formal-ai',1188)]

def write_bounded(path, payload, allow_payload_reserve=False):
    """Share a serialized byte allocation between both collectors; never overshoot."""
    path.parent.mkdir(parents=True,exist_ok=True)
    with (ROOT/'.disk-budget.lock').open('a') as lock:
        fcntl.flock(lock,fcntl.LOCK_EX)
        state_path=ROOT/'.disk-budget-state.json'
        if state_path.exists():state=json.loads(state_path.read_text())
        else:state={'ci_bytes':sum(p.stat().st_size for p in ROOT.rglob('*') if p.is_file()),'limit_bytes':460000000,'note':'Leaves40MB for other evidence within total500MB; streamed gzip payloads are counted before disk writes.'}
        if 'ci_allocated_bytes' not in state:
            state['ci_allocated_bytes']=sum(p.stat().st_blocks*512 for p in ROOT.rglob('*') if p.is_file())
        old_allocated=path.stat().st_blocks*512 if path.exists() else 0
        allocated_delta=((len(payload)+4095)//4096)*4096-old_allocated
        delta=len(payload)-(path.stat().st_size if path.exists() else 0)
        payload_limit=430000000 if ('logs' in path.parts or 'text-objects' in path.parts) and not allow_payload_reserve else 460000000
        if state['ci_bytes']+delta>state['limit_bytes'] or state['ci_allocated_bytes']+allocated_delta>payload_limit:
            BUDGET_EXHAUSTED.set()
            raise RuntimeError('CI460MB allocation exhausted within total500MB evidence cap')
        temporary=path.with_name(path.name+f'.pending-{os.getpid()}-{threading.get_ident()}')
        temporary.write_bytes(payload)
        os.replace(temporary,path)
        state['ci_bytes']+=delta
        state['ci_allocated_bytes']+=path.stat().st_blocks*512-old_allocated
        state_path.write_text(json.dumps(state,indent=2)+'\n')

def write_json(path, data):
    path.parent.mkdir(parents=True,exist_ok=True)
    text=json.dumps(data,indent=2)+'\n'
    if len(text)>5000:
        path=path.with_suffix(path.suffix+'.gz')
        write_bounded(path,gzip.compress(text.encode(),compresslevel=9,mtime=0))
    else:write_bounded(path,text.encode())
    return path

def scrub(text):
    text = re.sub(r'\b(?:gh[pousr]_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,}|sk-[A-Za-z0-9_-]{20,}|AKIA[0-9A-Z]{16})\b', '[REDACTED_TOKEN]', text)
    text = re.sub(r'(?i)(authorization\s*[:=]\s*(?:bearer|token)\s+)[^\s"\']+', r'\1[REDACTED]', text)
    text = re.sub(r'(https?://)[^\s/@:]+:[^\s/@]+@', r'\1[REDACTED]@', text)
    return text

def fetch(endpoint, path, binary=False):
    if not binary:
        if path.exists():
            return json.loads(path.read_text())
        if path.with_suffix(path.suffix+'.gz').exists():
            with gzip.open(path.with_suffix(path.suffix+'.gz'),'rt') as f: return json.load(f)
    timestamp = datetime.datetime.now(datetime.timezone.utc).isoformat()
    if BUDGET_EXHAUSTED.is_set() and binary:
        with LOCK:
            with (ROOT/'source-manifest.jsonl').open('a') as f: f.write(json.dumps({'endpoint':'https://api.github.com/'+endpoint,'retrieved_at':timestamp,'path':str(path.relative_to(ROOT)),'status':'not_downloaded_evidence_budget_exhausted'})+'\n')
        return None
    retries=[]
    for retry in range(5):
        result = subprocess.run(['gh','api',endpoint],capture_output=True,cwd=GH_CWD)
        invalid_json=False
        if not result.returncode and not binary:
            try:json.loads(result.stdout)
            except (ValueError,UnicodeError):invalid_json=True
        if not invalid_json and (not result.returncode or 'unexpected end of JSON input' not in result.stderr.decode(errors='replace')):break
        retries.append({'attempt':retry+1,'stdout_bytes':len(result.stdout),'stdout_sha256':hashlib.sha256(result.stdout).hexdigest(),'error':scrub(result.stderr.decode(errors='replace')),'invalid_json':invalid_json})
        time.sleep(2*(retry+1))
    item = {'endpoint':'https://api.github.com/'+endpoint, 'retrieved_at':timestamp, 'exit_code':result.returncode, 'path':str(path.relative_to(ROOT)), 'gh_working_directory':str(GH_CWD)}
    if retries:item['transient_attempts']=retries
    if invalid_json:result.returncode=1;item['exit_code']=1;result.stderr=b'Invalid JSON response after retries'
    if result.returncode:
        item['error'] = scrub(result.stderr.decode(errors='replace'))
        path = path.with_suffix(path.suffix+'.error.txt')
        path.parent.mkdir(parents=True,exist_ok=True)
        path.write_text(item['error'])
        value = None
    elif binary:
        value = result.stdout
        item['download_sha256'] = hashlib.sha256(value).hexdigest()
        item['download_bytes'] = len(value)
    else:
        clean = scrub(result.stdout.decode(errors='replace'))
        value = json.loads(clean)
        path=write_json(path,value)
        item['path']=str(path.relative_to(ROOT))
        item['sha256'] = hashlib.sha256(path.read_bytes()).hexdigest()
    with LOCK:
        MANIFEST.append(item)
        with (ROOT/'source-manifest.jsonl').open('a') as f: f.write(json.dumps(item)+'\n')
    return value

def paginate(endpoint, directory, name, key=None):
    all_items=[]
    for page in range(1,1001):
        data=fetch(endpoint+('&' if '?' in endpoint else '?')+f'per_page=100&page={page}', directory/f'{name}-page-{page:03d}.json')
        if data is None: break
        values=data[key] if key else data
        all_items.extend(values)
        if len(values)<100: break
    write_json(directory/f'{name}-all.json',all_items)
    return all_items

def archive_attempt(repo, directory, run, attempt):
    rid=run['id']; folder=directory/'runs'/str(rid)/f'attempt-{attempt}'
    endpoint=f'repos/{repo}/actions/runs/{rid}/attempts/{attempt}'
    if attempt==run.get('run_attempt',1):
        data=run;write_json(folder/'run.json',data)
    else:data=fetch(endpoint,folder/'run.json')
    if data is None: return
    if data.get('conclusion') not in ['failure','cancelled','timed_out','action_required','startup_failure']: return
    jobs=paginate(endpoint+'/jobs',folder,'jobs','jobs')
    if (folder/'expanded-log-manifest.json').exists() or (folder/'expanded-log-manifest.json.gz').exists():return
    blob=fetch(endpoint+'/logs',folder/'logs.zip',binary=True)
    if blob is None:
        if BUDGET_EXHAUSTED.is_set():
            write_json(folder/'logs-not-downloaded.json',{'reason':'evidence_allocated_disk_budget_exhausted','endpoint':'https://api.github.com/'+endpoint+'/logs','note':'Metadata collection continues; full log bytes were not fetched after the hard cap.'})
            return
        for job in jobs:
            if job.get('conclusion') in ['failure','timed_out','action_required'] and job.get('check_run_url'):
                paginate(job['check_run_url'].removeprefix('https://api.github.com/')+'/annotations', folder/'annotations',str(job['id']))
        return
    try:
        with zipfile.ZipFile(io.BytesIO(blob)) as archive:
            files=[]
            for member in archive.infolist():
                if member.is_dir(): continue
                parts=pathlib.PurePosixPath(member.filename).parts
                if any(p in ['..',''] for p in parts) or member.filename.startswith('/'): continue
                path=folder/'logs'/pathlib.Path(*parts)
                path=path.with_suffix(path.suffix+'.gz')
                redacted=False
                decoded_hash=hashlib.sha256()
                compressed=io.BytesIO()
                with archive.open(member) as src, gzip.GzipFile(fileobj=compressed,mode='wb',compresslevel=6,mtime=0) as packed:
                    dst=io.TextIOWrapper(packed,encoding='utf-8')
                    for line in io.TextIOWrapper(src,encoding='utf-8',errors='replace'):
                        clean=scrub(line);redacted|=clean!=line;dst.write(clean);decoded_hash.update(clean.encode())
                    dst.flush()
                payload=compressed.getvalue();compression='gzip'
                if len(payload)>200*1024:
                    with XZ_COMPRESSORS:
                        compression_started=time.monotonic()
                        packed_xz=io.BytesIO()
                        with gzip.GzipFile(fileobj=io.BytesIO(payload),mode='rb') as src,lzma.LZMAFile(packed_xz,'wb',preset=6) as dst:
                            while chunk:=src.read(1024*1024):dst.write(chunk)
                    if len(packed_xz.getvalue())<len(payload):payload=packed_xz.getvalue();path=path.with_suffix('.xz');compression='xz'
                write_bounded(path,payload)
                files.append({'path':str(path.relative_to(ROOT)),'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'bytes':path.stat().st_size,'uncompressed_bytes':member.file_size,'redacted':redacted,'compression':compression,'decoded_sha256':decoded_hash.hexdigest(),**({'xz_compression_elapsed_seconds':time.monotonic()-compression_started} if compression=='xz' else {})})
            write_json(folder/'expanded-log-manifest.json',files)
    except Exception as error:
        (folder/'log-extract-error.txt').write_text(str(error))

def main():
    tasks=[]; summaries=[]
    for repo,pr in REPOS:
        directory=ROOT/repo.replace('/','--'); directory.mkdir(exist_ok=True)
        data=fetch(f'repos/{repo}/pulls/{pr}',directory/'pull.json')
        if not data: continue
        commits=paginate(f'repos/{repo}/pulls/{pr}/commits',directory,'commits')
        if len(commits)<data['commits']:
            comparison=f"repos/{repo}/compare/{data['base']['sha']}...{data['head']['sha']}"
            compared=paginate(comparison,directory,'comparison-commits','commits')
            print(f'{repo}: comparison exposes {len(compared)} commits versus PR API {len(commits)}/{data["commits"]}',flush=True)
        branch=data['head']['ref']
        branch_endpoint=f'repos/{repo}/actions/runs?branch='+urllib.parse.quote(branch,safe='')
        runs=paginate(branch_endpoint,directory,'branch-runs','workflow_runs')
        boundary_batch=runs; partition=0
        while len(boundary_batch)>=1000:
            oldest=min(r['created_at'] for r in boundary_batch)
            partition+=1
            boundary_batch=paginate(branch_endpoint+'&created='+urllib.parse.quote('<='+oldest,safe=''),directory,f'branch-runs-older-{partition:03d}','workflow_runs')
            old_ids={r['id'] for r in runs}; new=[r for r in boundary_batch if r['id'] not in old_ids]
            if not new: break
            runs.extend(new)
        write_json(directory/'complete-branch-runs-all.json',runs)
        for run in runs:
            for attempt in range(1,run.get('run_attempt',1)+1):
                if run.get('conclusion') not in ['failure','cancelled','timed_out','action_required','startup_failure'] and attempt==run.get('run_attempt',1): continue
                tasks.append((repo,directory,run,attempt))
        summaries.append({'repo':repo,'pr':pr,'branch':branch,'head_sha':data['head']['sha'],'commit_count_api':data['commits'],'commits_archived':len(commits),'branch_runs':len(runs),'older_created_partitions':partition,'attempts':sum(r.get('run_attempt',1) for r in runs)})
        print(json.dumps(summaries[-1]),flush=True)
    priority={'CI/CD Pipeline':0,'CI':0,'Layered CI':1,'Coverage':1,'issue-183-acceptance':1,'tests':2,'formal-corpus':2,'parity':2}
    tasks.sort(key=lambda task:(priority.get(task[2]['name'],3),task[0],task[2]['created_at'],task[3]))
    write_json(ROOT/'requested-attempt-ledger.json',[{'repository':repo,'run_id':run['id'],'attempt':attempt,'workflow':run['name'],'latest_conclusion':run['conclusion'],'run_url':run['html_url'],'metadata_path':str(directory.relative_to(ROOT))+'/runs/'+str(run['id'])+'/attempt-'+str(attempt)+'/run.json'} for repo,directory,run,attempt in tasks])
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        future_map={pool.submit(archive_attempt,*task):task for task in tasks}
        for i,future in enumerate(concurrent.futures.as_completed(future_map),1):
            try: future.result()
            except Exception as error:
                repo,directory,run,attempt=future_map[future]
                print('ERROR',repo,run['id'],attempt,str(error),flush=True)
            if i%20==0: print(f'Archived {i}/{len(tasks)} attempts',flush=True)
    (ROOT/'collection-summary.json').write_text(json.dumps(summaries,indent=2)+'\n')
    (ROOT/'source-manifest.json').write_text(json.dumps(MANIFEST,indent=2)+'\n')

if __name__=='__main__': main()
