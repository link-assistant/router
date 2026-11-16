#!/usr/bin/env python3
"""Draft all current adoption-controller layout repairs through Python AST/CST rules."""
from pathlib import Path
import ast,gzip,hashlib,io,json,sys,tokenize
PIN='a486ed6479954693ca428f631706bd93e842c509e0d6f6d3ff654230fae9a149'
SIZE=36211
BASE=Path(__file__).resolve().parent
SOURCE=BASE/'source-profiles/core-adoption-rust-layout'
HELPER_PIN='983fb61eb68c6321af16f2496934b327f39f16933906d8272ab075d68e5c8d0b'
DIRECT_IMPORT="\nsys.dont_write_bytecode=True\nsys.path.insert(0,str(Path(__file__).resolve().parents[1]/'tools/translation'))\nimport core_adoption_review as source_review"
LAZY_IMPORT="\nsys.dont_write_bytecode=True\ndef _operational_source_review():\n directory=str(Path(__file__).resolve().parents[1]/'tools/translation')\n if directory not in sys.path:sys.path.insert(0,directory)\n import core_adoption_review as source_review\n return source_review"
sha=lambda raw:hashlib.sha256(raw).hexdigest()
def need(value,message):
 if not value:raise ValueError('Core adoption layout source: '+message)
def tree(source):
 value=ast.parse(source)
 need(len(source.encode())<=2*1024**2 and len(source.splitlines())<1000,'whole source limits')
 return value
def positions(source):
 lines=source.splitlines(keepends=True);starts=[0]
 for line in lines:starts.append(starts[-1]+len(line.encode()))
 return lines,starts
def interval(source,node):
 lines,starts=positions(source)
 return [starts[node.lineno-1]+node.col_offset,starts[node.end_lineno-1]+node.end_col_offset]
def selected(source,node,replacement,reason):
 raw=source.encode();span=interval(source,node)
 return {'kind':type(node).__name__,'span':span,'expected':raw[span[0]:span[1]].decode(),'replacement':replacement,'reason':reason}
def apply(source,edits):
 raw=source.encode();end=len(raw)+1
 for row in sorted(edits,key=lambda row:row['span'][0],reverse=True):
  a,b=row['span'];need(0<=a<=b<end and raw[a:b].decode()==row['expected'],'native source selector')
  raw=raw[:a]+row['replacement'].encode()+raw[b:];end=a
 return raw.decode()
def concrete(source):
 raw=source.encode();lines,starts=positions(source);pieces=[];cursor=0
 def offset(position):
  line,column=position
  return len(raw)if line>len(lines)else starts[line-1]+len(lines[line-1][:column].encode())
 for token in tokenize.generate_tokens(io.StringIO(source).readline):
  a,b=offset(token.start),offset(token.end);need(cursor<=a<=b<=len(raw),'native token positions')
  if a>cursor:pieces.append({'term':'trivia','span':[cursor,a],'text':raw[cursor:a].decode()})
  pieces.append({'term':tokenize.tok_name[token.type],'span':[a,b],'text':raw[a:b].decode()});cursor=b
 if cursor<len(raw):pieces.append({'term':'trivia','span':[cursor,len(raw)],'text':raw[cursor:].decode()})
 value={'schema':'python-concrete-source-meta-v1','language':'Python','spanUnit':'utf8-byte','pieces':pieces,'bytes':len(raw),'sha256':sha(raw),'semanticAuthority':False}
 wire=json.dumps(value,separators=(',',':'));read=json.loads(wire)
 reconstructed=''.join(row['text']for row in read['pieces']);need(reconstructed==source,'whole serialized/reparsed CST')
 for row in read['pieces']:need(raw[row['span'][0]:row['span'][1]].decode()==row['text'],'complete token/trivia source interval')
 tree(reconstructed)
 return read
def phase(before,after,name,edits):
 left=concrete(before);right=concrete(after)
 need(''.join(row['text']for row in left['pieces'])==before and ''.join(row['text']for row in right['pieces'])==after,'complete CST reconstruction')
 return {'phase':name,'before':before,'after':after,'beforeMeta':left,'afterMeta':right,'nativeSelections':edits,'inverse':before,'completeInverse':True,'semanticAuthority':False}
def root_name(path):
 return 'ROOT'if path.startswith('scripts/')else'root'
def package(root,value):
 return ('_operational_source_review()'if root=='ROOT'else'source_review')+'.rust_package_source_path('+root+','+repr(value)+')'
def layout(root,key):
 return ('_operational_source_review()'if root=='ROOT'else'source_review')+'.repository_rust_layout('+root+')['+repr(key)+']'
def parents(program):
 return {child:node for node in ast.walk(program)for child in ast.iter_child_nodes(node)}
def enclosing_assignment(node,links):
 while node in links:
  node=links[node]
  if isinstance(node,ast.Assign):return node
 return None
