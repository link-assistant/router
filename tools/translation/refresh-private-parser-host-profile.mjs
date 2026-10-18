// Proposal-only maintenance of registered host bytes. This is source data,
// never permission to parse, lower, own or execute a translated construct.
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {constants,openSync,closeSync,fstatSync,lstatSync,readSync,mkdirSync,writeFileSync} from 'node:fs';
import {dirname,join,resolve,relative,isAbsolute} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRulePipeline,exactSubstitutionRule} from './rule-pipeline.mjs';

const MANIFEST='source-profiles/private-parser-execution/manifest.json';
const EXECUTOR='private-parser-execution.mjs';
const HOST='original-json-intrinsics.mjs';
const LIMIT=8*1024*1024;
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const fail=message=>{throw new TypeError('Private parser host proposal: '+message);};
const requireThat=(condition,message)=>{if(!condition)fail(message);};
const canonical=value=>JSON.stringify(value,null,2)+'\n';
const identity=s=>[s.dev,s.ino,s.mode,s.size,s.mtimeMs,s.ctimeMs];
const same=(a,b)=>a.length===b.length&&a.every((value,index)=>value===b[index]);
function utf8(bytes){
  const text=bytes.toString('utf8');requireThat(Buffer.from(text,'utf8').equals(bytes),'noncanonical UTF8');return text;
}
function readComplete(path){
  const parents=[];
  for(let parent=dirname(path);;parent=dirname(parent)){
    const s=lstatSync(parent);requireThat(s.isDirectory()&&!s.isSymbolicLink(),'linked source ancestor');
    parents.push([parent,s.dev,s.ino,s.mode]);if(parent===dirname(parent))break;
  }
  const before=lstatSync(path);requireThat(before.isFile()&&!before.isSymbolicLink()&&before.size<=LIMIT,'bounded regular source required');
  const fd=openSync(path,constants.O_RDONLY|constants.O_NOFOLLOW);
  try{
    requireThat(same(identity(fstatSync(fd)),identity(before)),'opened source changed');
    const bytes=Buffer.alloc(before.size);let offset=0;
    while(offset<bytes.length){const count=readSync(fd,bytes,offset,bytes.length-offset,offset);requireThat(count>0,'truncated source');offset+=count;}
    requireThat(readSync(fd,Buffer.alloc(1),0,1,offset)===0,'source grew');
    requireThat(same(identity(fstatSync(fd)),identity(before))&&same(identity(lstatSync(path)),identity(before)),'source changed during read');
    for(const [parent,dev,ino,mode]of parents){const s=lstatSync(parent);requireThat(s.isDirectory()&&!s.isSymbolicLink()&&s.dev===dev&&s.ino===ino&&s.mode===mode,'source ancestor changed');}
    return bytes;
  }finally{closeSync(fd);}
}
function git(root,args){return execFileSync('git',['-C',root,...args],{timeout:5000,maxBuffer:LIMIT,stdio:['ignore','pipe','pipe']});}
function registeredPaths(manifest){
  requireThat(manifest.schema==='private-registered-parser-execution-v1','wrong registered schema');
  requireThat(Array.isArray(manifest.sources)&&manifest.sources.length===7&&Array.isArray(manifest.licenses)&&manifest.licenses.length===2&&Array.isArray(manifest.notices)&&manifest.notices.length===3,'registered source closure changed');
  requireThat(Array.isArray(manifest.hostInputs)&&manifest.hostInputs.length===2&&manifest.hostInputs[0].path===HOST&&manifest.hostInputs[1].path==='private-parser-sha256.mjs','registered host closure changed');
  const rows=[...manifest.sources,...manifest.licenses,...manifest.notices,...manifest.hostInputs],seen=new Set();
  for(const row of rows){
    requireThat(row&&typeof row.path==='string'&&row.path.length>0&&!isAbsolute(row.path)&&!row.path.split('/').some(part=>!part||part==='.'||part==='..')&&!row.path.includes('\\'),'unsafe registered path');
    requireThat(!seen.has(row.path)&&Number.isSafeInteger(row.bytes)&&row.bytes>=0&&row.bytes<=LIMIT&&/^[a-f0-9]{64}$/u.test(row.sha256),'invalid registered pin');seen.add(row.path);
  }
  return rows;
}
function exactChange(path,before,after){
  requireThat(before!==after,'empty source evolution');
  return {path,before,after,forward:{expected:before,replacement:after},inverse:{expected:after,replacement:before}};
}

