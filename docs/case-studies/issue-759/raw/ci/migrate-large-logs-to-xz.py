#!/usr/bin/env python3
"""Lossless, verified, atomic migration of large completed gzip logs to XZ.

Run only with collection/index writers paused. At most two bounded compressors.
"""
import concurrent.futures,datetime,fcntl,gzip,hashlib,importlib.util,io,json,lzma,os,pathlib,threading,time
spec=importlib.util.spec_from_file_location('ci',pathlib.Path(__file__).with_name('archive-ci.py'));m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
LOCK=threading.Lock();records=[]
def load(path):
    if path.exists():return json.loads(path.read_text())
    with gzip.open(path.with_suffix(path.suffix+'.gz'),'rt') as f:return json.load(f)
def migrate(task):
    started=time.monotonic()
    manifest,entry=task;old=m.ROOT/entry['path'];new=old.with_suffix('.xz');temp=new.with_suffix('.xz.new')
    original=hashlib.sha256();buffer=io.BytesIO()
    with gzip.open(old,'rb') as src,lzma.LZMAFile(buffer,'wb',preset=6) as dst:
        while chunk:=src.read(1024*1024):original.update(chunk);dst.write(chunk)
    payload=buffer.getvalue();verified=hashlib.sha256()
    with lzma.LZMAFile(io.BytesIO(payload),'rb') as src:
        while chunk:=src.read(1024*1024):verified.update(chunk)
    if original.digest()!=verified.digest():raise ValueError('Decoded-byte hash mismatch; original retained: '+str(old))
    if len(payload)>=old.stat().st_size:return None
    old_size=old.stat().st_size;old_allocated=old.stat().st_blocks*512;old_sha=hashlib.sha256(old.read_bytes()).hexdigest()
    m.write_bounded(temp,payload,allow_payload_reserve=True)
    os.replace(temp,new)
    row={'original_path':str(old.relative_to(m.ROOT)),'stored_path':str(new.relative_to(m.ROOT)),'original_gzip_sha256':old_sha,'xz_sha256':hashlib.sha256(payload).hexdigest(),'decoded_sha256':original.hexdigest(),'original_gzip_bytes':old_size,'xz_bytes':len(payload),'migrated_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'elapsed_seconds':time.monotonic()-started,'verification':'Exact decoded-byte SHA256 matched before atomic XZ rename and gzip removal.'}
    with LOCK:
        members=load(manifest)
        for member in members:
            if member['path']==row['original_path']:
                member['original_gzip_sha256']=member['sha256'];member['path']=row['stored_path'];member['sha256']=row['xz_sha256'];member['bytes']=row['xz_bytes'];member['compression']='xz';member['decoded_sha256']=row['decoded_sha256']
        m.write_json(manifest,members)
        # Prefer the newly written gzip manifest over a stale uncompressed copy.
        if manifest.exists() and manifest.with_suffix(manifest.suffix+'.gz').exists():
            stale_size=manifest.stat().st_size;stale_allocated=manifest.stat().st_blocks*512;manifest.unlink()
        else:stale_size=0;stale_allocated=0
        with (m.ROOT/'.disk-budget.lock').open('a') as lock:
            fcntl.flock(lock,fcntl.LOCK_EX);state_path=m.ROOT/'.disk-budget-state.json';state=json.loads(state_path.read_text())
            old.unlink();state['ci_bytes']-=old_size+stale_size;state['ci_allocated_bytes']-=old_allocated+stale_allocated;state_path.write_text(json.dumps(state,indent=2)+'\n')
        with (m.ROOT/'log-compression-migrations.jsonl').open('a') as f:f.write(json.dumps(row)+'\n')
        records.append(row)
    return row
tasks=[]
for path in list(m.ROOT.glob('*--*/runs/*/attempt-*/expanded-log-manifest.json'))+list(m.ROOT.glob('*--*/runs/*/attempt-*/expanded-log-manifest.json.gz')):
    canonical=path.with_suffix('') if path.suffix=='.gz' else path
    if path.suffix=='.gz' and canonical.exists():continue
    for member in load(canonical):
        source=m.ROOT/member['path']
        if source.suffix=='.gz' and source.stat().st_size>50*1024:tasks.append((canonical,member))
tasks.sort(key=lambda task:task[1]['bytes'],reverse=True)
print(json.dumps({'large_gzip_members':len(tasks),'gzip_bytes':sum(t[1]['bytes'] for t in tasks)}),flush=True)
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
    for i,result in enumerate(pool.map(migrate,tasks),1):
        if i%10==0:print(json.dumps({'processed':i,'of':len(tasks),'bytes_saved':sum(x['original_gzip_bytes']-x['xz_bytes'] for x in records)}),flush=True)
print(json.dumps({'migrated_members':len(records),'bytes_saved':sum(x['original_gzip_bytes']-x['xz_bytes'] for x in records)}),flush=True)