def language(source,path,optimize_evidence=True):
 program=tree(source);edits=[];covered=[];raw=source.encode()
 # Extend every actual Git census; retain root Cargo files and add nested manifests.
 for node in ast.walk(program):
  if isinstance(node,(ast.Call,ast.List,ast.Tuple)):
   args=node.args if isinstance(node,ast.Call)else node.elts
   constants=[arg.value for arg in args if isinstance(arg,ast.Constant)and isinstance(arg.value,str)]
   if 'ls-files'in constants and 'Cargo.toml'in constants and 'Cargo.lock'in constants:
    target=next(arg for arg in args if isinstance(arg,ast.Constant)and arg.value=='Cargo.lock')
    span=interval(source,target);edits.append({'kind':'git-pathspec-extension','span':[span[1],span[1]],'expected':'','replacement':",'**/Cargo.toml','**/Cargo.lock'",'reason':'guard every tracked nested Cargo manifest and lock as well as every Rust input'})
  if isinstance(node,ast.BoolOp)and isinstance(node.op,ast.Or)and len(node.values)==2:
   left,right=node.values
   if isinstance(left,ast.Call)and isinstance(left.func,ast.Attribute)and left.func.attr=='endswith'and len(left.args)==1 and isinstance(left.args[0],ast.Constant)and left.args[0].value=='.rs'and isinstance(right,ast.Compare)and len(right.ops)==1 and isinstance(right.ops[0],ast.In)and isinstance(right.comparators[0],(ast.List,ast.Tuple))and [v.value for v in right.comparators[0].elts if isinstance(v,ast.Constant)]==['Cargo.toml','Cargo.lock']:
    argument=ast.get_source_segment(source,left.func.value)
    need(ast.get_source_segment(source,right.left)==argument,'same native Rust/Cargo binding')
    edits.append(selected(source,node,('_operational_source_review()'if path.startswith('scripts/')else'source_review')+'.is_rust_cargo_path('+argument+')','preserve Rust input guards and extend exact Cargo basename coverage'))
 if optimize_evidence and path.startswith('scripts/'):
  owners=[node for node in program.body if isinstance(node,ast.FunctionDef)and node.name=='allocation'];need(len(owners)==1,'one native complete evidence counter')
  proposer=path=='scripts/propose-core-adoption.py';key='entriesAttempted'if proposer else'entries';bound='observed evidence entry bound'if proposer else'complete observed entry bound';special='special evidence node'if proposer else'special evidence entry'
  body=["def allocation(directory):",*( [" directory.lstat()"]if proposer else[])," # Every call creates a fresh native directory scan and freshly stats each node."," pending=[(directory,None)];count=logical=observed=0"," while pending:","  path,entry=pending.pop();count+=1","  if count>ENTRY_LIMIT:fail("+repr(bound)+")","  try:s=path.lstat()if entry is None else entry.stat(follow_symlinks=False)","  except FileNotFoundError:","   if path==directory:raise","   continue","  if stat.S_ISDIR(s.st_mode):","   try:","    with os.scandir(path)as entries:pending.extend((entry.path,entry)for entry in entries)","   except FileNotFoundError:","    if path==directory:raise","  elif not(stat.S_ISREG(s.st_mode)or stat.S_ISLNK(s.st_mode)):fail("+repr(special)+")","  logical+=s.st_size;observed+=max(s.st_size,s.st_blocks*512)"," return dict("+key+"=count,logicalBytes=logical,observedBytes=observed)"]
  edits.append(selected(source,owners[0],'\n'.join(body),'fresh full evidence accounting without Path construction or any cross-call cached size'))
 return apply(source,edits),edits
