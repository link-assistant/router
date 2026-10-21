import {repositorySourceURL} from "./fixtures/repository-paths.mjs";
import testCase from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {translateProject} from '../project.mjs';
import {parseProgram,serializeProgram} from '../semantic-meta.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE,ROUTER_CORE_PRIMITIVES_SOURCE,ROUTER_CORE_RANGES_SOURCE} from '../router-core-source-data.mjs';
import {proposeCoreAlgebraicCorpus} from '../migrate-core-algebraic.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {serde_json_from_str} from '../extensions/json-runtime.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';

const C='crate::translation_core::',M=C+'Maybe',R=C+'Outcome',J=C+'Json',S='&'+C+'Str';
const sha=source=>createHash('sha256').update(source).digest('hex');
let vectors=[];const retain=(kind,value)=>{vectors.push({kind,value});return value;};
const test=(name,run)=>testCase(name,{timeout:60_000},async()=>{vectors=[];try{await run();}finally{if(process.env.ROUTER_CORE_ALGEBRAIC_VECTOR_DIR){const root=process.env.ROUTER_CORE_ALGEBRAIC_VECTOR_DIR;mkdirSync(root,{recursive:true});writeFileSync(join(root,Buffer.from(name).toString('hex')+'.json'),JSON.stringify({name,vectors},(_,value)=>typeof value==='bigint'?{$integer:String(value)}:value)+'\n');}}});
const files=(source,extra={})=>({'src/lib.rs':'pub mod translation_core;\n'+source,'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE,...extra});
function project(input){retain('complete-input-files',input);return retain('complete-project-result',translateProject({entry:'src/lib.rs',paths:Object.keys(input),readSource:path=>input[path]}));}
const has=(result,name)=>result.meta.executable.some(row=>row.name===name);
function checked(result){const wire=JSON.stringify(result.meta.checkedSemanticProgram),meta=parseProgram(wire);retain('complete-checked-meta',{wire,meta});assert.equal(serializeProgram(meta),wire);}
async function targets(result,verify){checked(result);retain('complete-target-artifacts',{javascript:result.javascript,typescript:result.typescript});await verifyTypedTargets(result,verify,{childTimeoutMs:20_000});}
function json(text){const value=serde_json_from_str(text);assert.equal(value.$,'Ok');return value.field0;}
function inverse(proposal){let source=proposal.after.source;for(const row of [...proposal.mapping].reverse())if(row.kind==='substitution')source=source.slice(0,row.after[0])+row.expected+source.slice(row.after[1]);return source;}

test('owned Maybe and Outcome use canonical variants and both typed targets',async()=>{
  const source=`pub fn choose(v:bool)->${M}<bool>{if v{${M}::Some(true)}else{${M}::None}} pub fn present(v:${M}<bool>)->bool{match v{${M}::Some(value)=>value,${M}::None=>false}} pub fn decide(v:bool)->${R}<bool,${C}Text>{if v{${R}::Ok(true)}else{${R}::Err(${C}format!("no"))}}`;
  const result=project(files(source));for(const name of ['choose','present','decide'])assert.equal(has(result,name),true,name);
  await targets(result,api=>{const some=api.choose(true),none=api.choose(false),ok=api.decide(true),error=api.decide(false);retain('actual-variant-results',{some,none,ok,error});assert.deepEqual(some,{$:'Some',field0:true});assert.deepEqual(none,{$:'None'});assert.deepEqual(ok,{$:'Ok',field0:true});assert.deepEqual(error,{$:'Err',field0:'no'});assert.equal(api.present(some),true);assert.equal(api.present(none),false);assert.equal(Object.isFrozen(some),true);assert.throws(()=>api.present(Object.freeze({$: 'Some',field0:1})),TypeError);});
});

test('owned Json routes preserve scalar types nested defaults and registered representations',async()=>{
  const source=`pub fn raw(v:&${J})->${M}<bool>{${J}::as_bool(v)} pub fn flag(v:&${J})->bool{${J}::get(v,"ready").and_then(${J}::as_bool).unwrap_or(false)} pub fn build(v:bool)->${J}{${J}::Bool(v)} pub fn null()->${J}{${J}::Null}`;
  const result=project(files(source));for(const name of ['raw','flag','build','null'])assert.equal(has(result,name),true,name);
  await targets(result,api=>{const inputs=['true','false','null','{}','{"ready":true}','{"ready":false}','{"ready":"true"}','{"ready":null}'],observed=inputs.map(text=>[api.raw(json(text)),api.flag(json(text))]);retain('independent-JSON-inputs-and-results',{inputs,observed});assert.deepEqual(observed,[[{$:'Some',field0:true},false],[{$:'Some',field0:false},false],[{$:'None'},false],[{$:'None'},false],[{$:'None'},true],[{$:'None'},false],[{$:'None'},false],[{$:'None'},false]]);assert.deepEqual(api.build(true),{$:'Bool',field0:true});assert.deepEqual(api.null(),{$:'Null'});assert.throws(()=>api.flag({ready:true}),TypeError);});
});

test('actual owned sources are mandatory and copied source spelling grants no alias',()=>{
  const source=`pub fn f(v:&${J})->bool{${J}::is_null(v)}`;
  for(const input of [files(source,{'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE.replace('::serde_json::Value','bool')}),files(source,{'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE.replace('Json, Maybe','Maybe')}),files(source,{'src/lib.rs':'mod translation_core;\n'+source})]){const result=project(input);assert.equal(has(result,'f'),false);}
  for(const source of [`pub fn f()->${M}<bool>{${M}::None()}`,`pub fn f()->${M}<bool>{${M}::Some}`,`pub fn f(v:&mut ${J})->bool{true}`,`pub fn f(v:${C}NotRegistered<bool>)->bool{true}`])assert.equal(has(project(files(source)),'f'),false);
  const leaf=readFileSync(new URL('../../../rust/src/translation_core/primitives.rs',import.meta.url),'utf8');retain('complete-physical-and-registered-primitives',{leaf,registered:ROUTER_CORE_PRIMITIVES_SOURCE,sha256:sha(leaf)});assert.equal(leaf,ROUTER_CORE_PRIMITIVES_SOURCE);
});

test('payload mutation borrowing and destruction retain existing refusal boundaries',()=>{
  const sources=[`struct Payload{value:${C}Text}impl Drop for Payload{fn drop(&mut self){}}pub fn f(v:${M}<Payload>,fallback:Payload)->Payload{v.unwrap_or(fallback)}`,`pub fn f(v:${M}<bool>)->bool{let mut changed=false;v.is_some_and(|item|{changed=true;item});changed}`,`pub fn f(v:&${M}<${C}Text>)->${C}Text{v.unwrap_or(${C}format!("fallback"))}`,`pub fn f()->${M}<bool>{${R}::Ok(true)}`];
  for(const source of sources){const result=project(files(source));assert.equal(has(result,'f'),false,source);retain('complete-existing-ownership-refusal',result.meta.refused);}
});

test('reusable CST type adoption traverses nested generics aliases and unchanged unsupported bodies',()=>{
  const source=`use serde_json::Value as Message; pub fn flag(v:&Message)->Option<bool>{v.get("ready").and_then(Message::as_bool)} pub fn carried(v:Result<Option<bool>,String>)->Option<String>{unknown!()} pub const EMPTY:Option<bool> = None;`;
  const proposal=retain('complete-reusable-type-proposal',proposeCoreAlgebraicCorpus({files:files(source)})),row=proposal.proposals.find(row=>row.file==='src/lib.rs');
  assert.ok(row.edits.length>=7);assert.equal(inverse(row),files(source)['src/lib.rs']);assert.equal(transportConcreteSyntaxMeta(row.before.meta).source,row.before.source);assert.equal(transportConcreteSyntaxMeta(row.after.meta).source,row.after.source);assert.match(row.after.source,/crate::translation_core::Maybe<crate::translation_core::Outcome|crate::translation_core::Outcome<crate::translation_core::Maybe/);assert.match(row.after.source,/unknown!\(\)/);assert.equal(row.executableAdmission,false);assert.deepEqual(row.trace.map(row=>row.phase),['language','repository']);
  const twice=retain('complete-idempotent-type-proposal',proposeCoreAlgebraicCorpus({files:proposal.after}));assert.equal(twice.proposals.flatMap(row=>row.edits).length,0);
});

test('ambiguous imported and produced types preserve source and explicit skip evidence',()=>{
  for(const source of ['use unknown::*;pub fn f(v:Option<bool>)->Result<bool,String>{Ok(true)}','struct Option;pub fn f(v:Option<bool>)->bool{true}','emit!();pub fn f(v:Option<bool>)->bool{true}','#[unknown] pub fn f(v:Option<bool>)->bool{true}','use other::Value;pub fn f(v:&Value)->bool{true}']){
    const proposal=retain('complete-ambiguous-type-proposal',proposeCoreAlgebraicCorpus({files:files(source)})),row=proposal.proposals.find(row=>row.file==='src/lib.rs');assert.equal(row.after.source,row.before.source);assert.equal(inverse(row),row.before.source);
  }
  assert.throws(()=>proposeCoreAlgebraicCorpus({files:files('pub fn f()->bool{true}',{'src/translation_core/primitives.rs':'pub type Json=bool;'})}),/owned core/);
  // Full source proposals preserve nonconstructor spelling and every binder
  // context; only separately closed simple constructor calls are selected.
  const bodies=['v.Some()','v.None','None()','Record{None:true}','Record{None}','Record{Some:true}','Record{Some}','r#Some(true)','let mut Some=true;Some','let mut None=true;None','for Some in values{}None','for Some(value) in values{}None','let Some(value)=v;Some(value)','match v{Some(value)=>Some(value),None=>None}','let value:Some=v;value','if v{Some(true)}else{None}'];
  for(const body of bodies){
    const source=`pub fn f(v:Option<bool>)->Option<bool>{${body}}`,proposal=retain('complete-constructor-context-preservation',proposeCoreAlgebraicCorpus({files:files(source)})),row=proposal.proposals.find(row=>row.file==='src/lib.rs');
    assert.equal(inverse(row),row.before.source);assert.equal(row.after.source.endsWith('{'+body+'}'),true,body);assert.equal(row.edits.some(edit=>['Some','None','Ok','Err'].includes(edit.expected)),false,body);
  }
  for(const [body,type,member] of [['Some(true)','Option<bool>','Maybe::Some'],['return Ok(true);','Result<bool,bool>','Outcome::Ok'],['Option::Some(true)','Option<bool>','Maybe::Some']]){
    const source=`pub fn f()->${type}{${body}}`,proposal=retain('complete-closed-constructor-selection',proposeCoreAlgebraicCorpus({files:files(source)})),row=proposal.proposals.find(row=>row.file==='src/lib.rs');assert.equal(inverse(row),row.before.source);assert.ok(row.after.source.includes(C+member));
  }
  for(const source of ['fn Some(v:bool)->bool{v}pub fn f()->Option<bool>{Some(true)}','pub fn f(Some:bool)->Option<bool>{Some(true)}']){
    const proposal=retain('complete-shadowed-constructor-preservation',proposeCoreAlgebraicCorpus({files:files(source)})),row=proposal.proposals.find(row=>row.file==='src/lib.rs');assert.equal(inverse(row),row.before.source);assert.equal(row.edits.some(edit=>edit.expected==='Some'),false);
  }

});

// Complete current Router helper bodies, retained as portable authored source.
const actualHelpers={
  is_resolved:'fn is_resolved(task: &Value) -> bool {\n    task.get("isResolved")\n        .and_then(Value::as_bool)\n        .unwrap_or(false)\n}',
  request_asks_for_a_stream:'fn request_asks_for_a_stream(record: &Value) -> bool {\n    record\n        .get("body")\n        .and_then(|body| body.get("json"))\n        .and_then(|body| body.get("stream"))\n        .and_then(Value::as_bool)\n        .unwrap_or(false)\n}',
  is_private:'pub fn is_private(message: &Value) -> bool {\n    message.pointer("/chat/type").and_then(Value::as_str) == Some("private")\n}',
  update_id:'fn update_id(update: &Value) -> i64 {\n    update.get("update_id").and_then(Value::as_i64).unwrap_or(0)\n}',
};
test('complete real scalar helpers adopt through the corpus rule and execute both targets',async()=>{
  const source='use serde_json::Value;\n'+Object.values(actualHelpers).join('\n'),input=files(source),before=project(input),proposal=retain('complete-actual-helper-corpus-proposal',proposeCoreAlgebraicCorpus({files:input})),after=project(proposal.after);
  retain('complete-portable-original-helpers',actualHelpers);retain('full-original-before-project',before);for(const name of Object.keys(actualHelpers))assert.equal(has(after,name),true,name);for(const row of proposal.proposals)assert.equal(inverse(row),row.before.source);
  await targets(after,api=>{const observed={resolved:[api.is_resolved(json('{}')),api.is_resolved(json('{"isResolved":true}')),api.is_resolved(json('{"isResolved":"true"}'))],stream:[api.request_asks_for_a_stream(json('{}')),api.request_asks_for_a_stream(json('{"body":{"json":{"stream":true}}}')),api.request_asks_for_a_stream(json('{"body":{"json":{"stream":false}}}'))],private:[api.is_private(json('{"chat":{"type":"private"}}')),api.is_private(json('{"chat":{"type":"group"}}')),api.is_private(json('{}'))],id:[api.update_id(json('{"update_id":-7}')),api.update_id(json('{"update_id":9223372036854775807}')),api.update_id(json('{}'))]};retain('actual-Router-helper-outcomes',observed);assert.deepEqual(observed,{resolved:[false,true,false],stream:[false,true,false],private:[true,false,false],id:[-7n,9223372036854775807n,0n]});});
});

test('edited concrete sources receive fresh semantic checks and complete current corpus proposals',()=>{
  const source=`pub fn value()->${M}<bool>{${M}::Some(true)}`,stage=transportConcreteSyntaxSource(source,{language:'Rust'}),original=project(files(transportConcreteSyntaxMeta(stage.meta).source));assert.equal(has(original,'value'),true);
  const edited=transportConcreteSyntaxSource(source.replace('::Some(true)','::Unregistered(true)'),{language:'Rust'}),refused=project(files(transportConcreteSyntaxMeta(edited.meta).source));assert.equal(has(refused,'value'),false);retain('complete-original-and-edited-concrete',{stage,edited,original,refused});
  const physical={};for(const path of ['src/lib.rs','src/translation_core.rs','src/translation_core/primitives.rs','src/translation_core/ranges.rs'])physical[path]=readFileSync(repositorySourceURL(path,new URL('../../../',import.meta.url)),'utf8');
  retain('complete-current-physical-core-sources',physical);
  // The complete original lib.rs graph is supplied by the integration producer;
  // a local closed fixture still retains current physical facade bytes here.
  const proposal=retain('current-physical-core-proposal',proposeCoreAlgebraicCorpus({files:files('pub fn same(v:Option<bool>)->Option<bool>{v}',{'src/translation_core.rs':physical['src/translation_core.rs'],'src/translation_core/primitives.rs':physical['src/translation_core/primitives.rs'],'src/translation_core/ranges.rs':physical['src/translation_core/ranges.rs']})}));for(const row of proposal.proposals)assert.equal(inverse(row),row.before.source);
  const coldInput=files(`pub fn cold()->${M}<bool>{${M}::Some(true)}`),script=`import {readFileSync} from 'node:fs';const {translateProject}=await import(${JSON.stringify(new URL('../project.mjs',import.meta.url).href)});const files=JSON.parse(readFileSync(0,'utf8'));const result=translateProject({entry:'src/lib.rs',paths:Object.keys(files),readSource:path=>files[path]});console.log(JSON.stringify({executable:result.meta.executable,refused:result.meta.refused}));`;
  const cold=spawnSync(process.execPath,['--input-type=module','-e',script],{input:JSON.stringify(coldInput),encoding:'utf8',timeout:20_000});retain('actual-cold-same-engine-owned-alias-entry',{input:coldInput,script,status:cold.status,signal:cold.signal,stdout:cold.stdout,stderr:cold.stderr,error:cold.error?{name:cold.error.name,message:cold.error.message}:null});assert.equal(cold.status,0);assert.equal(JSON.parse(cold.stdout).executable.some(row=>row.name==='cold'),true);
});
