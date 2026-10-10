#!/usr/bin/env python3
"""Remove stale canonical plaintext shadows while preserving historical provenance."""
import datetime,fcntl,gzip,hashlib,importlib.util,json,pathlib
spec=importlib.util.spec_from_file_location('ci',pathlib.Path(__file__).with_name('archive-ci.py'));m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
records=[]
for p in list(m.ROOT.rglob('*.json')):
 q=p.with_suffix('.json.gz')
 if not q.exists():continue
 raw=p.read_bytes();packed=q.read_bytes();decoded=gzip.decompress(packed);equal=raw==decoded
 if not equal and q.stat().st_mtime<p.stat().st_mtime:raise RuntimeError('Newer canonical plaintext needs explicit review:'+str(p))
 digest=hashlib.sha256(raw).hexdigest();stored=q
 if not equal:
  stored=m.ROOT/'historical-json-variants'/(digest+'.json.gz')
  if not stored.exists():m.write_bounded(stored,gzip.compress(raw,compresslevel=9,mtime=0))
 row={'original_path':str(p.relative_to(m.ROOT)),'stored_path':str(stored.relative_to(m.ROOT)),'original_sha256':digest,'compressed_sha256':hashlib.sha256(stored.read_bytes()).hexdigest(),'original_bytes':len(raw),'compressed_bytes':stored.stat().st_size,'equal_to_current_canonical':equal,'current_canonical_path':str(q.relative_to(m.ROOT)),'migrated_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'note':'Lossless identical plaintext removal.' if equal else 'Older noncanonical plaintext variant preserved losslessly; current gzip canonical is newer. Earlier empty artifact lists were incomplete collection responses, not proof of no available artifacts.'}
 with (m.ROOT/'.disk-budget.lock').open('a') as lock:
  fcntl.flock(lock,fcntl.LOCK_EX);state_path=m.ROOT/'.disk-budget-state.json';state=json.loads(state_path.read_text());state['ci_bytes']-=p.stat().st_size;state['ci_allocated_bytes']-=p.stat().st_blocks*512;p.unlink();state_path.write_text(json.dumps(state,indent=2)+'\n')
  with (m.ROOT/'metadata-compression-provenance.jsonl').open('a') as f:f.write(json.dumps(row)+'\n')
 records.append(row)
print(json.dumps({'plaintext_shadows_removed':len(records),'historical_differing_variants_preserved':sum(not x['equal_to_current_canonical'] for x in records)}))
