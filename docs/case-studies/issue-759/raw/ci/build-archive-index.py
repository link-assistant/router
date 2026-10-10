#!/usr/bin/env python3
"""Build a durable, honest completion ledger from collected files, without network."""
import collections,datetime,gzip,hashlib,json,pathlib
ROOT=pathlib.Path(__file__).resolve().parent
def load(p):
    if p.exists():return json.loads(p.read_text())
    if p.with_suffix(p.suffix+'.gz').exists():
        with gzip.open(p.with_suffix(p.suffix+'.gz'),'rt') as f:return json.load(f)
    return None
requested=load(ROOT/'requested-attempt-ledger.json') or []
for item in requested:
    folder=ROOT/item['metadata_path'];folder=folder.parent
    jobs=load(folder/'jobs-all.json');logs=load(folder/'expanded-log-manifest.json')
    run=load(folder/'run.json')
    item['run_metadata_present']=run is not None
    item['archived_attempt_conclusion']=run.get('conclusion') if run else None
    item['jobs_status']='collected' if jobs is not None else ('download_error' if list(folder.glob('jobs-*.error.txt')) else 'pending')
    item['job_count']=len(jobs) if jobs is not None else None
    if logs is not None:
        missing=[x['path'] for x in logs if not (ROOT/x['path']).exists()]
        item['logs_status']='collected' if not missing else 'manifest_incomplete'
        item['log_members']=len(logs);item['compressed_log_bytes']=sum(x['bytes'] for x in logs)
        if missing:item['missing_log_members']=missing
    else:item['logs_status']='download_error' if (folder/'logs.zip.error.txt').exists() else ('extract_error' if (folder/'log-extract-error.txt').exists() else 'pending')
    if run and run.get('conclusion') not in ['failure','cancelled','timed_out','action_required','startup_failure']:
        item['logs_status']='not_required_non_adverse_historical_attempt'
        item['jobs_status']='not_required_non_adverse_historical_attempt'
    for error in folder.glob('*.error.txt'):
        item.setdefault('historical_download_errors',[]).append({'path':str(error.relative_to(ROOT)),'error':error.read_text()})
    if jobs is not None:
        item['failed_jobs']=[{'name':j['name'],'url':j['html_url'],'conclusion':j['conclusion'],'failed_steps':[s['name'] for s in j['steps'] if s['conclusion']=='failure']} for j in jobs if j['conclusion'] in ['failure','timed_out','action_required']]
summary={'generated_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'requested_attempts':len(requested),'log_status_counts':dict(collections.Counter(x['logs_status'] for x in requested)),'job_status_counts':dict(collections.Counter(x['jobs_status'] for x in requested)),'ci_evidence_bytes':sum(p.stat().st_size for p in ROOT.rglob('*') if p.is_file()),'attempts':requested}
text=json.dumps(summary,indent=2)+'\n'
with gzip.open(ROOT/'archive-completeness-ledger.json.gz','wt',compresslevel=9) as f:f.write(text)
print(json.dumps({k:v for k,v in summary.items() if k!='attempts'}))
