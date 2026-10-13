import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import * as actual from '../derive-clap-value-enum.mjs';
import {DERIVE_SOURCE_PROFILE,loadDeriveDependencyProof,deriveDependencySource} from '../derive-dependencies.mjs';
import {originalMacroTrees} from '../macro-token-trees.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex'),root=new URL('../../../',import.meta.url),dependencies=()=>loadDeriveDependencyProof({manifest:readFileSync(new URL('Cargo.toml',root),'utf8'),lock:readFileSync(new URL('Cargo.lock',root),'utf8')});
const previousBytes=readFileSync(new URL('../fixtures/static-source-performance/derive-clap-value-enum.mjs.txt',import.meta.url));
assert.equal(hash(previousBytes),'d9a0c0c3d9162775b8202f9b221497d938ba0f32c91dbc79dd9fd0396d3d069d');
const previousSource=previousBytes.toString().replace(/from '(\.\/[^']+)'/g,(_all,path)=>'from '+JSON.stringify(new URL('../'+path.slice(2),import.meta.url).href));
const previous=await import('data:text/javascript;base64,'+Buffer.from(previousSource).toString('base64'));
const outcome=operation=>{try{return {value:operation()};}catch(error){return {error:{name:error.name,message:error.message}};}};
const proof=dependencies();
test('every actual locked Clap helper and source pin matches the independent unchanged implementation',{timeout:120000},t=>{
  const rows=[],source=DERIVE_SOURCE_PROFILE.packages.find(entry=>entry.name==='clap_derive'),started=performance.now();
  for(const path of Object.keys(source.members)){
    const origin=deriveDependencySource(proof,'clap_derive',path),syntax=outcome(()=>originalMacroTrees(origin.source,{maxBytes:256000,maxTokens:32000,maxDepth:64}));assert.equal(hash(origin.source),source.members[path]);
    const names=new Set();if(syntax.value){function visit(nodes){for(let at=0;at<nodes.length;at++){if(nodes[at].text==='fn'&&nodes[at+1]?.kind==='token')names.add(nodes[at+1].text);if(nodes[at].kind==='group')visit(nodes[at].children);}}visit(syntax.value);}else names.add('__unparsed_original');
    for(const name of names){const before=outcome(()=>previous.originalClapSourceFunction(proof,path,name)),after=outcome(()=>actual.originalClapSourceFunction(proof,path,name));assert.deepEqual(after,before,path+'::'+name+' fullsource/span/hash/error');rows.push({path,name,sourceSha256:origin.sha256,completeResultSha256:hash(JSON.stringify(after)),span:after.value?.span??null,error:after.error??null});}
  }
  const sourceText='#[derive(clap::ValueEnum)] enum Choice{Codex,#[value(name="claude",alias="claude-code",alias="other")] ClaudeCode,XMLHttpRequest,FooBARBaz,Foo2Bar,__}';
  const before=previous.proveClapValueEnumSourceOutput({dependencies:proof,source:sourceText}),after=actual.proveClapValueEnumSourceOutput({dependencies:proof,source:sourceText});assert.deepEqual(after,before,'entire actual original quote output and helper pin evidence');
  for(const pin of before.originalRules){const origin=deriveDependencySource(proof,pin.package,pin.source),written=origin.source.slice(pin.span.start,pin.span.end);let prior,next;
    for(let count=1;count<=4;count++){prior=outcome(()=>previous.originalClapSourceRule(proof,pin.package,pin.source,written,pin.role,count));next=outcome(()=>actual.originalClapSourceRule(proof,pin.package,pin.source,written,pin.role,count));assert.deepEqual(next,prior,pin.role+' count '+count+' every source-order pin');if(next.value)break;}
    assert.ok(next.value,pin.role);rows.push({package:pin.package,path:pin.source,role:pin.role,completeResultSha256:hash(JSON.stringify(next))});
  }
  const receipt={schema:'independent-original-clap-source-inventory-v1',originalCommit:'688bf9b9a1257a1dc58c758b50b6906ecc4eee63',previousModuleSha256:hash(previousBytes),sourceMembers:Object.keys(source.members).length,inventoryEntries:rows.length,completeQuoteOutputSha256:hash(JSON.stringify(after)),elapsedMilliseconds:performance.now()-started,rows};t.diagnostic(JSON.stringify({...receipt,rows:undefined}));t.diagnostic('complete-comparison-base64:'+Buffer.from(JSON.stringify(receipt)).toString('base64'));
});
test('cached source inventories preserve every predicate effect order failure recursion and fresh evidence allocation',()=>{
  const path='src/item.rs';actual.originalClapSourceFunction(proof,path,'new',text=>text.includes('let group_id = Name::Derived(ident)'));
  function effects(api,behavior){const seen=[];const result=outcome(()=>api.originalClapSourceFunction(proof,path,'new',text=>{seen.push(text);return behavior(text,seen.length);}));return {seen,result};}
  for(const predicate of [()=>true,()=>false,(text,index)=>index===2,(text,index)=>{if(index===2)throw new Error('second original predicate');return false;},text=>text.includes('Self { name, args }')])assert.deepEqual(effects(actual,predicate),effects(previous,predicate));
  const called=[];const recursive=actual.originalClapSourceFunction(proof,path,'new',text=>{called.push(actual.originalClapSourceFunction(proof,path,'field_methods'));return text.includes('let group_id = Name::Derived(ident)');});assert.ok(called.length>1);assert.equal(recursive.source,path);
  const predicate=text=>text.includes('let group_id = Name::Derived(ident)'),first=actual.originalClapSourceFunction(proof,path,'new',predicate),second=actual.originalClapSourceFunction(proof,path,'new',predicate);assert.deepEqual(first,second);assert.notStrictEqual(first,second);assert.notStrictEqual(first.span,second.span);first.span.start=0;first.sha256='forged';assert.deepEqual(actual.originalClapSourceFunction(proof,path,'new',predicate),previous.originalClapSourceFunction(proof,path,'new',predicate));
  const foreign=dependencies();assert.deepEqual(actual.originalClapSourceFunction(foreign,path,'new',predicate),second);assert.notStrictEqual(actual.originalClapSourceFunction(foreign,path,'new',predicate),second);
});
test('rule source-order duplicate controls fresh role identity and unknown inputs remain unchanged',()=>{
  const path='src/item.rs',written='Kebab => s.to_kebab_case(),',role={opaque:Symbol('retained')};
  const first=actual.originalClapSourceRule(proof,'clap_derive',path,written,role,2),second=actual.originalClapSourceRule(proof,'clap_derive',path,written,role,2);assert.deepEqual(first,previous.originalClapSourceRule(proof,'clap_derive',path,written,role,2));assert.strictEqual(first[0].role,role);assert.strictEqual(first[1].role,role);assert.notStrictEqual(first,second);assert.notStrictEqual(first[0],second[0]);assert.notStrictEqual(first[0].span,second[0].span);assert.ok(first[0].span.start<first[1].span.start);
  first[0].span.start=0;first.pop();assert.deepEqual(actual.originalClapSourceRule(proof,'clap_derive',path,written,role,2),second);
  for(const count of [0,1,3,undefined])assert.deepEqual(outcome(()=>actual.originalClapSourceRule(proof,'clap_derive',path,written,'count',count)),outcome(()=>previous.originalClapSourceRule(proof,'clap_derive',path,written,'count',count)));
  for(const text of ['missing','',null,23,'r#"\ud800"#'])assert.deepEqual(outcome(()=>actual.originalClapSourceRule(proof,'clap_derive',path,text,'changed')),outcome(()=>previous.originalClapSourceRule(proof,'clap_derive',path,text,'changed')));
});
test('copied proxy getter foreign and changed source identities cannot borrow private dependency inventories',()=>{
  const path='src/item.rs';actual.originalClapSourceFunction(proof,path,'field_methods');let traps=0;
  const proxy=new Proxy(proof,{get(){traps++;throw new Error('must not inspect');},ownKeys(){traps++;throw new Error('must not inspect');}}),getter=Object.defineProperty({},'packages',{get(){traps++;throw new Error('must not inspect');}});
  for(const dependencies of [structuredClone(proof),Object.freeze({...proof}),proxy,getter,null]){assert.throws(()=>actual.originalClapSourceFunction(dependencies,path,'field_methods'),/Unsealed/);assert.throws(()=>actual.originalClapSourceRule(dependencies,'clap_derive',path,'fn','role'),/Unsealed/);}assert.equal(traps,0);
  const origin=deriveDependencySource(proof,'clap_derive',path);assert.throws(()=>origin.source+=' ',TypeError);assert.throws(()=>origin.sha256='0'.repeat(64),TypeError);
  for(const changed of [path+' ','missing.rs',undefined])assert.deepEqual(outcome(()=>actual.originalClapSourceFunction(proof,changed,'field_methods')),outcome(()=>previous.originalClapSourceFunction(proof,changed,'field_methods')));
  assert.deepEqual(outcome(()=>actual.originalClapSourceFunction(proof,path,'missing')),outcome(()=>previous.originalClapSourceFunction(proof,path,'missing')));assert.deepEqual(outcome(()=>actual.originalClapSourceFunction(proof,path,'new',undefined)),outcome(()=>previous.originalClapSourceFunction(proof,path,'new',undefined)));
});

