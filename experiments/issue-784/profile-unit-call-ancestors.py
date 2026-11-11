"""Read one finite complete CPU profile; report sampled call ancestry only."""
import argparse
import collections
import gzip
import hashlib
import json
from pathlib import Path

parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('profile',type=Path)
parser.add_argument('receipt',type=Path)
args=parser.parse_args()
raw=args.profile.read_bytes()
assert len(raw)<=4*1024*1024
with gzip.open(args.profile,'rb') as stream:
 decoded=stream.read(8*1024*1024+1)
assert len(decoded)<=8*1024*1024
profile=json.loads(decoded)
assert len(profile['nodes'])<=65536 and len(profile['samples'])<=100000
nodes={node['id']:node for node in profile['nodes']}
parents={}
for node in nodes.values():
 for child in node.get('children',[]):
  assert child not in parents
  parents[child]=node['id']
frames=[]
def ancestry(key):
 result=[]
 seen=set()
 while key in nodes:
  assert key not in seen and len(seen)<=len(nodes)
  seen.add(key)
  node=nodes[key]
  result.append({'id':key,**node['callFrame']})
  key=parents.get(key)
 return result
for node in nodes.values():
 frame=node['callFrame']
 if frame['url'].endswith('/router-core-unit-matches.test.mjs'):
  frames.append({'id':node['id'],**frame})
counts=collections.Counter(profile['samples'])
selected=[]
for key,count in counts.most_common():
 chain=ancestry(key)
 if any(row['url'].endswith('/router-core-unit-matches.test.mjs') for row in chain):
  selected.append({'samples':count,'ancestry':chain})
report={'schema':'finite-unit-profile-call-ancestry-v1','source':str(args.profile),'compressedBytes':len(raw),'compressedSha256':hashlib.sha256(raw).hexdigest(),'decodedBytes':len(decoded),'nodes':len(nodes),'samples':len(profile['samples']),'unitFrames':frames,'sampledUnitAncestries':selected,'sampledUnitSamples':sum(row['samples'] for row in selected),'qualification':'Sampled ancestry identifies executing case frames; not an OOM cause, completion observation or controlled timing comparison.','runtimeAuthority':False,'executableGain':0}
with args.receipt.open('xb') as stream:
 stream.write(gzip.compress(json.dumps(report,separators=(',',':')).encode(),mtime=0))
assert json.load(gzip.open(args.receipt,'rt'))==report
print(json.dumps({key:value for key,value in report.items() if key not in ['sampledUnitAncestries']}))