function reviewedHostSubstitutions(request,before,after,baseline,currentHead,originalPrefix){
  requireThat(request?.schema==='private-parser-host-substitutions-v1'&&request.path===HOST&&request.baseline===baseline&&request.currentHead===currentHead,'host substitution identities differ');
  requireThat(request.before===utf8(before)&&request.after===utf8(after),'complete host substitution sources differ');
  requireThat(originalPrefix.length===53873&&hash(originalPrefix)==='1e0ca597de42bdc9af8c0385257cfacb9ec4ceb883ebda53c5d9a48c9b056930','original host prefix differs');
  const prefix=utf8(originalPrefix);requireThat(utf8(before).startsWith(prefix)&&utf8(after).startsWith(prefix),'host substitutions changed original guards/bootstrap');
  requireThat(Array.isArray(request.phases)&&request.phases.length===2&&request.phases[0].phase==='language'&&request.phases[1].phase==='repository','host substitutions require language then repository');
  let count=0;
  for(const phase of request.phases){requireThat(Array.isArray(phase.rules)&&phase.rules.length<=64,'bounded host substitution list required');count+=phase.rules.length;}
  requireThat(count>0&&count<=64,'bounded nonempty host substitutions required');
  const declarations=request.phases.map(phase=>({phase:phase.phase,rules:phase.rules.map(row=>{
    requireThat(typeof row.expected==='string'&&row.expected.length>0&&typeof row.replacement==='string'&&row.replacement.length>0,'nonempty literal host substitutions required');
    return {id:row.id,apply(source){
      requireThat(source.split(row.expected).length===2,'host substitution is absent or ambiguous');
      // Functional replacement treats source bytes literally, including $&.
      const next=source.replace(row.expected,()=>row.replacement);
      requireThat(next.split(row.replacement).length===2&&next.replace(row.replacement,()=>row.expected)===source,'host substitution inverse differs');
      requireThat(next.startsWith(prefix),'intermediate host substitution changed original prefix');return next;
    }};
  })}));
  const pipeline=createRulePipeline(declarations),result=pipeline.run(utf8(before));
  requireThat(result.value===utf8(after),'complete host substitutions do not produce current Git source');
  return {request,rules:pipeline.description,trace:result.trace};
}

