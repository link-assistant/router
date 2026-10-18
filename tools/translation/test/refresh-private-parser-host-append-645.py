"""Propose fixed645 test-DATA inverses; never install or grant parser authority."""
from pathlib import Path
import argparse,hashlib,json,os,re,stat,subprocess,time

LIMIT=8*1024**2
START=time.monotonic()
def check(value,message):
    if not value:raise ValueError(message)
    check_time()
def check_time():
    if time.monotonic()-START>55:raise TimeoutError('whole test-data proposal55s')
def digest(raw):return hashlib.sha256(raw).hexdigest()
def units(text):return len(text.encode('utf-16-le'))//2
def canonical(value):return json.dumps(value,ensure_ascii=False,indent=2)+'\n'
def identity(value):return [value.st_dev,value.st_ino,value.st_mode,value.st_size,value.st_mtime_ns,value.st_ctime_ns]
def complete(path):
    parents=[]
    for parent in path.parents:
        s=parent.lstat();check(stat.S_ISDIR(s.st_mode)and not stat.S_ISLNK(s.st_mode),'linked source ancestor')
        parents.append((parent,s.st_dev,s.st_ino,s.st_mode))
    s=path.lstat();check(stat.S_ISREG(s.st_mode)and s.st_size<=LIMIT,'bounded regular source required')
    with os.fdopen(os.open(path,os.O_RDONLY|os.O_NOFOLLOW),'rb')as f:
        check(identity(os.fstat(f.fileno()))==identity(s),'source open identity differs')
        raw=f.read(LIMIT+1);check(len(raw)==s.st_size and identity(os.fstat(f.fileno()))==identity(s),'source changed during full read')
    check(identity(path.lstat())==identity(s),'source path changed')
    for parent,dev,ino,mode in parents:
        current=parent.lstat();check(current.st_dev==dev and current.st_ino==ino and current.st_mode==mode and not stat.S_ISLNK(current.st_mode),'source ancestor changed')
    check(raw.decode('utf8').encode('utf8')==raw,'noncanonical UTF8');return raw
def git(root,head,path):
    check_time();result=subprocess.run(['git','-C',str(root),'show',head+':'+path],capture_output=True,check=True,timeout=5)
    check(not result.stderr and len(result.stdout)<=LIMIT,'unexpected or oversized Git source');return result.stdout
def change(path,before,after):
    return {'path':path,'before':before,'after':after,'forward':{'expected':before,'replacement':after},'inverse':{'expected':after,'replacement':before}}
def replace_once(source,before,after):
    check(source.count(before)==1,'test-data anchor is absent or ambiguous');return source.replace(before,after)

