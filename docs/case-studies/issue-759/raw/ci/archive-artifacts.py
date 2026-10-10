#!/usr/bin/env python3
"""Collect all retained relevant branch artifact metadata; archive text failure reports."""
import concurrent.futures,datetime,gzip,hashlib,importlib.util,io,json,lzma,pathlib,re,sys,zipfile
spec=importlib.util.spec_from_file_location('ci',pathlib.Path(__file__).with_name('archive-ci.py'))
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)

def load(path):
    if path.exists():return json.loads(path.read_text())
    with gzip.open(path.with_suffix(path.suffix+'.gz'),'rt') as f:return json.load(f)

def collect_metadata(repo,pr):
    root=m.ROOT/repo.replace('/','--');pull=load(root/'pull.json');runs=load(root/'complete-branch-runs-all.json')
    ids={r['id']:r for r in runs};oldest=min(r['created_at'] for r in runs)
    artifacts=[];pages=[]
    per_page=50 if repo=='link-assistant/formal-ai' else 100
    complete=False
    for page in range(1,1001):
        endpoint=f'repos/{repo}/actions/artifacts?per_page={per_page}&page={page}'
        name=f'repository-artifacts-per-page{per_page}-page-{page:03d}.json' if per_page!=100 else f'repository-artifacts-page-{page:03d}.json'
        result=m.fetch(endpoint,root/'artifacts'/name)
        if result is None:break
        values=result['artifacts'];pages.extend(values)
        artifacts.extend(a for a in values if a.get('workflow_run',{}).get('id') in ids)
        if len(values)<per_page or (values and max(a['created_at'] for a in values)<oldest):complete=True;break
    repeated=len(artifacts)-len({a['id'] for a in artifacts})
    artifacts=list({a['id']:a for a in artifacts}.values())
    m.write_json(root/'artifacts'/'branch-artifacts-all.json',artifacts)
    m.write_json(root/'artifacts'/'metadata-collection-status.json',{'complete_available_inventory':complete,'per_page':per_page,'repository_artifacts_scanned':len(pages),'branch_snapshot_relevant_artifacts':len(artifacts),'duplicate_artifact_ids_removed':repeated,'oldest_run_in_snapshot':oldest,'note':'Membership is by run id in the pinned complete branch-run snapshot; later-created runs are outside this frozen evidence population.'})
    print(repo,'relevant artifacts',len(artifacts),'repository metadata scanned',len(pages),flush=True)
    return root,ids,artifacts

