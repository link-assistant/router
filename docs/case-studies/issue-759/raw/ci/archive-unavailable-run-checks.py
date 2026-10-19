#!/usr/bin/env python3
"""Collect check-suite receipts for zero-job run attempts whose ZIP API returned404."""
import gzip,importlib.util,json,pathlib
spec=importlib.util.spec_from_file_location('ci',pathlib.Path(__file__).with_name('archive-ci.py'));m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
def load(p):return json.loads(p.read_text()) if p.exists() else json.loads(gzip.decompress(p.with_suffix(p.suffix+'.gz').read_bytes()))
ledger=load(m.ROOT/'archive-completeness-ledger.json');receipts=[]
for x in ledger['attempts']:
 if x['logs_status']!='download_error':continue
 folder=(m.ROOT/x['metadata_path']).parent;r=load(folder/'run.json');endpoint=r.get('check_suite_url','').removeprefix('https://api.github.com/')
 if not endpoint:continue
 suite=m.fetch(endpoint,folder/'check-suite.json');checks=m.paginate(endpoint+'/check-runs',folder,'check-runs','check_runs')
 for check in checks:
  m.paginate(check['url'].removeprefix('https://api.github.com/')+'/annotations',folder/'annotations',str(check['id']))
 receipts.append({'run_id':x['run_id'],'attempt':x['attempt'],'workflow':x['workflow'],'jobs':x['job_count'],'check_runs':len(checks),'suite_status':suite.get('status') if suite else None,'suite_conclusion':suite.get('conclusion') if suite else None,'note':'404 means unavailable; retention expiry is not established by this response.'})
m.write_json(m.ROOT/'unavailable-run-check-receipts.json',receipts);m.fetch('rate_limit',m.ROOT/'rate-limit-final.json');print(json.dumps(receipts,indent=2))
