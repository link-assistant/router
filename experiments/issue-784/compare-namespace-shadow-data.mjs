// Finite complete-map comparison; this does not qualify a full CI deadline.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {sourceItems} from '../../tools/translation/rust-structure.mjs';
import {resolveModuleBindings} from '../../tools/translation/module-bindings.mjs';
import {writeCompleteEvidenceJson} from './complete-evidence-json.mjs';

const filename='tools/translation/source-scopes.mjs',origin=new URL('../../'+filename,import.meta.url);
const before=execFileSync('git',['show','beda7848b:'+filename],{encoding:'utf8',maxBuffer:65536});
const after=readFileSync(origin,'utf8');assert.notEqual(before,after);
const directory=mkdtempSync(join(tmpdir(),'router-namespace-cloning-'));
try{
 const load=async(source,label)=>{
  const edits=[];
  const relocated=source.replace(/\bfrom (['"])(\.\.?\/[^'"]+)\1/gu,(whole,quote,path)=>{
   const replacement='from '+quote+new URL(path,origin).href+quote;
   edits.push({before:whole,after:replacement});return replacement;
  });
  let inverse=relocated;
  for(const edit of [...edits].reverse()){
   assert.equal(inverse.split(edit.after).length,2);inverse=inverse.replace(edit.after,()=>edit.before);
  }
  assert.equal(inverse,source);
  const path=join(directory,label+'.mjs');writeFileSync(path,relocated,{flag:'wx'});
  return {api:await import(pathToFileURL(path)),edits};
 };
 const old=await load(before,'before'),current=await load(after,'after');
 const children=Array.from({length:64},(_,index)=>'child'+index);
 const modules=[{file:'src/lib.rs',path:[],source:children.map(name=>'mod '+name+';').join('')},
  ...children.map(name=>({file:'src/'+name+'.rs',path:[name],source:Array.from({length:12},(_,n)=>
   (n%2?'pub ':'')+'struct A'+n+';').join('')}))].map(row=>({...row,items:sourceItems(row.source)}));
 const scopes=resolveModuleBindings({modules}).scopes;
 const configure=(api,index)=>api.configureParserSourceScope(api.requestImmutableNamespaceTargets({}),
  scopes[index%scopes.length],scopes,scopes[index%scopes.length].path);
 const inspect=value=>value instanceof Map?{map:[...value].map(([name,item])=>[name,inspect(item)])}:
  value instanceof Set?{set:[...value]}:Array.isArray(value)?value.map(inspect):
  value&&typeof value==='object'?Object.fromEntries(Object.entries(value).map(([name,item])=>[name,inspect(item)])):value;
 const observations=[];
 for(const index of [0,1,32,64]){
  const expected=configure(old.api,index),actual=configure(current.api,index),next=configure(current.api,index);
  assert.deepEqual(inspect(actual),inspect(expected));
  for(const namespace of ['type','value','macro']){
   assert.notEqual(actual.sourceNamespaceAliases[namespace],next.sourceNamespaceAliases[namespace]);
   for(const [path,map]of actual.sourceNamespaceAliases[namespace]){
    assert.notEqual(map,next.sourceNamespaceAliases[namespace].get(path));
    for(const [name,target]of map){
     assert.equal(Object.isFrozen(target),true);
     assert.strictEqual(target,next.sourceNamespaceAliases[namespace].get(path).get(name));
    }
   }
  }
  observations.push({index,result:inspect(actual)});
 }
 const runs=[];let checksum=0;
 for(const label of ['before','after','after','before']){
  const api=label==='before'?old.api:current.api,started=performance.now();
  for(let index=0;index<192;index++){
   const parser=configure(api,index);checksum+=parser.sourceNamespaceAliases.type.size;
  }
  runs.push({label,iterations:192,milliseconds:performance.now()-started});
 }
 const report={schema:'native-namespace-shadow-data-comparison-v1',before,after,modules,scopes,
  oldRelocations:old.edits,currentRelocations:current.edits,observations,runs,checksum,
  engine:process.version,typescriptVersion:JSON.parse(readFileSync('js/node_modules/typescript/package.json')).version,
  completeMapComparisons:true,allParserMapsIndependent:true,fullCiDeadlineQualified:false,
  semanticAuthority:false,runtimeParity:false,rustExecuted:false};
 const output=writeCompleteEvidenceJson('ci-logs/issue-784-restart-2/namespace-shadow-data-comparison.json',
  Buffer.from(JSON.stringify(report)));
 console.log(JSON.stringify({runs,checksum,scopes:scopes.length,output}));
}finally{rmSync(directory,{recursive:true,force:true});}
