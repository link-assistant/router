#!/usr/bin/env python3
"""Verified lossless artifact-object XZ migration; run with artifact writers stopped."""
import concurrent.futures,datetime,fcntl,gzip,hashlib,importlib.util,io,json,lzma,os,pathlib,time
spec=importlib.util.spec_from_file_location('ci',pathlib.Path(__file__).with_name('archive-ci.py'));m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
def migrate(old):
 started=time.monotonic();decoded=hashlib.sha256();buf=io.BytesIO()
 with gzip.open(old,'rb') as src,lzma.LZMAFile(buf,'wb',preset=6) as dst:
  while chunk:=src.read(1024*1024):decoded.update(chunk);dst.write(chunk)
 if decoded.hexdigest()!=old.stem:raise ValueError('Object filename/decodedSHA mismatch:'+str(old))
 payload=buf.getvalue()
 if len(payload)>=old.stat().st_size:return None
 check=hashlib.sha256()
 with lzma.LZMAFile(io.BytesIO(payload),'rb') as src:
  while chunk:=src.read(1024*1024):check.update(chunk)
 if check.digest()!=decoded.digest():raise ValueError('Exact decodedSHA mismatch; gzip retained')
 new=old.with_suffix('.xz');temporary=new.with_suffix('.xz.new');old_bytes=old.stat().st_size;old_alloc=old.stat().st_blocks*512;old_sha=hashlib.sha256(old.read_bytes()).hexdigest()
 m.write_bounded(temporary,payload,allow_payload_reserve=True);os.replace(temporary,new)
 row={'original_path':str(old.relative_to(m.ROOT)),'stored_path':str(new.relative_to(m.ROOT)),'original_gzip_sha256':old_sha,'xz_sha256':hashlib.sha256(payload).hexdigest(),'decoded_sha256':decoded.hexdigest(),'original_gzip_bytes':old_bytes,'xz_bytes':len(payload),'migrated_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'elapsed_seconds':time.monotonic()-started,'verification':'Exact decodedSHA matches both original gzip and content-addressed filename before atomic XZ rename and gzip removal.'}
 with (m.ROOT/'.disk-budget.lock').open('a') as lock:
  fcntl.flock(lock,fcntl.LOCK_EX);state_path=m.ROOT/'.disk-budget-state.json';state=json.loads(state_path.read_text());old.unlink();state['ci_bytes']-=old_bytes;state['ci_allocated_bytes']-=old_alloc;state_path.write_text(json.dumps(state,indent=2)+'\n')
  with (m.ROOT/'artifact-object-compression-migrations.jsonl').open('a') as f:f.write(json.dumps(row)+'\n')
 return row
objects=sorted((p for p in (m.ROOT/'text-objects').rglob('*.gz') if p.stat().st_size>50*1024),key=lambda p:p.stat().st_size,reverse=True)
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:rows=[x for x in pool.map(migrate,objects) if x]
changes={x['original_path']:x for x in rows};updated=0
for p in list(m.ROOT.glob('*--*/artifacts/*/text-manifest.json*'))+list(m.ROOT.glob('*--*/artifacts/artifact-selection-manifest.json*')):
 if p.suffix not in ['.json','.gz']:continue
 data=json.loads(gzip.decompress(p.read_bytes())) if p.suffix=='.gz' else json.loads(p.read_text());entries=[f for x in data for f in x.get('downloaded_text_files',[])] if 'artifact-selection' in p.name else data;dirty=False
 for entry in entries:
  row=changes.get(entry.get('path'))
  if not row:continue
  entry.update(prior_gzip_storage_path=entry['path'],prior_gzip_storage_sha256=entry['sha256'],path=row['stored_path'],sha256=row['xz_sha256'],compressed_bytes=row['xz_bytes'],compression='xz');dirty=True
 if dirty:
  raw=(json.dumps(data,indent=2)+'\n').encode();m.write_bounded(p,gzip.compress(raw,compresslevel=9,mtime=0) if p.suffix=='.gz' else raw,allow_payload_reserve=True);updated+=1
print(json.dumps({'objects_migrated':len(rows),'bytes_saved':sum(x['original_gzip_bytes']-x['xz_bytes'] for x in rows),'manifests_remapped':updated}))
