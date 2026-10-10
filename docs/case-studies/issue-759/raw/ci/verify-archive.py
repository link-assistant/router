#!/usr/bin/env python3
"""Verify retained log/report receipts without expanding files on disk."""
import collections,datetime,gzip,hashlib,json,lzma,pathlib,re
ROOT=pathlib.Path(__file__).resolve().parent
errors=[];seen=set();counts=collections.Counter();decoded_bytes=0
updates={x['path']:x for x in json.loads((ROOT/'derived-manifest-updates.json').read_text())} if (ROOT/'derived-manifest-updates.json').exists() else {}
pattern=re.compile(rb'\b(?:gh[pousr]_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,}|sk-[A-Za-z0-9_-]{20,}|AKIA[0-9A-Z]{16})\b')
def load(p):
 return json.loads(gzip.decompress(p.read_bytes())) if p.suffix=='.gz' else json.loads(p.read_text())
for manifest in ROOT.rglob('*manifest.json*'):
 if manifest.name not in ['expanded-log-manifest.json','expanded-log-manifest.json.gz','text-manifest.json','text-manifest.json.gz','direct-job-log-manifest.json','direct-job-log-manifest.json.gz']:continue
 for entry in load(manifest):
  if not entry.get('path'):continue
  p=ROOT/entry['path'];counts['receipt_references']+=1
  if not p.exists():errors.append({'manifest':str(manifest.relative_to(ROOT)),'path':entry['path'],'error':'missing_file'});continue
  actual=hashlib.sha256(p.read_bytes()).hexdigest()
  if entry.get('sha256') and actual!=entry['sha256']:errors.append({'path':entry['path'],'error':'stored_sha256_mismatch'})
  if p in seen:continue
  seen.add(p);counts['unique_receipt_files']+=1;digest=hashlib.sha256();tail=b''
  opener=lzma.open if p.suffix=='.xz' else gzip.open if p.suffix=='.gz' else open
  try:
   with opener(p,'rb') as f:
    while chunk:=f.read(1024*1024):
     digest.update(chunk);decoded_bytes+=len(chunk)
     if pattern.search(tail+chunk):errors.append({'path':entry['path'],'error':'credential_pattern_detected_no_value_disclosed'});break
     tail=chunk[-200:]
  except Exception as e:errors.append({'path':entry['path'],'error':str(e)})
  expected=entry.get('decoded_sha256',entry.get('scrubbed_content_sha256'))
  if expected and expected!=digest.hexdigest():errors.append({'path':entry['path'],'error':'decoded_sha256_mismatch'})
  counts[p.suffix]+=1
for line in (ROOT/'metadata-compression-provenance.jsonl').open():
 entry=json.loads(line);p=ROOT/entry['stored_path'];counts['metadata_migration_receipts']+=1
 if not p.exists():errors.append({'path':entry['stored_path'],'error':'missing_migrated_metadata'});continue
 update=updates.get(entry['stored_path'])
 if update and entry['original_sha256']==update['previous_derived_manifest_decoded_sha256']:
  counts['superseded_derived_metadata_receipts']+=1
  if hashlib.sha256(p.read_bytes()).hexdigest()!=update['current_compressed_sha256'] or hashlib.sha256(gzip.decompress(p.read_bytes())).hexdigest()!=update['current_decoded_sha256']:errors.append({'path':entry['stored_path'],'error':'updated_derived_manifest_sha256_mismatch'})
  continue
 if hashlib.sha256(p.read_bytes()).hexdigest()!=entry['compressed_sha256']:errors.append({'path':entry['stored_path'],'error':'metadata_compressed_sha256_mismatch'})
 if hashlib.sha256(gzip.decompress(p.read_bytes())).hexdigest()!=entry['original_sha256']:errors.append({'path':entry['stored_path'],'error':'metadata_original_sha256_mismatch'})
for p in ROOT.rglob('*'):
 if not p.is_file() or p in seen or p.name.startswith('.disk-budget'):continue
 opener=lzma.open if p.suffix=='.xz' else gzip.open if p.suffix=='.gz' else open
 try:
  with opener(p,'rb') as f:
   tail=b''
   while chunk:=f.read(1024*1024):
    if pattern.search(tail+chunk):errors.append({'path':str(p.relative_to(ROOT)),'error':'credential_pattern_detected_no_value_disclosed'});break
    tail=chunk[-200:]
 except Exception as e:errors.append({'path':str(p.relative_to(ROOT)),'error':str(e)})
case=ROOT.parent.parent
result={'verified_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'counts':dict(counts),'decoded_bytes_streamed':decoded_bytes,'ci_logical_bytes':sum(p.stat().st_size for p in ROOT.rglob('*') if p.is_file()),'case_allocated_bytes':sum(p.stat().st_blocks*512 for p in case.rglob('*') if p.is_file()),'hard_cap_bytes':500000000,'errors':errors,'method':'Checks every current run-log, direct-job and artifact text manifest; exact compressed receipt hashes, declared decoded hashes, streaming UTF8-token patterns. No raw files expanded on disk. Historical migration receipts preserve old paths/hashes separately.'}
(ROOT/'archive-integrity.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result));raise SystemExit(bool(errors) or result['case_allocated_bytes']>result['hard_cap_bytes'])
