#!/usr/bin/env python3
"""Collect all retained relevant branch artifact metadata; archive text failure reports."""
import datetime,gzip,hashlib,importlib.util,io,json,pathlib,re,zipfile
spec=importlib.util.spec_from_file_location('ci',pathlib.Path(__file__).with_name('archive-ci.py'))
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)

def load(path):
    if path.exists():return json.loads(path.read_text())
    with gzip.open(path.with_suffix(path.suffix+'.gz'),'rt') as f:return json.load(f)

def collect_metadata(repo,pr):
    root=m.ROOT/repo.replace('/','--');pull=load(root/'pull.json');runs=load(root/'complete-branch-runs-all.json')
    ids={r['id']:r for r in runs};oldest=min(r['created_at'] for r in runs)
    artifacts=[];pages=[]
    for page in range(1,1001):
        endpoint=f'repos/{repo}/actions/artifacts?per_page=100&page={page}'
        result=m.fetch(endpoint,root/'artifacts'/f'repository-artifacts-page-{page:03d}.json')
        if result is None:break
        values=result['artifacts'];pages.extend(values)
        artifacts.extend(a for a in values if a.get('workflow_run',{}).get('id') in ids)
        if len(values)<100 or (values and max(a['created_at'] for a in values)<oldest):break
    m.write_json(root/'artifacts'/'branch-artifacts-all.json',artifacts)
    print(repo,'relevant artifacts',len(artifacts),'repository metadata scanned',len(pages),flush=True)
    return root,ids,artifacts

collections=[(repo,collect_metadata(repo,pr)) for repo,pr in m.REPOS]
for repo,(root,ids,artifacts) in collections:
    status=[]
    for artifact in artifacts:
        item={**artifact,'selection_reason':None,'downloaded_text_files':[]};status.append(item)
        run=ids[artifact['workflow_run']['id']]
        if artifact['expired']:item['selection_reason']='expired_not_downloadable';continue
        if run['conclusion'] not in ['failure','cancelled','timed_out']:item['selection_reason']='successful_run_report_metadata_only';continue
        if not re.search(r'coverage|lcov|report|logs?|junit|evidence|failure|test.results|sarif',artifact['name'],re.I):
            item['selection_reason']='artifact_name_does_not_identify_a_failure_report_or_log_metadata_retained';continue
        if m.BUDGET_EXHAUSTED.is_set():
            item['selection_reason']='not_downloaded_CI460MB_allocation_exhausted_within_total500MB';continue
        folder=root/'artifacts'/str(artifact['id'])
        if (folder/'text-manifest.json').exists():
            item['selection_reason']='previously_downloaded';item['downloaded_text_files']=load(folder/'text-manifest.json');continue
        blob=m.fetch(f"repos/{repo}/actions/artifacts/{artifact['id']}/zip",folder/'artifact.zip',binary=True)
        if blob is None:item['selection_reason']='download_failed_see_error_and_source_manifest';continue
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
                    digest=content_hash.hexdigest();dest=m.ROOT/'text-objects'/digest[:2]/(digest+'.gz')
                    if not dest.exists():m.write_bounded(dest,compressed.getvalue())
                    item['downloaded_text_files'].append({'path':str(dest.relative_to(m.ROOT)),'artifact_member_name':entry.filename,'scrubbed_content_sha256':digest,'sha256':hashlib.sha256(dest.read_bytes()).hexdigest(),'compressed_bytes':dest.stat().st_size,'original_bytes':entry.file_size,'redacted':redacted})
            m.write_json(folder/'text-manifest.json',item['downloaded_text_files'])
        except Exception as error:item['selection_reason']='zip_or_decode_error:'+str(error)
    m.write_json(root/'artifacts'/'artifact-selection-manifest.json',status)
    print(repo,'text files',sum(len(x['downloaded_text_files']) for x in status),flush=True)
m.write_json(m.ROOT/'artifact-source-manifest.json',m.MANIFEST)
