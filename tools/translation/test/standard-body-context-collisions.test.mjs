import testCase from 'node:test';
import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {translateProject} from '../project.mjs';
import {parseProgram,serializeProgram} from '../semantic-meta.mjs';
import {HostChecker,HostRustParser,emitJavaScript} from '../extensions/host-contracts.mjs';
import {requirePinnedStandardBody} from '../extensions/standard-body-checker.mjs';
import {compilationProfile} from '../cfg-profile.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
import {writeJsonGzip} from '../../evidence/write-json-gzip.mjs';

let vectors=[];
const retain=(kind,value)=>{vectors.push({kind,value});return value;};
const test=(title,run)=>testCase(title,{timeout:60_000},async()=>{
  vectors=[];
  try{await run();}
  finally{const directory=process.env.ROUTER_STANDARD_CONTEXT_VECTOR_DIR;if(directory){mkdirSync(directory,{recursive:true});writeJsonGzip(join(directory,Buffer.from(title).toString('hex')+'.json.gz'),{title,vectors},(_key,value)=>typeof value==='bigint'?{$integer:String(value)}:value);}}
});
const some=field0=>Object.freeze({$:'Some',field0}),none=()=>Object.freeze({$:'None'});
const profiles=[['neutral',compilationProfile({flags:{test:false}})],['unix',compilationProfile({flags:{test:false,unix:true,windows:false}})],['windows',compilationProfile({flags:{test:false,unix:false,windows:true}})]];
function find(value,predicate){if(!value||typeof value!=='object')return null;if(predicate(value))return value;for(const [key,child]of Object.entries(value))if(!['type','span','pinnedStandardBodyProof'].includes(key))for(const item of Array.isArray(child)?child:[child]){const result=find(item,predicate);if(result)return result;}return null;}
const pinned=program=>find([...program.declarations.values()],node=>node.k==='routerPinnedStandardBody');
function check(files,profile=profiles[0][1]){
  const result=translateProject({entry:'src/lib.rs',paths:Object.keys(files),readSource:path=>files[path],compilationProfile:profile});
  retain('complete-source-and-result',{files,profile,meta:result.meta,javascript:result.javascript,typescript:result.typescript});
  assert.deepEqual(result.meta.refused,[]);
  assert.ok(result.meta.concreteSyntaxMeta);
  const program=parseProgram(JSON.stringify(result.meta.targetSemanticProgram));
  assert.ok(pinned(program));
  assert.equal(serializeProgram(parseProgram(serializeProgram(program))),serializeProgram(program));
  const before=emitJavaScript(program);
  retain('first-complete-emission',{text:before.text,mappings:before.mappings,proof:pinned(program).pinnedStandardBodyProof});
  return {files,result,program,before};
}
function recheck(held){
  const node=pinned(held.program);
  try{requirePinnedStandardBody(node,HostRustParser,{Checker:HostChecker,program:held.program});const emitted=emitJavaScript(held.program);retain('held-complete-reemission',{text:emitted.text,mappings:emitted.mappings});assert.equal(emitted.text,held.before.text);assert.deepEqual(emitted.mappings,held.before.mappings);}
  catch(error){retain('held-recheck-error',{message:error.message,stack:error.stack,diagnostic:error.standardLayoutDiagnostic??null,proof:node.pinnedStandardBodyProof,completeProgram:JSON.parse(serializeProgram(held.program))});throw error;}
}
function pair(source,{prefix='// independent source B é😀\n\n',profile=profiles[0][1],differentLayouts=false}={}){
  const a=check({'src/lib.rs':source},profile),b=check({'src/lib.rs':prefix+source},profile);
  const layouts=program=>[...program.declarations.values()].filter(entry=>entry.k==='data').map(({fullName,ctors,standardGeneric})=>({fullName,ctors,standardGeneric}));
  const actualA=layouts(a.program),actualB=layouts(b.program);
  retain('independent-source-layouts',{a:actualA,b:actualB,sameIssuedDigest:pinned(a.program).pinnedStandardBodyProof.checkedBodyDigest===pinned(b.program).pinnedStandardBodyProof.checkedBodyDigest});
  if(differentLayouts)assert.notDeepEqual(actualA,actualB,'actual complete layouts must differ independently of a public proof key');
  recheck(a);recheck(b);
  return [a,b];
}
const strict=(held,verify)=>verifyTypedTargets(held.result,verify,{childTimeoutMs:20_000});
function verifyString(api,method='chosen'){
  assert.equal(api[method](some('Ω😀')),'Ω😀');assert.equal(api[method](none()),method==='empty'?'':'fallback');
}