def repository(source,path,helper):
 program=tree(source);links=parents(program);edits=[];root=root_name(path)
 protected=set()
 for node in ast.walk(program):
  if isinstance(node,(ast.Call,ast.List,ast.Tuple)):
   args=node.args if isinstance(node,ast.Call)else node.elts
   values=[arg.value for arg in args if isinstance(arg,ast.Constant)]
   if 'ls-files'in values:protected.update(args)
 for node in ast.walk(program):
  if not isinstance(node,ast.Constant)or type(node.value)is not str:continue
  value=node.value;parent=links.get(node);owner=enclosing_assignment(node,links)
  if node in protected or owner and any(isinstance(t,ast.Name)and t.id=='expected_core'for t in owner.targets):continue
  if value=='src/'and isinstance(parent,ast.Call)and isinstance(parent.func,ast.Attribute)and parent.func.attr=='startswith':
   edits.append(selected(source,node,layout(root,'productionPrefix'),'physical package application prefix'))
  elif value=='src'and isinstance(parent,ast.BinOp)and isinstance(parent.op,ast.Div)and parent.right is node:
   edits.append(selected(source,node,layout(root,'productionPrefix'),'complete physical source tree'))
  elif value.startswith('src/'):
   edits.append(selected(source,node,package(root,value),'map actual source paths while retaining logical fixture declaration source'))
  elif value in ['Cargo.toml','Cargo.lock']and not path.endswith('/core_adoption_review.py'):
   # Input classification has already become a helper call. Remaining instances
   # select physical dependency rows, payload keys or complete source closure.
   edits.append(selected(source,node,package(root,value),'actual selected package manifest/workspace lock'))
 if path.startswith('scripts/'):
  selected_imports=[node for node in program.body if isinstance(node,ast.Import)and any(alias.name=='sys'for alias in node.names)]
  need(len(selected_imports)==1,'one native standard imports owner')
  at=interval(source,selected_imports[0])[1]
  text=LAZY_IMPORT
  edits.append({'kind':'native-import-anchor','span':[at,at],'expected':'','replacement':text,'reason':'reuse the existing captured four-file runtime closure'})
 if path.endswith('/core_adoption_review.py'):
  edits.append({'kind':'complete-owned-layout-helper','span':[len(source.encode()),len(source.encode())],'expected':'','replacement':'\n\n'+helper.rstrip()+'\n','reason':'shared operational path functions; no cache or semantic admission'})
 if path.endswith('/core_adoption_json_readers_review.py'):
  original=[node for node in ast.walk(program)if isinstance(node,ast.Assign)and any(isinstance(t,ast.Name)and t.id=='original_paths'for t in node.targets)]
  need(len(original)==1 and isinstance(original[0].value,ast.SetComp),'one native original-parent census')
  elt=original[0].value.elt;edits.append(selected(source,elt,'source_review.rust_package_source_path(root,'+ast.get_source_segment(source,elt)+')','compare adopted physical outputs to the complete original-parent membership'))
 return apply(source,edits),edits
def prepare(root):
 packed=(SOURCE/'complete-originals.json.gz').read_bytes();need(len(packed)==SIZE and sha(packed)==PIN,'complete original archive')
 original=json.loads(gzip.decompress(packed));need(original['schema']=='core-adoption-rust-layout-originals-v1'and len(original['files'])==4,'complete original membership')
 helper=(SOURCE/'layout-helper.py.txt').read_text();need(len(helper.encode())==1820 and sha(helper.encode())==HELPER_PIN,'complete owned helper source');tree(helper)
 results=[]
 for row in original['files']:
  path=row['path'];before=row['source'];need(len(before.encode())==row['bytes']and sha(before.encode())==row['sha256'],'complete original source association')
  middle,general=language(before,path);after,specific=repository(middle,path,helper);tree(after)
  old_middle,_=language(before,path,optimize_evidence=False);old_after,_=repository(old_middle,path,helper)
  previous_after=old_after.replace(LAZY_IMPORT,DIRECT_IMPORT,1).replace('_operational_source_review().','source_review.')if path.startswith('scripts/')else old_after
  current=(root/path).read_text();need(current in [before,after,old_after,previous_after],'unknown complete physical source '+path)
  stages=[phase(before,middle,'language',general),phase(middle,after,'repository',specific)]
  receiving=phase(current,after,'repository',[])if current not in [before,after]else None
  results.append({'path':path,'before':before,'language':middle,'after':after,'current':current,'previousAfter':previous_after,'previousLazyAfter':old_after,'receivingEvolution':receiving,'inverse':before,'stages':stages,'languageRules':['all-tracked-rust-and-nested-cargo-inputs',*(['fresh-native-scandir-evidence-accounting']if path.startswith('scripts/')else[])],'repositoryRules':['physical-rust-package-roots-and-existing-runtime-closure'],'nativePythonAstChecked':True,'semanticAuthority':False})
 for row in results:need((root/row['path']).read_text()==row['current'],'source changed during complete proposal')
 need((root/original['reference']['path']).read_text()==original['reference']['source'],'complete original JavaScript layout reference')
 return {'schema':'core-adoption-rust-layout-source-v1','sourceHead':original['sourceHead'],'files':results,'helperSource':helper,'reference':original['reference'],'newRuntimeFiles':False,'acrossInvocationCache':False,'semanticAuthority':False,'tested':False}
if __name__=='__main__':
 need(len(sys.argv)==3 and sys.argv[1]in ['--emit','--write','--check'],'use --emit|--write|--check ROOT')
 root=Path(sys.argv[2]).resolve();plan=prepare(root)
 if sys.argv[1]=='--write':
  for row in plan['files']:(root/row['path']).write_text(row['after'])
 elif sys.argv[1]=='--check':need(all(row['current']==row['after']for row in plan['files']),'stale complete sources')
 print(json.dumps(plan if sys.argv[1]=='--emit'else{'schema':plan['schema'],'files':[r['path']for r in plan['files']],'semanticAuthority':False,'tested':False},separators=(',',':')))
