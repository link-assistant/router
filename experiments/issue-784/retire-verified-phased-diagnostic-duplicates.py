"""Retire six closed diagnostic duplicates after complete TAR member readback."""
import gzip,hashlib,json,os,stat,tarfile
from pathlib import Path
root=Path.cwd();manifest=Path('docs/case-studies/issue-784/evidence/phased-clone-complete.json.gz');packet=json.loads(gzip.decompress(manifest.read_bytes()));archive=Path(packet['archive']);receipt=Path('ci-logs/issue-784-restart-2/current-phased-diagnostic-duplicate-retirement.json')
assert packet['schema']=='complete-evidence-packet-v1' and not receipt.exists()
paths=['ci-logs/issue-784-restart-2/'+name for name in ['phased-equations-project-probe.json.gz','resolver-progress-diagnostic.json.gz','ordinary-resolver-progress-512.output.log.gz','bang-progress-diagnostic.json.gz','namespace-progress-diagnostic.json.gz','phased-equations-final-callback.json.gz']]
selected={path:next(row for row in packet['members'] if row['path']==path) for path in paths}
def identity(s):return (s.st_dev,s.st_ino,s.st_mode,s.st_uid,s.st_nlink,s.st_size,s.st_mtime_ns,s.st_ctime_ns)
def digest(stream):
 h=hashlib.sha256();size=0
 while block:=stream.read(65536):h.update(block);size+=len(block)
 return size,h.hexdigest()
def inactive():
 for pid in Path('/proc').iterdir():
  if not pid.name.isdecimal():continue
  try:
   for fd in (pid/'fd').iterdir():
    try:assert os.readlink(fd) not in {str(root/path) for path in paths}
    except (FileNotFoundError,ProcessLookupError):pass
  except (FileNotFoundError,ProcessLookupError,PermissionError):pass
inactive();assert not archive.is_symlink()
with archive.open('rb') as stream:assert digest(stream)==(packet['archiveBytes'],packet['archiveSha256'])
rows={}
for path,member in selected.items():
 p=Path(path);s=p.lstat();assert stat.S_ISREG(s.st_mode) and s.st_nlink==1 and s.st_uid==os.getuid()
 with p.open('rb') as stream:assert digest(stream)==(member['bytes'],member['sha256'])
 rows[path]={**member,'identity':identity(s),'allocatedBytes':s.st_blocks*512,'memberReadbackVerified':False}
with tarfile.open(archive,'r|xz') as stream:
 for member in stream:
  if member.name in rows:
   assert member.isfile()
   with stream.extractfile(member) as content:assert digest(content)==(rows[member.name]['bytes'],rows[member.name]['sha256'])
   assert not rows[member.name]['memberReadbackVerified'];rows[member.name]['memberReadbackVerified']=True
assert all(row['memberReadbackVerified'] for row in rows.values());inactive()
record={'schema':'six-exact-phased-diagnostic-duplicate-retirement-v1','archive':str(archive),'archiveBytes':packet['archiveBytes'],'archiveSha256':packet['archiveSha256'],'manifest':str(manifest),'rows':list(rows.values()),'logicalBytesReclaimed':sum(row['bytes'] for row in rows.values()),'allocatedBytesReclaimed':sum(row['allocatedBytes'] for row in rows.values()),'completeOriginalsRetained':True}
with receipt.open('x') as stream:json.dump(record,stream)
for path,row in rows.items():
 p=Path(path);assert identity(p.lstat())==tuple(row['identity'])
 with p.open('rb') as stream:assert digest(stream)==(row['bytes'],row['sha256'])
 p.unlink()
print(json.dumps({key:record[key] for key in ['schema','archive','logicalBytesReclaimed','allocatedBytesReclaimed','completeOriginalsRetained']}))