selected=m.REPOS
if '--repo' in sys.argv:selected=[x for x in selected if x[0]==sys.argv[sys.argv.index('--repo')+1]]
collections=[(repo,collect_metadata(repo,pr)) for repo,pr in selected]
if '--metadata-only' in sys.argv:sys.exit(0)
for repo,(root,ids,artifacts) in collections:
    status=[]
    def collect_artifact(artifact):
        item={**artifact,'selection_reason':None,'downloaded_text_files':[]}
        run=ids[artifact['workflow_run']['id']]
        if artifact['expired']:item['selection_reason']='expired_not_downloadable';return item
        if run['conclusion'] not in ['failure','cancelled','timed_out']:item['selection_reason']='successful_run_report_metadata_only';return item
        if artifact['name'].endswith('.dockerbuild'):
            item['selection_reason']='native_dockerbuild_record_metadata_only_not_a_textual_failure_report';return item
        if re.fullmatch(r'coverage-(?:objects|profile-\d+)|browser-coverage-shard-\d+',artifact['name']):
            item['selection_reason']='native_coverage_object_or_profile_bytes_metadata_only_not_a_textual_failure_report';return item
        if not re.search(r'coverage|lcov|report|logs?|junit|evidence|failure|test.results|sarif',artifact['name'],re.I):
            item['selection_reason']='artifact_name_does_not_identify_a_failure_report_or_log_metadata_retained';return item
        folder=root/'artifacts'/str(artifact['id'])
        if (folder/'text-manifest.json').exists() or (folder/'text-manifest.json.gz').exists():
            item['selection_reason']='previously_downloaded';item['downloaded_text_files']=load(folder/'text-manifest.json');return item
        budget_path=m.ROOT/'.disk-budget-state.json'
        # Logs and all run/job metadata are collected first. Text artifacts may
        # use the previously reserved metadata allocation, still bounded at460MB.
        if budget_path.exists() and json.loads(budget_path.read_text()).get('ci_allocated_bytes',0)>=460000000:m.BUDGET_EXHAUSTED.set()
        if m.BUDGET_EXHAUSTED.is_set():
            item['selection_reason']='not_downloaded_CI_allocated_disk_budget_exhausted_within_total500MB';return item
        blob=m.fetch(f"repos/{repo}/actions/artifacts/{artifact['id']}/zip",folder/'artifact.zip',binary=True)
        if blob is None:item['selection_reason']='download_failed_see_error_and_source_manifest';return item
        item['selection_reason']='selected_textual_failure_report'
        try:
            with zipfile.ZipFile(io.BytesIO(blob)) as z:
                for entry in z.infolist():
                    if entry.is_dir():continue
                    parts=pathlib.PurePosixPath(entry.filename).parts
                    if '..' in parts or entry.filename.startswith('/'):continue
                    suffix=pathlib.Path(entry.filename).suffix.lower()
                    if suffix not in ['.txt','.log','.json','.jsonl','.xml','.csv','.tsv','.md','.html','.css','.js','.info','.lcov','.sarif','.yml','.yaml','']:
                        item.setdefault('unselected_binary_entries',[]).append({'path':entry.filename,'bytes':entry.file_size});continue
                    redacted=False
                    content_hash=hashlib.sha256();compressed=io.BytesIO()
                    with z.open(entry) as src, gzip.GzipFile(fileobj=compressed,mode='wb',compresslevel=6,mtime=0) as packed:
                        dst=io.TextIOWrapper(packed,encoding='utf-8')
                        for line in io.TextIOWrapper(src,encoding='utf-8',errors='replace'):
                            if '\x00' in line:raise ValueError('NUL byte in nominally textual artifact member '+entry.filename)
                            clean=m.scrub(line);redacted|=line!=clean;dst.write(clean)
                            content_hash.update(clean.encode())
                        dst.flush()
                    digest=content_hash.hexdigest();dest=m.ROOT/'text-objects'/digest[:2]/(digest+'.gz');payload=compressed.getvalue();compression='gzip'
                    if dest.with_suffix('.xz').exists():dest=dest.with_suffix('.xz');compression='xz'
                    elif not dest.exists() and len(payload)>200*1024:
                        packed_buffer=io.BytesIO()
                        with gzip.GzipFile(fileobj=io.BytesIO(payload),mode='rb') as src,lzma.LZMAFile(packed_buffer,'wb',preset=6) as dst:
                            while chunk:=src.read(1024*1024):dst.write(chunk)
                        packed=packed_buffer.getvalue()
                        if len(packed)<len(payload):dest=dest.with_suffix('.xz');payload=packed;compression='xz'
                    if not dest.exists():m.write_bounded(dest,payload,allow_payload_reserve=True)
                    item['downloaded_text_files'].append({'path':str(dest.relative_to(m.ROOT)),'artifact_member_name':entry.filename,'scrubbed_content_sha256':digest,'sha256':hashlib.sha256(dest.read_bytes()).hexdigest(),'compressed_bytes':dest.stat().st_size,'original_bytes':entry.file_size,'redacted':redacted,'compression':compression})
            m.write_json(folder/'text-manifest.json',item['downloaded_text_files'])
        except Exception as error:item['selection_reason']='zip_or_decode_error:'+str(error)
        return item
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        for artifact_index,item in enumerate(pool.map(collect_artifact,artifacts),1):
            status.append(item)
            if artifact_index%250==0:print(repo,'artifact selections processed',artifact_index,'of',len(artifacts),'text members',sum(len(x['downloaded_text_files']) for x in status),flush=True)
    m.write_json(root/'artifacts'/'artifact-selection-manifest.json',status)
    print(repo,'text files',sum(len(x['downloaded_text_files']) for x in status),flush=True)
if m.MANIFEST:m.write_json(m.ROOT/'artifact-source-manifest.json',m.MANIFEST)