test('actual u64 eager and Default contexts remain recheckable across fresh complete programs',async()=>{
  for(const source of ['pub fn chosen(value:Option<u64>)->u64{value.unwrap_or(9u64)}','pub fn chosen(value:Option<u64>)->u64{value.unwrap_or_default()}']){
    const held=pair(source);
    for(const item of held)await strict(item,api=>{assert.equal(api.chosen(some(18446744073709551615n)),18446744073709551615n);assert.equal(api.chosen(none()),source.includes('unwrap_or_default')?0n:9n);});
  }
});

test('borrowed str eager unwrap retains its own complete layout after another checked source',async()=>{
  const held=pair('pub fn chosen(value:Option<&str>)->&str{value.unwrap_or("fallback")}',{differentLayouts:true});
  for(const item of held)await strict(item,api=>verifyString(api));
});

test('borrowed str original Default retains source-qualified contexts in either order',async()=>{
  const source='pub fn empty(value:Option<&str>)->&str{value.unwrap_or_default()}',held=pair(source,{differentLayouts:true});
  const reverseB=check({'src/lib.rs':'// reverse B source\n\n\n'+source}),reverseA=check({'src/lib.rs':source});
  recheck(reverseB);recheck(reverseA);
  for(const item of [...held,reverseB,reverseA])await strict(item,api=>verifyString(api,'empty'));
});

test('eager Option to Result contexts retain original parameter evaluation and layouts',async()=>{
  const held=pair('pub fn chosen(value:Option<&str>)->Result<&str,bool>{value.ok_or(false)}',{differentLayouts:true});
  for(const item of held)await strict(item,api=>{assert.deepEqual(api.chosen(some('Ω😀')),Object.freeze({$:'Ok',field0:'Ω😀'}));assert.deepEqual(api.chosen(none()),Object.freeze({$:'Err',field0:false}));});
});

test('lazy Option to Result contexts retain original checked callback and layouts',async()=>{
  const held=pair('pub fn chosen(value:Option<&str>)->Result<&str,bool>{value.ok_or_else(||false)}',{differentLayouts:true});
  for(const item of held)await strict(item,api=>{assert.deepEqual(api.chosen(some('Ω😀')),Object.freeze({$:'Ok',field0:'Ω😀'}));assert.deepEqual(api.chosen(none()),Object.freeze({$:'Err',field0:false}));});
});

test('separate modules and explicit neutral Unix Windows profiles keep genuine contexts distinct',async()=>{
  const held=[];
  for(const [name,profile]of profiles){
    const files={'src/lib.rs':'pub mod a;pub mod b;','src/a.rs':'pub fn chosen(value:Option<&str>)->&str{value.unwrap_or("fallback")}','src/b.rs':'// independent module é😀\n\npub fn empty(value:Option<&str>)->&str{value.unwrap_or_default()}'};
    retain('profile-name',name);held.push(check(files,profile));
  }
  for(const item of [...held,...held.toReversed()])recheck(item);
  for(const item of held)await strict(item,api=>{assert.equal(api['a.chosen'](some('Ω😀')),'Ω😀');assert.equal(api['a.chosen'](none()),'fallback');assert.equal(api['b.empty'](some('Ω😀')),'Ω😀');assert.equal(api['b.empty'](none()),'');});
});