/** A complete, reversible DATA proposal. It never installs or approves itself. */
export function draftPrivateParserHostProfile({root,baseline,currentHead,hostEdits=null}){
  root=resolve(root);requireThat(/^[a-f0-9]{40}$/u.test(baseline)&&/^[a-f0-9]{40}$/u.test(currentHead),'full baseline/current Git identities required');
  const started=performance.now(),tool=join(root,'tools/translation'),reads=[];
  function guard(){requireThat(performance.now()-started<=55000,'whole proposal exceeds55s');}
  function original(head,path){guard();return git(root,['show',head+':tools/translation/'+path]);}
  function current(path){
    guard();const bytes=readComplete(join(tool,path));requireThat(bytes.equals(original(currentHead,path)),'physical/current Git source differs');reads.push({path,bytes:bytes.length,sha256:hash(bytes)});return bytes;
  }
  requireThat(git(root,['rev-parse','HEAD']).toString().trim()===currentHead,'current HEAD changed');
  const manifestBytes=current(MANIFEST),manifestText=utf8(manifestBytes),manifest=JSON.parse(manifestText);
  requireThat(canonical(manifest)===manifestText&&original(baseline,MANIFEST).equals(manifestBytes),'manifest is not the unchanged canonical baseline');
  const rows=registeredPaths(manifest),evolution=[];let hostSourceRules=null;
  for(const row of rows){
    const before=original(baseline,row.path),after=current(row.path);
    requireThat(before.length===row.bytes&&hash(before)===row.sha256,'baseline does not match registered source');
    utf8(before);utf8(after);
    if(row.path===HOST){
      if(hostEdits===null)requireThat(after.length>before.length&&after.subarray(0,before.length).equals(before),'only an append to the complete original host source is supported');
      else hostSourceRules=reviewedHostSubstitutions(hostEdits,before,after,baseline,currentHead,original('6493a6e050fed6ecc699595273dbeebd63c7fadf',HOST));
      evolution.push(exactChange(row.path,utf8(before),utf8(after)));
    }else requireThat(after.equals(before),'unrelated registered source changed');
  }
  const executorBytes=current(EXECUTOR),executor=utf8(executorBytes);requireThat(original(baseline,EXECUTOR).equals(executorBytes),'executor changed outside this proposal');
  const oldPin="const manifestSha256='"+hash(manifestBytes)+"';";
  const pipeline=createRulePipeline([
    {phase:'language',rules:[{id:'language:retain-complete-append-only-host-evolution',apply(value){
      return {...value,host:evolution[0],authority:{type:false,owner:false,executable:false}};
    }}]},
    {phase:'repository',rules:[{id:'repository:refresh-only-registered-host-input',apply(value){
      const next=JSON.parse(manifestText),bytes=Buffer.from(value.host.after,'utf8');next.hostInputs[0].bytes=bytes.length;next.hostInputs[0].sha256=hash(bytes);
      const undo=JSON.parse(canonical(next));undo.hostInputs=manifest.hostInputs;requireThat(canonical(undo)===manifestText,'non-host manifest mutation');
      return {...value,manifest:canonical(next)};
    }},{id:'repository:substitute-exact-private-parser-manifest-pin',apply(value){
      const nextPin="const manifestSha256='"+hash(value.manifest)+"';";
      const next=exactSubstitutionRule('repository:manifest-pin',oldPin,nextPin,'Private parser host proposal: manifest pin is absent or ambiguous').apply(executor);
      requireThat(exactSubstitutionRule('repository:inverse-manifest-pin',nextPin,oldPin,'Private parser host proposal: inverse manifest pin is ambiguous').apply(next)===executor,'executor inverse differs');
      return {...value,executor:next};
    }}]},
  ]);
  const {value,trace}=pipeline.run({});
  const changes=[exactChange(MANIFEST,manifestText,value.manifest),exactChange(EXECUTOR,executor,value.executor)];
  // Fresh readback, not a saved digest verdict, closes the proposal's input join.
  for(const row of reads){guard();const bytes=readComplete(join(tool,row.path));requireThat(bytes.equals(original(currentHead,row.path))&&bytes.length===row.bytes&&hash(bytes)===row.sha256,'complete final source changed');}
  requireThat(git(root,['rev-parse','HEAD']).toString().trim()===currentHead,'final HEAD changed');guard();
  const proposal={schema:'private-parser-host-input-proposal-v1',baseline,currentHead,authority:value.authority,installApproved:false,parserOrSemanticChecksPassed:false,rules:pipeline.description,trace,reads,hostEvolution:evolution,changes};
  if(hostSourceRules!==null)proposal.hostSourceRules=hostSourceRules;
  return proposal;
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const args=process.argv.slice(2);requireThat((args.length===8||args.length===10&&args[8]==='--host-edits')&&args[0]==='--root'&&args[2]==='--baseline'&&args[4]==='--head'&&args[6]==='--output','usage: --root ROOT --baseline FULL_SHA --head FULL_SHA --output NEW_DIRECTORY [--host-edits REVIEWED_JSON]');
  const root=resolve(args[1]),output=resolve(args[7]),inside=relative(root,output);
  requireThat(inside==='..'||inside.startsWith('../')||isAbsolute(inside),'proposal output must be outside the repository');
  for(let parent=dirname(output);;parent=dirname(parent)){const s=lstatSync(parent);requireThat(s.isDirectory()&&!s.isSymbolicLink(),'linked proposal ancestor');if(parent===dirname(parent))break;}
  const hostEdits=args.length===10?JSON.parse(utf8(readComplete(resolve(args[9])))):null;
  const proposal=draftPrivateParserHostProfile({root,baseline:args[3],currentHead:args[5],hostEdits});
  requireThat(Buffer.byteLength(canonical(proposal))<=LIMIT,'proposal data exceeds8MiB');
  mkdirSync(output);
  for(const change of proposal.changes){const name=change.path===MANIFEST?'manifest.after.json':'private-parser-execution.after.mjs';writeFileSync(join(output,name),change.after,{flag:'wx'});requireThat(readComplete(join(output,name)).equals(Buffer.from(change.after)),'proposal output readback differs');}
  writeFileSync(join(output,'proposal.json'),canonical(proposal),{flag:'wx'});
  process.stdout.write(canonical({schema:proposal.schema,currentHead:proposal.currentHead,installApproved:false,changes:proposal.changes.map(row=>({path:row.path,bytes:Buffer.byteLength(row.after),sha256:hash(row.after)}))}));
}
