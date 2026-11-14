"""Draft the complete controller with one fresh stat per new directory entry."""
import ast
from pathlib import Path

original = Path('scripts/propose-core-adoption.py').read_text()
node, = [node for node in ast.parse(original).body if isinstance(node, ast.FunctionDef) and node.name == 'allocation']
lines = original.splitlines(keepends=True)
before = ''.join(lines[node.lineno - 1:node.end_lineno])
after = '''def allocation(directory):
 directory.lstat();root=os.fspath(directory);pending=[(root,None)];count=logical=observed=0
 while pending:
  path,entry=pending.pop();count+=1
  if count>ENTRY_LIMIT:fail('observed evidence entry bound')
  # Every entry comes from this scan and receives exactly one non-following
  # stat before use. No DirEntry object or stat result survives this scan.
  try:s=os.lstat(path)if entry is None else entry.stat(follow_symlinks=False)
  except FileNotFoundError:
   if path==root:raise
   continue
  if stat.S_ISDIR(s.st_mode):
   try:
    with os.scandir(path)as entries:pending.extend((entry.path,entry)for entry in entries)
   except FileNotFoundError:
    if path==root:raise
  elif not (stat.S_ISREG(s.st_mode) or stat.S_ISLNK(s.st_mode)):fail('special evidence node')
  logical+=s.st_size;observed+=max(s.st_size,s.st_blocks*512)
 return dict(entriesAttempted=count,logicalBytes=logical,observedBytes=observed)
'''
assert original.count(before) == 1
candidate = original.replace(before, after)
ast.parse(candidate)
target = Path('experiments/issue-784/propose-core-adoption-direntries.py')
with target.open('x') as output:
    output.write(candidate)
print(target)