def host_helper_source(original,after,pins):
    check(after.startswith(original),'test-data original prefix changed')
    append=after[len(original):];helper="// Generated fixed645 test DATA inverse only; no parser or semantic authority.\nimport assert from 'node:assert/strict';\n"
    helper+='const completeAppend='+json.dumps(append,ensure_ascii=False)+';\n'
    helper+='export const currentPrivateParserPacketPins645='+json.dumps(pins,separators=(',',':'))+';\n'
    helper+='export function undoPrivateParserHostAppend645(source){\n'
    helper+=' assert.equal(typeof source,\'string\');assert.equal(source.length,'+str(units(after))+');\n'
    helper+=' assert.equal(source.slice('+str(units(original))+'),completeAppend);\n'
    helper+=' return source.slice(0,'+str(units(original))+');\n}\n'
    return helper

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root',required=True);parser.add_argument('--profile-proposal',required=True);parser.add_argument('--output',required=True)
    args=parser.parse_args();root=Path(args.root).absolute();output=Path(args.output).absolute()
    check(not output.exists()and not output.is_relative_to(root),'fresh proposal directory outside repository required')
    for parent in output.parents:
        check(parent.is_dir()and not parent.is_symlink(),'linked output ancestor')
    proposal=json.loads(complete(Path(args.profile_proposal).absolute()));head=proposal['currentHead'];baseline=proposal['baseline']
    check(re.fullmatch('[a-f0-9]{40}',head)and re.fullmatch('[a-f0-9]{40}',baseline),'full Git revisions required')
    actual_head=subprocess.check_output(['git','-C',str(root),'rev-parse','HEAD'],text=True,timeout=5).strip();check(actual_head==head,'profile proposal HEAD differs')
    check(proposal['schema']=='private-parser-host-input-proposal-v1'and proposal['installApproved']is False and proposal['parserOrSemanticChecksPassed']is False,'not a data-only profile proposal')
    check(proposal['authority']=={'type':False,'owner':False,'executable':False}and len(proposal['hostEvolution'])==1 and len(proposal['changes'])==2,'unexpected proposal shape')
    manifest_path='source-profiles/private-parser-execution/manifest.json'
    current_manifest=git(root,head,'tools/translation/'+manifest_path);registered=json.loads(current_manifest)
    expected_paths=[manifest_path,*[row['path']for kind in ['sources','licenses','notices','hostInputs']for row in registered[kind]],'private-parser-execution.mjs']
    check([row['path']for row in proposal['reads']]==expected_paths and len(set(expected_paths))==16,'unexpected registered input closure')
    for row in proposal['reads']:
        check(isinstance(row['path'],str)and not Path(row['path']).is_absolute()and all(part not in ['','.','..']for part in row['path'].split('/'))and '\\'not in row['path'],'unsafe registered path')
        path='tools/translation/'+row['path'];raw=complete(root/path);check(raw==git(root,head,path)and len(raw)==row['bytes']and digest(raw)==row['sha256'],'full source/Git proposal join differs')
    host=proposal['hostEvolution'][0];check(host['path']=='original-json-intrinsics.mjs','wrong host')
    before=host['before'].encode();after=host['after'].encode()
    original=git(root,'6493a6e050fed6ecc699595273dbeebd63c7fadf','tools/translation/'+host['path'])
    check(len(original)==53873 and digest(original)=='1e0ca597de42bdc9af8c0385257cfacb9ec4ceb883ebda53c5d9a48c9b056930','fixed645 original prefix differs')
    check(before==git(root,baseline,'tools/translation/'+host['path'])and after==git(root,head,'tools/translation/'+host['path'])and before.startswith(original)and after.startswith(original)and len(after)>len(original),'complete host evolution differs')
    expected_manifest=json.loads(current_manifest);expected_manifest['hostInputs'][0]['bytes']=len(after);expected_manifest['hostInputs'][0]['sha256']=digest(after)
    manifest_after=canonical(expected_manifest).encode();executor_before=git(root,head,'tools/translation/private-parser-execution.mjs')
    old_pin="const manifestSha256='"+digest(current_manifest)+"';";new_pin="const manifestSha256='"+digest(manifest_after)+"';"
    executor_after=replace_once(executor_before.decode(),old_pin,new_pin).encode()
    expected={'source-profiles/private-parser-execution/manifest.json':(current_manifest,manifest_after),'private-parser-execution.mjs':(executor_before,executor_after)}
    check([row['path']for row in proposal['changes']]==[manifest_path,'private-parser-execution.mjs'],'profile proposal paths must be the exact ordered pair')
    for row in [host,*proposal['changes']]:
        left,right=(before,after)if row is host else expected[row['path']]
        check(row['before'].encode()==left and row['after'].encode()==right,'full proposed source differs')
        check(row['forward']=={'expected':row['before'],'replacement':row['after']}and row['inverse']=={'expected':row['after'],'replacement':row['before']},'full inverse differs')
    pins=[{'path':'source-profiles/private-parser-execution/manifest.json','bytes':len(manifest_after),'sha256':digest(manifest_after)},*expected_manifest['hostInputs']]
    helper=host_helper_source(original.decode(),host['after'],pins)
    helper_path='tools/translation/test/private-parser-host-append-645.mjs';helper_exists=(root/helper_path).exists();helper_before=None
    if helper_exists:
        helper_before=complete(root/helper_path).decode();check(helper_before.encode()==git(root,head,helper_path),'prior test-data helper/source Git differs')
        old_pins=[{'path':manifest_path,'bytes':len(current_manifest),'sha256':digest(current_manifest)},*registered['hostInputs']]
        check(helper_before==host_helper_source(original.decode(),host['before'],old_pins),'prior complete test-data inverse differs')
    edits=[change(helper_path,helper_before,helper)]
    for name in ['private-parser-historical-packet.mjs','private-parser-batched-descriptors.test.mjs']:
        path='tools/translation/test/'+name;old=complete(root/path).decode();check(old.encode()==git(root,head,path),'test source/Git differs')
        imported='undoPrivateParserHostAppend645'+(',currentPrivateParserPacketPins645'if name.startswith('private-parser-historical')else'')
        import_line="import {"+imported+"} from './private-parser-host-append-645.mjs';\n"
        if helper_exists:
            check(old.startswith(import_line)and old.count(' source=undoPrivateParserHostAppend645(source);\n')==1,'prior data helper association differs');new=old
            if name.startswith('private-parser-historical'):check(old.count('const currentPacketPins=currentPrivateParserPacketPins645;')==1,'prior packet pins association differs')
        else:
            new=import_line+old
            new=replace_once(new,'function beforeStandardRuns339(source){\n','function beforeStandardRuns339(source){\n source=undoPrivateParserHostAppend645(source);\n')
            if name.startswith('private-parser-historical'):
                lines=[line for line in old.splitlines()if line.startswith('const currentPacketPins=')];check(len(lines)==1,'current packet DATA declaration differs')
                new=replace_once(new,lines[0],'const currentPacketPins=currentPrivateParserPacketPins645;')
        edits.append(change(path,old,new))
    # The generated adapter strips one exact complete append. The original
    # consumers still check their complete historical prefix and original hash.
    record={'schema':'private-parser-host-test-data-proposal-645-v1','head':head,'baseline':baseline,'authority':proposal['authority'],'installApproved':False,'hostEvolution':host,'originalHostPrefix':original.decode(),'currentPins':pins,'changes':edits,'rules':[{'phase':'language','rules':['complete-fixed645-host-prefix-and-inverse']},{'phase':'repository','rules':['emit-exact-test-data-append','adapt-historical-data-helpers-only']}],'caseBodiesEdited':False,'enginesRun':False}
    raw=canonical(record).encode();check(len(raw)<=LIMIT,'test-data proposal exceeds8MiB');check_time();output.mkdir();(output/'proposal.json').write_bytes(raw);check(complete(output/'proposal.json')==raw,'full proposal readback differs')
    print(json.dumps({'status':'TEST_DATA_PROPOSAL_ONLY','changes':[{'path':row['path'],'bytes':len(row['after'].encode()),'sha256':digest(row['after'].encode())}for row in edits],'installApproved':False}))

if __name__=='__main__':main()
