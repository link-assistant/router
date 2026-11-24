#!/usr/bin/env python3
"""Check direct failed-job logs omitted from a captured complete run ZIP."""
import gzip,hashlib,importlib.util,json,pathlib
spec=importlib.util.spec_from_file_location('ci',pathlib.Path(__file__).with_name('archive-ci.py'));m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
folder=m.ROOT/'link-assistant--formal-ai/runs/37652296393/attempt-1'
def load(p):
 if p.exists():return json.loads(p.read_text())
 return json.loads(gzip.decompress(p.with_suffix(p.suffix+'.gz').read_bytes()))
jobs=load(folder/'jobs-all.json'); wanted={112908561634,112908561715,112908562017,112908562138,112908562255,112908562542};receipts=[]
for job in jobs:
 if job['id'] not in wanted:continue
 endpoint=f"repos/link-assistant/formal-ai/actions/jobs/{job['id']}/logs";path=folder/'direct-job-logs'/f"{job['id']}.txt.gz"
 blob=m.fetch(endpoint,path,binary=True)
 receipt={'job_id':job['id'],'job_name':job['name'],'endpoint':'https://api.github.com/'+endpoint,'status':'unavailable_see_error_and_source_manifest'}
 if blob is not None:
  text=m.scrub(blob.decode(errors='replace')).encode();payload=gzip.compress(text,mtime=0)
  m.write_bounded(path,payload);receipt.update(status='available',path=str(path.relative_to(m.ROOT)),bytes=len(payload),sha256=hashlib.sha256(payload).hexdigest(),decoded_sha256=hashlib.sha256(text).hexdigest(),decoded_bytes=len(text))
 if job.get('check_run_url'):
  annotations=m.paginate(job['check_run_url'].removeprefix('https://api.github.com/')+'/annotations',folder/'annotations',str(job['id']))
  receipt['annotations']=len(annotations)
 receipts.append(receipt)
m.write_json(folder/'direct-job-log-manifest.json',receipts)
print(json.dumps(receipts,indent=2))
