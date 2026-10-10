#!/usr/bin/env python3
"""Move pre-object-store report members into shared content-addressed gzip objects."""
import fcntl,gzip,hashlib,importlib.util,json,pathlib
spec=importlib.util.spec_from_file_location('ci',pathlib.Path(__file__).with_name('archive-ci.py'));m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
mapped={};saved=0;count=0
for manifest in m.ROOT.glob('*--*/artifacts/*/text-manifest.json'):
    entries=json.loads(manifest.read_text());changed=False
    for entry in entries:
        old=m.ROOT/entry['path']
        if 'text-objects' in old.parts or not old.exists():continue
        content=gzip.open(old,'rb').read();digest=hashlib.sha256(content).hexdigest();dest=m.ROOT/'text-objects'/digest[:2]/(digest+'.gz')
        original_size=old.stat().st_size;new_bytes=0
        if not dest.exists():
            packed=gzip.compress(content,compresslevel=6,mtime=0);m.write_bounded(dest,packed);new_bytes=len(packed)
        old_path=entry['path'];entry['original_compressed_sha256']=entry['sha256'];entry['original_storage_path']=old_path
        entry['artifact_member_name']=str(old.relative_to(manifest.parent/'text')).removesuffix('.gz')
        entry['path']=str(dest.relative_to(m.ROOT));entry['scrubbed_content_sha256']=digest;entry['sha256']=hashlib.sha256(dest.read_bytes()).hexdigest();entry['compressed_bytes']=dest.stat().st_size
        mapped[old_path]=entry.copy();changed=True;count+=1;saved+=original_size-new_bytes
        with (m.ROOT/'.disk-budget.lock').open('a') as lock:
            fcntl.flock(lock,fcntl.LOCK_EX);state_path=m.ROOT/'.disk-budget-state.json';state=json.loads(state_path.read_text())
            allocated=old.stat().st_blocks*512
            old.unlink();state['ci_bytes']-=original_size
            if 'ci_allocated_bytes' in state:state['ci_allocated_bytes']-=allocated
            state_path.write_text(json.dumps(state,indent=2)+'\n')
    if changed:m.write_json(manifest,entries)
for manifest in m.ROOT.glob('*--*/artifacts/artifact-selection-manifest.json'):
    rows=json.loads(manifest.read_text());changed=False
    for row in rows:
        for i,entry in enumerate(row['downloaded_text_files']):
            if entry['path'] in mapped:row['downloaded_text_files'][i]=mapped[entry['path']];changed=True
    if changed:m.write_json(manifest,rows)
with (m.ROOT/'artifact-storage-migrations.jsonl').open('a') as f:
    for old,entry in mapped.items():f.write(json.dumps({'original_path':old,'stored_member':entry})+'\n')
print(json.dumps({'migrated_members':count,'bytes_saved':saved}))