test('one source inventory is parsed inside each genuine dependency identity while predicates and rules remain fresh',async()=>{
  const bytes=readFileSync(new URL('../derive-clap-value-enum.mjs',import.meta.url)),instrumented=bytes.toString().replace(/from '(\.\/[^']+)'/g,(_all,path)=>'from '+JSON.stringify(new URL('../'+path.slice(2),import.meta.url).href)).replace('import {rustTokens,sourceItems} from ','import {rustTokens as pinnedTokens,sourceItems as pinnedItems} from ')+'\nlet itemParses=0,tokenParses=0;const sourceItems=(...args)=>{itemParses++;return pinnedItems(...args);};const rustTokens=(...args)=>{tokenParses++;return pinnedTokens(...args);};export const parseCounts=()=>({itemParses,tokenParses});';
  const measured=await import('data:text/javascript;base64,'+Buffer.from(instrumented).toString('base64')),first=dependencies(),path='src/item.rs';
  measured.originalClapSourceFunction(first,path,'field_methods');const declarations=measured.parseCounts().itemParses;assert.ok(declarations>1);measured.originalClapSourceFunction(first,path,'deprecations');assert.equal(measured.parseCounts().itemParses,declarations);
  measured.originalClapSourceRule(first,'clap_derive',path,'Kebab => s.to_kebab_case(),','kebab',2);assert.equal(measured.parseCounts().tokenParses,2);measured.originalClapSourceRule(first,'clap_derive',path,'Kebab => s.to_kebab_case(),','kebab',2);assert.equal(measured.parseCounts().tokenParses,3,'the untrusted written pattern still receives its own fresh scan');
  const second=dependencies();measured.originalClapSourceFunction(second,path,'field_methods');assert.equal(measured.parseCounts().itemParses,declarations*2);measured.originalClapSourceRule(second,'clap_derive',path,'Kebab => s.to_kebab_case(),','kebab',2);assert.equal(measured.parseCounts().tokenParses,5);
  assert.throws(()=>measured.originalClapSourceFunction({...first},path,'field_methods'),/Unsealed/);assert.equal(measured.parseCounts().itemParses,declarations*2);
  assert.throws(()=>loadDeriveDependencyProof({manifest:readFileSync(new URL('Cargo.toml',root),'utf8')+' ',lock:readFileSync(new URL('Cargo.lock',root),'utf8')}),/manifest|lock/);
});
