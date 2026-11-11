"""Retire seven identified inactive task DATA directories after whole Git recovery."""
import gzip,hashlib,io,json,os,subprocess,tarfile
from pathlib import Path
witness='b366d594d8b84bdb7143c516e1863e29c9656e20'
receipt=Path('docs/case-studies/issue-784/evidence/current-source-proof-origin.json.gz')
record=json.loads(gzip.decompress(receipt.read_bytes()))
assert subprocess.check_output(['git','show',witness+':'+str(receipt)])==receipt.read_bytes()
subprocess.run(['git','merge-base','--is-ancestor',witness,'HEAD'],check=True)
archive=Path(record['archive']);immutable=subprocess.check_output(['git','show',witness+':'+str(archive)])
assert immutable==archive.read_bytes() and len(immutable)==record['bytes']
assert hashlib.sha256(immutable).hexdigest()==record['sha256']
expected={row.get('archivePath',row['path']):row for row in record['members']}
seen=set()
with tarfile.open(fileobj=io.BytesIO(immutable),mode='r|gz') as stream:
 for member in stream:
  assert member.isfile() and member.name not in seen
  body=stream.extractfile(member).read()
  if member.name in expected:
   row=expected[member.name];assert len(body)==row['bytes'] and hashlib.sha256(body).hexdigest()==row['sha256']
  else:
   prefix='baseline/'+record['recordingHead']+'/'
   assert member.name.startswith(prefix)
   assert body==subprocess.check_output(['git','show',record['recordingHead']+':'+member.name[len(prefix):]])
  seen.add(member.name)
assert set(expected)<=seen
names=['1KaZea','6GE3wS','CTQytL','KSCmw6','n2RGrw','ol1TVE','zX8Yjz']
directories=[Path('/tmp/router-owned-unit-matches-data-'+name) for name in names]
files=[]
for directory in directories:
 assert directory.is_dir() and not directory.is_symlink()
 selected=[row for row in record['members'] if Path(row['path']).parent==directory]
 assert selected and {Path(row['path']) for row in selected}==set(directory.iterdir())
 for row in selected:
  path=Path(row['path']);assert path.is_file() and not path.is_symlink()
  state=path.stat();identity=[state.st_dev,state.st_ino,state.st_size,state.st_mtime_ns,state.st_ctime_ns]
  assert identity==row['identity']
  assert hashlib.sha256(path.read_bytes()).hexdigest()==row['sha256']
  files.append({'path':str(path),'identity':identity,'bytes':state.st_size,'allocatedBytes':state.st_blocks*512,'sha256':row['sha256']})
selected_paths={row['path'] for row in files}
for process in Path('/proc').iterdir():
 if not process.name.isdecimal():continue
 try:
  for leaf in ['cwd','exe',*('fd/'+p.name for p in (process/'fd').iterdir())]:
   try:
    target=os.readlink(process/leaf)
    assert target not in selected_paths and not any(target==str(d) or target.startswith(str(d)+'/') for d in directories),'task directory active'
   except (FileNotFoundError,ProcessLookupError):pass
 except (FileNotFoundError,ProcessLookupError,PermissionError):pass
for row in files:
 path=Path(row['path']);state=path.stat()
 assert [state.st_dev,state.st_ino,state.st_size,state.st_mtime_ns,state.st_ctime_ns]==row['identity']
 assert hashlib.sha256(path.read_bytes()).hexdigest()==row['sha256']
for row in files:Path(row['path']).unlink()
for directory in directories:directory.rmdir()
result={'schema':'inactive-complete-unit-data-retirement-v1','witness':witness,'archive':str(archive),'archiveSha256':record['sha256'],'wholeArchiveMembersVerified':len(seen),'directories':[str(p) for p in directories],'removed':files,'logicalBytesRemoved':sum(row['bytes'] for row in files),'allocatedBytesRemoved':sum(row['allocatedBytes'] for row in files),'completeImmutableMemberReadbackVerified':True,'processDescriptorAndInodeChecksPassed':True,'otherPathsRemoved':False,'activeBuildsRemoved':False}
destination=Path('ci-logs/issue-784-restart-2/current-unit-data-retirement.json.gz')
with destination.open('xb') as output:output.write(gzip.compress(json.dumps(result,separators=(',',':')).encode(),mtime=0))
assert json.load(gzip.open(destination,'rt'))==result
print(json.dumps({k:v for k,v in result.items() if k!='removed'}))
