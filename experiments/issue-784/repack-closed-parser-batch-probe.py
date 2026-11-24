"""Losslessly repack one closed diagnostic while enforcing the task evidence cap."""
import gzip, hashlib, json, lzma, os
from pathlib import Path
base=Path('ci-logs/issue-784-restart-2')
source=base/'current-parser-history-equation-batch-probe-v2.json.gz'
target=base/'current-parser-history-equation-batch-probe-v2.json.xz'
receipt=base/'current-parser-history-batch-probe-repacking.json'
assert not target.exists() and not receipt.exists()
state=source.lstat()
assert source.is_file() and not source.is_symlink() and state.st_nlink==1 and state.st_uid==os.getuid()
def identity(s):return (s.st_dev,s.st_ino,s.st_mode,s.st_size,s.st_mtime_ns,s.st_ctime_ns)
def inactive():
 for pid in Path('/proc').iterdir():
  if not pid.name.isdecimal():continue
  try:
   for fd in (pid/'fd').iterdir():
    try:assert os.readlink(fd)!=str(source.resolve())
    except (FileNotFoundError,ProcessLookupError):pass
  except (FileNotFoundError,ProcessLookupError,PermissionError):pass
def census():
 total=0
 for root in map(Path,['ci-logs','docs/case-studies/issue-784','experiments/issue-784','js/node_modules/.node-case-deadlines']):
  for parent,dirs,files in os.walk(root):
   if root==Path('experiments/issue-784') and Path(parent)==root:dirs[:]=[name for name in dirs if name!='toolchain']
   for name in files:
    path=Path(parent)/name
    if not path.is_symlink():total+=path.stat().st_size
 return total
inactive();before=census();remaining=499980000-before
assert remaining>0
rawhash=hashlib.sha256();rawsize=0
with gzip.open(source,'rb') as original,target.open('xb') as output:
 compressor=lzma.LZMACompressor(preset=1)
 while block:=original.read(65536):
  rawhash.update(block);rawsize+=len(block);assert rawsize<=64*1024*1024
  packed=compressor.compress(block)
  assert output.tell()+len(packed)<=remaining
  output.write(packed)
 packed=compressor.flush();assert output.tell()+len(packed)<=remaining;output.write(packed)
check=hashlib.sha256();size=0
with lzma.open(target,'rb') as stream:
 while block:=stream.read(65536):check.update(block);size+=len(block)
assert (size,check.hexdigest())==(rawsize,rawhash.hexdigest())
assert identity(source.lstat())==identity(state);inactive()
record={'schema':'closed-parser-batch-probe-lossless-repacking-v1','source':str(source),'sourceBytes':state.st_size,'sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'retained':str(target),'retainedBytes':target.stat().st_size,'retainedSha256':hashlib.sha256(target.read_bytes()).hexdigest(),'completeDecodedBytes':size,'completeDecodedSha256':check.hexdigest(),'logicalBytesReclaimed':state.st_size-target.stat().st_size,'allDecodedOriginalBytesPreserved':True,'censusBefore':before}
receipt.write_text(json.dumps(record));assert identity(source.lstat())==identity(state);source.unlink();print(json.dumps(record))
