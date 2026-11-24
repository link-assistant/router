#!/usr/bin/env python3
"""Recompute historical receipt counts and separate current physical measures."""
import collections,datetime,gzip,hashlib,json,pathlib,importlib.util,os
spec=importlib.util.spec_from_file_location('ci',pathlib.Path(__file__).with_name('archive-ci.py'));m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
ROOT=m.ROOT

def summarize(root,repository=None,index='raw/ci/object-storage-index.json'):
    store=m.Storage(root.parent.parent,repository_root=repository or m.SOURCE_REPOSITORY,index=index)
    root=store.root/'raw/ci'
    def load(path):
        selected=path if path.exists() else path.with_suffix(path.suffix+'.gz')
        payload=store.read_plain(selected)
        return json.loads(gzip.decompress(payload) if selected.suffix=='.gz' else payload)
    ledger=load(root/'archive-completeness-ledger.json');artifacts=[]
    for folder in sorted(root.glob('*--*')):
        selection=folder/'artifacts/artifact-selection-manifest.json'
        if not selection.exists() and not selection.with_suffix('.json.gz').exists():continue
        entries=load(selection);meta=load(folder/'artifacts/metadata-collection-status.json');historical={};current={};current_refs=0;current_manifests=0
        for row in entries:
            if type(row['id']) is not int or row['id']<0:raise ValueError('Invalid artifact identity')
            for entry in row.get('downloaded_text_files',[]):
                name=entry['path'];store.physical(name)
                size=entry.get('compressed_bytes',entry.get('bytes'))
                if type(size) is not int or size<0 or (name in historical and historical[name]!=size):raise ValueError('Inconsistent historical selection receipt size')
                historical[name]=size
            manifest=folder/'artifacts'/str(row['id'])/'text-manifest.json'
            if not manifest.exists() and not manifest.with_suffix('.json.gz').exists():continue
            current_manifests+=1
            for entry in load(manifest):
                name=entry['path'];current_refs+=1
                if name in current:continue
                payload=store.read_container(name)
                if entry.get('sha256') and hashlib.sha256(payload).hexdigest()!=entry['sha256']:raise ValueError('Current text manifest container hash mismatch')
                current[name]=len(payload)
        artifacts.append({'repository':folder.name.replace('--','/'),'metadata_status':meta,'artifact_records':len(entries),'selection_reasons':dict(collections.Counter(x['selection_reason'] for x in entries)),'bundles_with_current_text_manifests':current_manifests,'text_member_references':sum(len(e.get('downloaded_text_files',[])) for e in entries),'unique_stored_text_objects_referenced':len(historical),'unique_stored_text_bytes_referenced':sum(historical.values()),'historical_selection_scope':'Original selection receipt paths and compressed_bytes/bytes facts; these fields do not measure current physical storage.','current_text_manifest_measurement':{'manifest_containers':current_manifests,'receipt_references':current_refs,'unique_logical_objects':len(current),'original_container_bytes':sum(current.values()),'method':'Exact currently referenced logical containers through shared resolver; includes immutable original Git container bytes for indexed targets.'},'native_binary_bytes_metadata_only':sum(e['size_in_bytes'] for e in entries if e['selection_reason']=='native_coverage_object_or_profile_bytes_metadata_only_not_a_textual_failure_report')})
    ci_files=[p for p in root.rglob('*') if p.is_file()];metrics=store.physical_metrics();fs=os.statvfs(root)
    return {'generated_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'requested_attempts':ledger['requested_attempts'],'log_status_counts':ledger['log_status_counts'],'job_status_counts':ledger['job_status_counts'],'requested_attempts_by_repository':dict(collections.Counter(x['repository'] for x in ledger['attempts'])),'artifacts':artifacts,'ci_files':len(ci_files),'ci_logical_bytes':sum(p.stat().st_size for p in ci_files),'ci_allocated_bytes':sum(p.stat().st_blocks*512 for p in ci_files),'case_allocated_bytes':metrics['physicalAllocatedBytes'],'storage_physical':metrics,'logical_container_bytes_referenced':sum(a['current_text_manifest_measurement']['original_container_bytes'] for a in artifacts),'historical_selection_container_bytes_referenced':sum(a['unique_stored_text_bytes_referenced'] for a in artifacts),'hard_evidence_cap_bytes':500000000,'filesystem_available_bytes':fs.f_bavail*fs.f_frsize,'filesystem_total_bytes':fs.f_blocks*fs.f_frsize,'field_scopes':{'artifacts_existing_reference_fields':'unchanged historical selection receipt facts','artifacts_current_text_manifest_measurement':'current logical container bytes through resolver','storage_physical':'distinct current physical files/inodes','ci_logical_bytes':'current physical files logical sizes'},'note':'Disk measurements describe this collection time. Historical selection paths/hashes/sizes remain source facts, distinct from current logical references and distinct physical allocation.'}

if __name__=='__main__':
    result=summarize(ROOT,os.environ.get('ROUTER_CI_GIT_ROOT'),os.environ.get('ROUTER_CI_STORAGE_INDEX','raw/ci/object-storage-index.json'));(ROOT/'collection-final-summary.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2))