test('current layout and copied issuer tampering still refuse after context pressure',async()=>{
  const source="struct Token{n:u8}pub fn chosen<'a>(value:Option<&'a Token>,fallback:&'a Token)->&'a Token{value.unwrap_or(fallback)}",held=check({'src/lib.rs':source});
  for(const mode of ['missing-key','foreign-key','constructor-payload','generic-payload']){
    const program=parseProgram(JSON.stringify(held.result.meta.targetSemanticProgram)),node=pinned(program);
    if(mode==='missing-key')delete node.pinnedStandardBodyProof.checkedBodyDigest;
    else if(mode==='foreign-key')node.pinnedStandardBodyProof.checkedBodyDigest='0'.repeat(64);
    else{
      const receiver=node.body.value.k==='routerOriginalSharedDomainGuard'?node.body.value.value:node.body.value,entry=program.declarations.get(receiver.type.name);assert.ok(entry);
      if(mode==='constructor-payload')entry.ctors.find(ctor=>ctor.name==='Some').fields[0].type={kind:'bool'};
      else entry.standardGeneric.arguments[0]={kind:'bool'};
    }
    assert.throws(()=>requirePinnedStandardBody(node,HostRustParser,{Checker:HostChecker,program}),error=>{retain('forged-current-context-refusal',{mode,message:error.message,diagnostic:error.standardLayoutDiagnostic??null,program:JSON.parse(serializeProgram(program))});assert.match(error.message,/layout|payload|owner|canonical|body|source|privately/u);if(error.message.startsWith('Shared standard source layout changed')){assert.ok(error.standardLayoutDiagnostic);assert.equal(error.standardLayoutDiagnostic.method,'unwrap_or');assert.ok(error.standardLayoutDiagnostic.expectedFullName);assert.ok(error.standardLayoutDiagnostic.actualDigest===null||/^[a-f0-9]{64}$/u.test(error.standardLayoutDiagnostic.actualDigest));}return true;});
  }
  for(const source of ['enum Option{Other}pub fn chosen(value:Option)->u8{value.unwrap_or_default()}','struct Option{n:u8}pub fn chosen(value:Option)->u8{value.unwrap_or(0u8)}']){
    const result=translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source});retain('counterfeit-source-result',{source,meta:result.meta});assert.equal(result.meta.executable.some(entry=>entry.name==='chosen'),false);assert.ok(result.meta.refused.some(entry=>entry.name==='chosen'));
  }
  recheck(held);
  await strict(held,api=>{const token=Object.freeze({$:'Token',n:9n}),fallback=Object.freeze({$:'Token',n:2n});assert.strictEqual(api.chosen(some(token),fallback),token);assert.strictEqual(api.chosen(none(),fallback),fallback);});
});

test('cold native processes and warmed repeated checking preserve every original specialization',async()=>{
  const projectUrl=new URL('../project.mjs',import.meta.url).href,metaUrl=new URL('../semantic-meta.mjs',import.meta.url).href,hostUrl=new URL('../extensions/host-contracts.mjs',import.meta.url).href,bodyUrl=new URL('../extensions/standard-body-checker.mjs',import.meta.url).href;
  const child=`import assert from 'node:assert/strict';import {translateProject} from ${JSON.stringify(projectUrl)};import {parseProgram} from ${JSON.stringify(metaUrl)};import {HostChecker,HostRustParser,emitJavaScript} from ${JSON.stringify(hostUrl)};import {requirePinnedStandardBody} from ${JSON.stringify(bodyUrl)};const find=value=>{if(!value||typeof value!=='object')return null;if(value.k==='routerPinnedStandardBody')return value;for(const [key,child]of Object.entries(value))if(!['type','span','pinnedStandardBodyProof'].includes(key))for(const item of Array.isArray(child)?child:[child]){const found=find(item);if(found)return found;}return null;};const sources=['pub fn chosen(value:Option<&str>)->&str{value.unwrap_or("fallback")}','pub fn empty(value:Option<&str>)->&str{value.unwrap_or_default()}','pub fn chosen(value:Option<&str>)->Result<&str,bool>{value.ok_or(false)}','pub fn chosen(value:Option<&str>)->Result<&str,bool>{value.ok_or_else(||false)}'];let rechecked=0;for(const source of sources){const held=[];for(const prefix of ['', '// cold complete B é😀\\n\\n']){const result=translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>prefix+source});assert.deepEqual(result.meta.refused,[]);const program=parseProgram(JSON.stringify(result.meta.targetSemanticProgram));held.push({program,text:emitJavaScript(program).text});}for(const item of [...held,...held.toReversed()]){requirePinnedStandardBody(find([...item.program.declarations.values()]),HostRustParser,{Checker:HostChecker,program:item.program});assert.equal(emitJavaScript(item.program).text,item.text);rechecked++;}}console.log(JSON.stringify({rechecked}));`;
  retain('complete-cold-child-source',child);
  for(let round=0;round<2;round++){
    const run=spawnSync(process.execPath,['--input-type=module','--eval',child],{cwd:fileURLToPath(new URL('../../../',import.meta.url)),encoding:'utf8',timeout:20_000,maxBuffer:4*1024*1024});
    retain('complete-cold-child-result',{round,status:run.status,signal:run.signal,error:run.error?{name:run.error.name,message:run.error.message,code:run.error.code}:null,stdout:run.stdout,stderr:run.stderr});
    assert.ifError(run.error);assert.equal(run.status,0,run.stderr);assert.equal(JSON.parse(run.stdout.trim()).rechecked,16);
  }
  for(let round=0;round<2;round++)for(const [,profile]of profiles){const held=pair('pub fn chosen(value:Option<&str>)->&str{value.unwrap_or("fallback")}',{profile,differentLayouts:true,prefix:'// warmed '+round+' é😀\n\n'});for(const item of held)await strict(item,api=>verifyString(api));}
});
