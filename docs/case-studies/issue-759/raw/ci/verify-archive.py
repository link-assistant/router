#!/usr/bin/env python3
"""Verify exact logical container/report receipts without expanding raw files."""
import argparse,collections,datetime,gzip,hashlib,importlib.util,json,pathlib,re
spec=importlib.util.spec_from_file_location('ci',pathlib.Path(__file__).with_name('archive-ci.py'));m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
pattern=re.compile(rb'\b(?:gh[pousr]_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,}|sk-[A-Za-z0-9_-]{20,}|AKIA[0-9A-Z]{16})\b')
def load(path):
    return json.loads(gzip.decompress(path.read_bytes()) if path.suffix=='.gz' else path.read_bytes())
def verify(root,repository=None,manifest_list=None,index='raw/ci/object-storage-index.json',logical_targets=None):
    store=m.Storage(root.parent.parent,repository_root=repository or m.SOURCE_REPOSITORY,index=index,cap_seconds=1800)
    root=store.root/'raw/ci'
    names=['expanded-log-manifest.json','expanded-log-manifest.json.gz','text-manifest.json','text-manifest.json.gz','direct-job-log-manifest.json','direct-job-log-manifest.json.gz']
    manifests=[store.physical(path) for path in manifest_list] if manifest_list is not None else [p for p in root.rglob('*manifest.json*') if p.name in names]
    entries=[]
    for manifest in manifests:
        data=json.loads(gzip.decompress(store.read_plain(manifest)) if manifest.suffix=='.gz' else store.read_plain(manifest))
        rows=[entry for row in data for entry in row.get('downloaded_text_files',[])] if 'artifact-selection' in manifest.name else data
        entries.extend(entry for entry in rows if entry.get('path'))
    all_reference_count=len(entries)
    if logical_targets is not None:
        if manifest_list is None or not isinstance(logical_targets,list) or not logical_targets or len(set(logical_targets))!=len(logical_targets):raise ValueError('Explicit object subset requires unique targets and complete manifest containers')
        for name in logical_targets:store.physical(name)
        selected=set(logical_targets);entries=[entry for entry in entries if entry['path'] in selected]
        if {entry['path'] for entry in entries}!=selected:raise ValueError('Declared object subset missing current receipt reference')
        if set(store.objects)-selected:raise ValueError('Declared subset omits indexed target')
    errors=[];counts=collections.Counter();decoded=0
    try:
        checked=store.verify_entries(entries,screen=pattern)
        counts.update(receipt_references=checked['receiptReferences'],unique_receipt_files=checked['uniqueLogicalObjects'],indexed_objects=checked['indexedObjects'],physical_batch_archives=checked['physicalArchives'])
        decoded=checked['decodedBytesStreamed']
        for name in {entry['path'] for entry in entries}:counts[pathlib.Path(name).suffix]+=1
    except Exception as error:errors.append({'error':str(error)})
    if manifest_list is None:
        updates={x['path']:x for x in load(root/'derived-manifest-updates.json')} if (root/'derived-manifest-updates.json').exists() else {}
        for line in gzip.open(root/'metadata-compression-provenance.jsonl.gz','rt'):
            entry=json.loads(line);name=entry['stored_path'];counts['metadata_migration_receipts']+=1
            try:
                payload=store.read_container(name);original=store.read_decoded(name);update=updates.get(name)
                if update and entry['original_sha256']==update['previous_derived_manifest_decoded_sha256']:
                    counts['superseded_derived_metadata_receipts']+=1
                    if hashlib.sha256(payload).hexdigest()!=update['current_compressed_sha256'] or hashlib.sha256(original).hexdigest()!=update['current_decoded_sha256']:raise ValueError('updated_derived_manifest_sha256_mismatch')
                elif hashlib.sha256(payload).hexdigest()!=entry['compressed_sha256'] or hashlib.sha256(original).hexdigest()!=entry['original_sha256']:raise ValueError('metadata_original_container_or_decoded_sha256_mismatch')
            except Exception as error:errors.append({'path':name,'error':str(error)})
        seen={entry['path'] for entry in entries};owned={str((store.root/path).relative_to(root)) for path in store.archives if (store.root/path).is_relative_to(root)}
        for path in root.rglob('*'):
            if not path.is_file() or str(path.relative_to(root)) in seen|owned or path.name.startswith('.disk-budget'):continue
            try:
                for _,stream in store.iter_decoded([str(path.relative_to(root))]):
                    tail=b''
                    while chunk:=stream.read(1024*1024):
                        if pattern.search(tail+chunk):raise ValueError('credential_pattern_detected_no_value_disclosed')
                        tail=chunk[-200:]
            except Exception as error:errors.append({'path':str(path.relative_to(root)),'error':str(error)})
    metrics=store.physical_metrics()
    return {'verified_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'scope':'complete-declared-current-object-subset' if logical_targets is not None else 'complete-current-archive' if manifest_list is None else 'complete-declared-current-manifest-subset','scope_manifests':len(manifests),'complete_manifest_receipt_references':all_reference_count,'excluded_receipt_references':all_reference_count-len(entries),'counts':dict(counts),'decoded_bytes_streamed':decoded,'ci_logical_bytes':sum(p.stat().st_size for p in root.rglob('*') if p.is_file()),'case_allocated_bytes':metrics['physicalAllocatedBytes'],'physical_storage':metrics,'hard_cap_bytes':500000000,'errors':errors,'method':'Exact immutable Git container identity/length/SHA and original current receipt facts; complete decoded batch members stream with exact sizes/SHA and unchanged credential screening. Logical original bytes are separate from distinct physical archive allocation.'}
if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--root',type=pathlib.Path,default=m.ROOT);parser.add_argument('--git-root',type=pathlib.Path);parser.add_argument('--index',default='raw/ci/object-storage-index.json');parser.add_argument('--manifest-list',type=pathlib.Path);parser.add_argument('--output',type=pathlib.Path);parser.add_argument('--objects-list',type=pathlib.Path)
    args=parser.parse_args();listed=load(args.manifest_list) if args.manifest_list else None
    targets=load(args.objects_list) if args.objects_list else None
    result=verify(args.root,args.git_root,listed,args.index,targets);output=args.output or args.root/'archive-integrity.json';output.write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result));raise SystemExit(bool(result['errors']) or result['case_allocated_bytes']>500000000)
