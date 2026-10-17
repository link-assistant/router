import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {types} from 'node:util';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {gzipSync} from 'node:zlib';
import {join} from 'node:path';
import {translateProject,originalProjectDeclarationRefusalRange,originalProjectDeclarationRefusalRanges} from '../project.mjs';
import {originalMethodRefusalRange,originalMethodSemanticFacts,isOriginalMethodSemanticSource} from '../source-method-admission.mjs';
import {originalMethodParsedFacts} from '../source-method-parser.mjs';
import {originalMethodTransformFacts} from '../source-method-transforms.mjs';
import {originalDataFreezeIntrinsicsUnchanged} from '../original-json-intrinsics.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {parseProgram,serializeProgram} from '../semantic-meta.mjs';
import {serializeConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {readRustConcreteSyntaxMeta} from '../forward-concrete-syntax.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
import {associatedOriginalParentInputs,associatedOriginalDependencyInputs} from './associated-original-context.mjs';
const root=new URL('../../../',import.meta.url),get=Object.getOwnPropertyDescriptor,fields=Object.getOwnPropertyDescriptors,define=Object.defineProperty,apply=Reflect.apply;
const hashPrototype=Object.getPrototypeOf(createHash('sha256'));
let captureAttempt=0;
const body='pub struct Counter{value:u8}impl Counter{pub fn bad()->u8{missing()}pub fn good(v:u8)->u8{v+2}}pub fn run(v:u8)->u8{Counter::good(v)}';
function retain(label,value){const folder=process.env.ROUTER_GROUPED_REFUSAL_VECTOR_DIR;if(!folder)return;mkdirSync(folder,{recursive:true});writeFileSync(join(folder,label+'.json.gz'),gzipSync(JSON.stringify(value,(_key,item)=>typeof item==='bigint'?{$integer:item.toString()}:item)),{flag:'wx'});}
function outcome(action){try{return {value:action()};}catch(error){return {error:{name:error.name,message:error.message,reason:error.reason,span:error.span}};}}
const pair=(surface,path)=>({methodRange:originalMethodRefusalRange(surface,path),projectRange:originalProjectDeclarationRefusalRange(surface,path)});
function compile(files,options={}){return translateProject({entry:'src/lib.rs',paths:Object.keys(files),readSource:path=>files[path],...options});}
// A test observer retains an ACTUAL project-issued range association. It never
// writes an association or substitutes compiler input. The short-lived set hook
// is installed only after the range-capture digest has run, and restores itself
// at that same genuine capture before the checker or any later proof executes.
function capturedProject(files,{method='bad',...options}={}){
  const attempt=++captureAttempt,update=get(hashPrototype,'update'),weakSet=get(WeakMap.prototype,'set');let armed=false,captured=null;
  const marker='"method":'+JSON.stringify(method),observations=[];
  const directCapture=()=>{const frames=String(new Error().stack).split('\n'),index=frames.findIndex(frame=>/\bmetadataDigest\b/u.test(frame));return index>=0&&frames[index+1]?.includes('captureDeclarationRange');};
  try{
    define(hashPrototype,'update',{...update,value(...args){
      const result=apply(update.value,this,args);
      if(!armed&&!captured&&typeof args[0]==='string'&&args[0].includes(marker)&&args[0].includes('original-method-semantic-source-v1')&&directCapture()){
        armed=true;
        define(WeakMap.prototype,'set',{...weakSet,value(key,value){
          const result=apply(weakSet.value,this,[key,value]);
          if(value&&typeof value==='object'&&!types.isProxy(value)){
            const own=fields(value);
            if(own.parent?.value===key&&own.range&&own.digest&&own.parentPath&&own.path){captured={surface:key,association:value};observations.push({kind:'actual-project-range-capture',range:own.range.value,path:own.path.value,digest:own.digest.value});define(WeakMap.prototype,'set',weakSet);armed=false;}
          }
          return result;
        }});
      }
      return result;
    }});
    const result=compile(files,options);
    if(!captured)retain('capture-missing-'+String(attempt),{files,result:{meta:result.meta,javascript:result.javascript,typescript:result.typescript},observations,armed,method});
    assert.ok(captured,'the genuine project pipeline must issue the requested original method association');
    assert.equal(armed,false);return {...captured,result,files,observations};
  }finally{define(WeakMap.prototype,'set',weakSet);define(hashPrototype,'update',update);}
}
function tape(action){const update=get(hashPrototype,'update'),digest=get(hashPrototype,'digest'),calls=[];let result;try{
  define(hashPrototype,'update',{...update,value(...args){const row={operation:'update',arguments:args.map(value=>Buffer.isBuffer(value)?{bufferBase64:value.toString('base64')}:value),types:args.map(value=>typeof value),receiverIsHash:Object.getPrototypeOf(this)===hashPrototype};calls.push(row);const result=apply(update.value,this,args);row.returnedSameReceiver=result===this;return result;}});
  define(hashPrototype,'digest',{...digest,value(...args){const row={operation:'digest',arguments:args,types:args.map(value=>typeof value),receiverIsHash:Object.getPrototypeOf(this)===hashPrototype};calls.push(row);const result=apply(digest.value,this,args);row.result=Buffer.isBuffer(result)?{bufferBase64:result.toString('base64')}:result;row.resultType=typeof result;return result;}});
  result=outcome(action);
}finally{define(hashPrototype,'update',update);define(hashPrototype,'digest',digest);}return {result,calls};}
function state(row){const semantic=originalMethodSemanticFacts(row.surface),parsed=originalMethodParsedFacts(semantic.parsed),transform=originalMethodTransformFacts(semantic.transform);return {semantic,parsed,transform};}
function complete(row){return JSON.parse(JSON.stringify({files:row.files,observations:row.observations,surface:row.surface,association:{path:row.association.path,parentPath:row.association.parentPath,range:row.association.range,digest:row.association.digest},meta:row.result.meta,javascript:row.result.javascript,typescript:row.result.typescript},(_key,item)=>typeof item==='bigint'?{$integer:item.toString()}:item));}

test('one genuine project method returns both independently joined ranges with complete grouped observations',{timeout:60000},async()=>{
  const row=capturedProject({'src/lib.rs':body}),old=tape(()=>pair(row.surface,[])),current=tape(()=>originalProjectDeclarationRefusalRanges(row.surface,[]));
  retain('01-genuine-grouped-range',{subject:complete(row),guard:originalDataFreezeIntrinsicsUnchanged(),old,current,groupedScheduleExplicit:true,fullTapesIntentionallyDifferent:true});
  assert.deepEqual(current.result,old.result);assert.deepEqual(current.result.value,{methodRange:row.association.range,projectRange:row.association.range});
  if(originalDataFreezeIntrinsicsUnchanged())assert.ok(current.calls.length<old.calls.length);else assert.deepEqual(current.calls,old.calls);
  assert.ok(row.result.meta.refused.some(entry=>entry.name==='Counter.bad'));assert.deepEqual(row.result.meta.checkedMethods.map(entry=>entry.name),['Counter.good']);
  await verifyTypedTargets(row.result,api=>{assert.equal(api.run(4n),6n);assert.equal(api.run(5n),7n);assert.throws(()=>api.run(255n),RangeError);},{childTimeoutMs:20000});
});

test('root inline and external original parents preserve exact full-source relocation and path boundaries',{timeout:60000},()=>{
  const cases=[{'src/lib.rs':body},{'src/lib.rs':'pub mod model;pub fn run(v:u8)->u8{model::Counter::good(v)}','src/model.rs':body.replace('pub fn run(v:u8)->u8{Counter::good(v)}','')},{'src/lib.rs':'pub mod model{'+body.replace('pub fn run(v:u8)->u8{Counter::good(v)}','')+'}pub fn run(v:u8)->u8{model::Counter::good(v)}'}],rows=[];
  for(const files of cases){const row=capturedProject(files),path=row.association.path,actual=originalProjectDeclarationRefusalRanges(row.surface,path),wrong=originalProjectDeclarationRefusalRanges(row.surface,[...path,'wrong']);rows.push({subject:complete(row),path,actual,wrong});retain('02-path-'+String(rows.length),rows.at(-1));assert.deepEqual(actual,pair(row.surface,path));assert.deepEqual(actual.methodRange,row.association.range);assert.deepEqual(wrong,{methodRange:null,projectRange:null});assert.ok(row.result.meta.executable.some(entry=>entry.name==='run'));}
  retain('02-full-parent-paths',{rows});
});

test('copied forged proxy and accessor objects cannot mint semantic membership or either original range',{timeout:60000},()=>{
  const row=capturedProject({'src/lib.rs':body}),before=complete(row),rows=[];let reads=0;
  const traps={get(){reads++;throw Error('get');},ownKeys(){reads++;throw Error('keys');},getPrototypeOf(){reads++;throw Error('prototype');},getOwnPropertyDescriptor(){reads++;throw Error('descriptor');}};
  for(const [label,value]of [['copy',structuredClone(row.surface)],['proxy',new Proxy(row.surface,traps)],['accessor',Object.defineProperty({},'sourceMethodProof',{get(){reads++;return row.surface.sourceMethodProof;}})],['plain',{$:'forged',sourceMethodProof:row.surface.sourceMethodProof}]]){const membership=isOriginalMethodSemanticSource(value),actual=outcome(()=>originalProjectDeclarationRefusalRanges(value,[])),old=outcome(()=>pair(value,[]));rows.push({label,membership,actual,old});retain('03-forged-'+label,{before,...rows.at(-1),reads});assert.equal(membership,false);assert.deepEqual(actual,old);assert.deepEqual(actual.value,{methodRange:null,projectRange:null});}
  const has=get(WeakMap.prototype,'has'),copy=structuredClone(row.surface);let falseIdentity;try{define(WeakMap.prototype,'has',{...has,value(){return true;}});falseIdentity={publicBoolean:isOriginalMethodSemanticSource(copy),guard:originalDataFreezeIntrinsicsUnchanged(),current:outcome(()=>originalProjectDeclarationRefusalRanges(copy,[])),old:outcome(()=>pair(copy,[]))};}finally{define(WeakMap.prototype,'has',has);}retain('03-forged-membership',{before,rows,reads,falseIdentity});assert.equal(reads,0);assert.equal(isOriginalMethodSemanticSource(row.surface),true);assert.equal(falseIdentity.guard,false);assert.ok(falseIdentity.current.error);assert.deepEqual(falseIdentity.current,falseIdentity.old);
});

test('fresh semantic parser token namespace and field mutations remain internal refusals instead of source batches',{timeout:60000},()=>{
  const mutations=[['body',row=>{row.surface.body={k:'num',value:'99',span:row.surface.body.span};}],['parsed-return',(_row,facts)=>{facts.parsed.entry.ret={kind:'bool'};}],['lowered-token',(_row,facts)=>{facts.transform.lowered.tokens[0].value='changed';}],['original-member',(_row,facts)=>{facts.transform.method.source+=' ';}],['parser-namespace',(_row,facts)=>{facts.parsed.parser.sourceNamespaceEvidence={changed:true};}]],rows=[];
  for(const [label,change]of mutations){const row=capturedProject({'src/lib.rs':body}),before=complete(row),facts=state(row);change(row,facts);const current=outcome(()=>originalProjectDeclarationRefusalRanges(row.surface,[])),old=outcome(()=>pair(row.surface,[]));rows.push({label,before,mutationSource:Function.prototype.toString.call(change),current,old});retain('04-mutation-'+label,rows.at(-1));assert.ok(current.error);assert.equal(current.error.name,'TypeError');assert.deepEqual(current,old);}
  const sharedSource='pub struct Counter{value:u8}impl Counter{pub fn bad(&self)->u8{missing()}pub fn good(v:u8)->u8{v}}pub fn run(v:u8)->u8{Counter::good(v)}',row=capturedProject({'src/lib.rs':sharedSource}),before=complete(row);row.surface.params[0].type.rustReference.pointee.rustSharedFieldCopies=[{forged:true}];const current=outcome(()=>originalProjectDeclarationRefusalRanges(row.surface,[])),old=outcome(()=>pair(row.surface,[]));rows.push({label:'shared-field-annotations',before,current,old});retain('04-current-source-mutations',{rows});assert.ok(current.error);assert.equal(current.error.name,'TypeError');assert.deepEqual(current,old);
});

test('ordinary generated Default Clone and unresolved structural origins retain their complete independent paths',{timeout:60000},async()=>{
  const manifest=readFileSync(new URL('Cargo.toml',root),'utf8'),lock=readFileSync(new URL('Cargo.lock',root),'utf8'),dependencies=loadDeriveDependencyProof({manifest,lock}),options={cargoManifest:manifest,deriveDependencies:dependencies,compilationProfile:PRODUCTION_PROFILE};
  const subjects=[
    ['ordinary','pub fn bad()->u8{missing()}pub fn good()->u8{7}'],
    ['Default','#[derive(Default)]pub struct Payload{value:u32}pub fn make()->Payload{Payload::default()}pub fn bad()->u8{missing()}'],
    ['Clone','#[derive(Clone)]pub struct Payload{value:u32}pub fn duplicate(value:&Payload)->Payload{value.clone()}pub fn bad()->u8{missing()}'],
    ['structural','pub type Args=MissingOwner;impl Args{pub fn bad(&self)->Option<Missing>{None}}pub fn good()->u8{11}'],
  ],rows=[];
  for(const [label,source]of subjects){const files={'src/lib.rs':source},current=compile(files,options),ordinary=compile(files,{...options,collectIndependentBodies:false}),refusals=result=>result.meta.refused.map(({name,message,span})=>({name,message,span})).sort((a,b)=>a.name.localeCompare(b.name));rows.push({label,files,current,ordinary});retain('05-origin-'+label,rows.at(-1));assert.deepEqual(refusals(current),refusals(ordinary));assert.equal(current.javascript,ordinary.javascript);assert.equal(current.typescript,ordinary.typescript);if(label==='Default')assert.ok(current.meta.checkedGeneratedMethods.some(entry=>entry.generator==='core::default::Default'));if(label==='Clone')assert.ok(current.meta.checkedGeneratedMethods.some(entry=>entry.generator==='core::clone::Clone'));if(label==='structural')assert.equal(current.meta.checkedMethods.length,0);}
  retain('05-other-origins',{rows});await verifyTypedTargets(rows[0].current,api=>assert.equal(api.good(),7n),{childTimeoutMs:20000});
});

test('altered native operations preserve the exact old fallback observations without retrying a prefix',{timeout:60000},()=>{
  const row=capturedProject({'src/lib.rs':body}),rows=[];
  for(const [owner,key]of [[Object,'defineProperty'],[Array.prototype,'some'],[WeakMap.prototype,'get']]){
    const previous=get(owner,key);let calls=0,old,current,left,right;
    try{define(owner,key,{...previous,value(...args){calls++;return apply(previous.value,this,args);}});assert.equal(originalDataFreezeIntrinsicsUnchanged(),false);calls=0;old=tape(()=>pair(row.surface,[]));left=calls;calls=0;current=tape(()=>originalProjectDeclarationRefusalRanges(row.surface,[]));right=calls;}
    finally{define(owner,key,previous);}
    rows.push({operation:key,left,right,old,current});retain('06-operation-'+key,rows.at(-1));assert.deepEqual(current,old);assert.equal(right,left);assert.ok(left>0);
  }
  let reads=0;for(const [label,path]of [['getter',Object.defineProperty([],0,{enumerable:true,get(){reads++;throw Error('path getter');}})],['proxy',new Proxy([],{get(){reads++;throw Error('path proxy');}})],['sparse',Array(1)],['extended',Object.assign([],{extra:1})]]){const actual=outcome(()=>originalProjectDeclarationRefusalRanges(row.surface,path)),old=outcome(()=>pair(row.surface,path));rows.push({label,actual,old});retain('06-path-'+label,rows.at(-1));assert.ok(actual.error);assert.deepEqual(actual,old);}
  retain('06-observer-fallbacks',{subject:complete(row),rows,reads});assert.equal(reads,0);
});

test('hash callbacks cannot turn late body parser or lowering mutations into an attributed original range',{timeout:60000},()=>{
  const rows=[];
  for(const [label,change]of [['body',row=>{row.surface.body={k:'num',value:'99',span:row.surface.body.span};}],['parsed',(_row,facts)=>{facts.parsed.entry.ret={kind:'bool'};}],['lowered',(_row,facts)=>{facts.transform.lowered.tokens[0].value='changed';}]]){
    const row=capturedProject({'src/lib.rs':body}),before=complete(row),facts=state(row),update=get(hashPrototype,'update');let changed=false,actual;
    try{define(hashPrototype,'update',{...update,value(...args){const result=apply(update.value,this,args);if(!changed){changed=true;change(row,facts);}return result;}});actual=outcome(()=>originalProjectDeclarationRefusalRanges(row.surface,[]));}
    finally{define(hashPrototype,'update',update);}
    rows.push({label,before,mutationSource:Function.prototype.toString.call(change),changed,actual});retain('07-mutation-'+label,rows.at(-1));assert.equal(changed,true);assert.equal(actual.error?.name,'TypeError');
  }
  retain('07-late-hash-mutations',{rows});
});

test('both complete original derive parents keep checked methods refusals CST and strict typed behavior',{timeout:60000},async()=>{
  const data=associatedOriginalParentInputs('derive-helper-originals.test.mjs'),dependencies=loadDeriveDependencyProof(associatedOriginalDependencyInputs(data)),fixture=JSON.parse(readFileSync(new URL('../fixtures/derive-helper-originals.json',import.meta.url),'utf8')),rows=[];
  for(const path of ['src/provider_acceptance.rs','src/response_affinity.rs']){
    const source=data.source(path),pin=fixture.entries.find(entry=>entry.path===path);assert.equal(createHash('sha256').update(source).digest('hex'),pin.sourceSha256);
    const result=translateProject({entry:path,paths:[path],readSource:()=>source,deriveDependencies:dependencies,compilationProfile:PRODUCTION_PROFILE});for(const row of result.meta.concreteSyntaxMeta)assert.equal(readRustConcreteSyntaxMeta(serializeConcreteSyntaxMeta(row.document)).source,source);for(const program of [result.meta.checkedSemanticProgram,result.meta.targetSemanticProgram]){const serialized=serializeProgram(parseProgram(JSON.stringify(program)));assert.equal(serializeProgram(parseProgram(serialized)),serialized);}const target=parseProgram(JSON.stringify(result.meta.targetSemanticProgram)),aliases=pin.methods.map((method,index)=>{assert.ok(result.meta.checkedMethods.some(entry=>entry.name===method.owner+'.'+method.name));const emitted=[...target.declarations.values()].find(entry=>entry.impl?.method===method.name);assert.ok(emitted);return `${emitted.name} as original${index}`;}),suffix=`\nexport {${aliases.join(',')}};`,exposed={...result,javascript:result.javascript+suffix,typescript:result.typescript+suffix};rows.push({path,source,pin,result,suffix});retain('08-parent-'+String(rows.length),rows.at(-1));
    await verifyTypedTargets(exposed,(_api,_result,module)=>{if(path.endsWith('provider_acceptance.rs')){for(const name of ['InvalidCandidate','CredentialRejected','RateLimited','Unverified','PersistenceUncertain']){const kind=Object.freeze({$:name});assert.strictEqual(module.original0(Object.freeze({$:'ProviderProvisionFailure',kind,message:'fixture'})),kind);}assert.throws(()=>module.original0({$:'ProviderProvisionFailure',kind:{$:'Invented'},message:'fixture'}),TypeError);}else{assert.deepEqual(module.original0('/api/services/openai/v1/responses/🧪'),{$:'Some',field0:{$:'OpenAiResponses'}});assert.deepEqual(module.original0('/api/services/codex/v1/chat/completions?stream=true'),{$:'Some',field0:{$:'CodexChat'}});assert.deepEqual(module.original1('/api/services/qwen/v1/conversations/🧪'),{$:'Some',field0:{$:'Tuple',field0:{$:'QwenConversations'},field1:{$:'QwenConversationItems'}}});assert.deepEqual(module.original0('/v1/responses'),{$:'None'});assert.throws(()=>module.original1(null),TypeError);}},{childTimeoutMs:20000});
  }
  retain('08-original-full-parents',{rows,oldOriginalWholeFileStillDecisive:true,unchangedOriginalBunCaseDeadlineMs:5000,performanceGainClaim:false});
});
