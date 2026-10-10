#!/usr/bin/env python3
"""Recompute archive delivery counts from durable manifests, not estimates."""
import collections,datetime,gzip,json,pathlib
ROOT=pathlib.Path(__file__).resolve().parent
def load(p):
 return json.loads(p.read_text()) if p.exists() else json.loads(gzip.decompress(p.with_suffix(p.suffix+'.gz').read_bytes()))
ledger=load(ROOT/'archive-completeness-ledger.json');artifacts=[]
for root in sorted(ROOT.glob('*--*')):
 selection=root/'artifacts/artifact-selection-manifest.json'
 if not selection.exists() and not selection.with_suffix('.json.gz').exists():continue
 entries=load(selection);meta=load(root/'artifacts/metadata-collection-status.json');unique={x['path'] for e in entries for x in e.get('downloaded_text_files',[])}
 artifacts.append({'repository':root.name.replace('--','/'),'metadata_status':meta,'artifact_records':len(entries),'selection_reasons':dict(collections.Counter(x['selection_reason'] for x in entries)),'bundles_with_current_text_manifests':sum((root/'artifacts'/str(e['id'])/'text-manifest.json').exists() or (root/'artifacts'/str(e['id'])/'text-manifest.json.gz').exists() for e in entries),'text_member_references':sum(len(e.get('downloaded_text_files',[])) for e in entries),'unique_stored_text_objects_referenced':len(unique),'unique_stored_text_bytes_referenced':sum((ROOT/x).stat().st_size for x in unique),'native_binary_bytes_metadata_only':sum(e['size_in_bytes'] for e in entries if e['selection_reason']=='native_coverage_object_or_profile_bytes_metadata_only_not_a_textual_failure_report')})
ci_files=[p for p in ROOT.rglob('*') if p.is_file()];case_files=[p for p in ROOT.parent.parent.rglob('*') if p.is_file()];fs=__import__('os').statvfs(ROOT)
result={'generated_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'requested_attempts':ledger['requested_attempts'],'log_status_counts':ledger['log_status_counts'],'job_status_counts':ledger['job_status_counts'],'requested_attempts_by_repository':dict(collections.Counter(x['repository'] for x in ledger['attempts'])),'artifacts':artifacts,'ci_files':len(ci_files),'ci_logical_bytes':sum(p.stat().st_size for p in ci_files),'ci_allocated_bytes':sum(p.stat().st_blocks*512 for p in ci_files),'case_allocated_bytes':sum(p.stat().st_blocks*512 for p in case_files),'hard_evidence_cap_bytes':500000000,'filesystem_available_bytes':fs.f_bavail*fs.f_frsize,'filesystem_total_bytes':fs.f_blocks*fs.f_frsize,'note':'Disk measurements describe this collection time. Source incident figures are separately self-reported. Counts come directly from current manifests; source-manifest JSONL preserves historical unavailable/budget/rate responses.'}
(ROOT/'collection-final-summary.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2))
