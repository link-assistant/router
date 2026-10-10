#!/usr/bin/env python3
"""Losslessly gzip immutable completed-run JSON and record original content hashes."""
import fcntl,gzip,hashlib,importlib.util,json,pathlib
spec=importlib.util.spec_from_file_location('ci',pathlib.Path(__file__).with_name('archive-ci.py'));m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
count=0;saved=0
for manifest in list(m.ROOT.glob('*--*/runs/*/attempt-*/expanded-log-manifest.json'))+list(m.ROOT.glob('*--*/runs/*/attempt-*/expanded-log-manifest.json.gz')):
    for path in manifest.parent.rglob('*.json'):
        if path.name=='expanded-log-manifest.json' or path.stat().st_size<5000:continue
        raw=path.read_bytes();json.loads(raw)
        packed=gzip.compress(raw,compresslevel=9,mtime=0);dest=path.with_suffix(path.suffix+'.gz')
        if len(packed)>=len(raw):continue
        m.write_bounded(dest,packed)
        item={'original_path':str(path.relative_to(m.ROOT)),'stored_path':str(dest.relative_to(m.ROOT)),'original_sha256':hashlib.sha256(raw).hexdigest(),'compressed_sha256':hashlib.sha256(packed).hexdigest(),'original_bytes':len(raw),'compressed_bytes':len(packed),'note':'Lossless compression of completed immutable API response; original hash remains verifiable after gunzip.'}
        with (m.ROOT/'.disk-budget.lock').open('a') as lock:
            fcntl.flock(lock,fcntl.LOCK_EX)
            state_path=m.ROOT/'.disk-budget-state.json';state=json.loads(state_path.read_text())
            allocated=path.stat().st_blocks*512
            path.unlink();state['ci_bytes']-=len(raw)
            if 'ci_allocated_bytes' in state:state['ci_allocated_bytes']-=allocated
            state_path.write_text(json.dumps(state,indent=2)+'\n')
            with (m.ROOT/'metadata-compression-provenance.jsonl').open('a') as output:output.write(json.dumps(item)+'\n')
        count+=1;saved+=len(raw)-len(packed)
print(json.dumps({'compressed_completed_metadata_files':count,'bytes_saved':saved}))
