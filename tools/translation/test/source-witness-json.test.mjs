import {repositorySourceURL} from "./fixtures/repository-paths.mjs";
// Storage equivalence for genuine private source witnesses, never proof reuse.
import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync,realpathSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
const json=JSON.stringify,text=Function.prototype.toString,apply=Reflect.apply,hash=value=>createHash('sha256').update(value).digest('hex');
const root=new URL('../../../',import.meta.url),origin=new URL('../derive-ancestor-attribute-scope.mjs',import.meta.url),base=new URL('../',import.meta.url),fixture=new URL('./fixtures/source-witness-json/',import.meta.url),manifest=JSON.parse(readFileSync(new URL('manifest.json',fixture),'utf8'));
const directory=realpathSync(mkdtempSync(join(tmpdir(),'router-source-witness-json-')));after(()=>rmSync(directory,{recursive:true,force:true}));
const originals=new Map(),relocations=[];for(const row of manifest.sources){const value=readFileSync(new URL(row.storedPath,fixture));assert.equal(value.length,row.bytes);assert.equal(hash(value),row.sha256);originals.set(row.path,value.toString('utf8'));}
function copy(source,label){const path=join(directory,label+'.mjs'),copied=source.replace(/\bfrom (['"])(\.\.?\/[^'"]+)\1/g,(_match,quote,path)=>{const target=new URL(path,origin).href;relocations.push({label,path,target});return 'from '+quote+target+quote;}).replace(/\bimport\.meta\.url\b/g,()=>{relocations.push({label,kind:'original-module-url',target:origin.href});return json(origin.href);});writeFileSync(path,copied,{flag:'wx'});return {source,copied,path,url:pathToFileURL(path).href};}
const leaves={old:copy(originals.get('tools/translation/derive-ancestor-attribute-scope.mjs'),'complete-before'),current:copy(readFileSync(origin,'utf8'),'complete-current')};
const source={manifest:readFileSync(repositorySourceURL('Cargo.toml',root),'utf8'),lock:readFileSync(repositorySourceURL('Cargo.lock',root),'utf8'),originalRoot:readFileSync(repositorySourceURL('src/lib.rs',root),'utf8')};
const requests=[{namespace:'attribute',name:'allow'},{namespace:'attribute',name:'serde'},{namespace:'attribute',name:'default'},{namespace:'type',name:'core'},{namespace:'type',name:'std'},{namespace:'type',name:'Default'},{namespace:'type',name:'clap'}];
const imports=Object.fromEntries(['original-json-intrinsics.mjs','private-frozen-json.mjs','derive-dependencies.mjs','extensions/external-trait-sources.mjs','project.mjs','module-bindings.mjs','source-module-views.mjs','cfg-profile.mjs','derive-ancestor-attribute-scope.mjs'].map(path=>[path,new URL(path,base).href]));
function retain(name,value){const output=process.env.ROUTER_SOURCE_WITNESS_JSON_VECTOR_DIR;if(output){mkdirSync(output,{recursive:true});writeFileSync(join(output,name+'.json.gz'),gzipSync(json(value)+String.fromCharCode(10)),{flag:'wx'});}}
async function driver(mode,leaf,source,requests){
 const json=JSON.stringify,apply=Reflect.apply,descriptor=Object.getOwnPropertyDescriptor,ownKeys=Reflect.ownKeys,proto=Object.getPrototypeOf,functionText=Function.prototype.toString,objectPrototype=Object.prototype,arrayPrototype=Array.prototype;
 const outcome=read=>{try{return {value:read()};}catch(error){return {error:{name:error.name,message:error.message}};}};
 function graph(roots){
  const ids=new Map(),queue=[],nodes=[];
  function value(item){if(ArrayBuffer.isView(item))return {type:Buffer.isBuffer(item)?'Buffer':Object.prototype.toString.call(item),byteOffset:item.byteOffset,byteLength:item.byteLength,bytes:Buffer.from(item.buffer,item.byteOffset,item.byteLength).toString('base64')};if(item===null||typeof item!=='object'){if(typeof item==='function')return {type:'function',name:item.name,source:apply(functionText,item,[])};if(typeof item==='symbol')return {type:'symbol',description:item.description};if(typeof item==='bigint')return {type:'bigint',value:item.toString()};if(typeof item==='number'&&!Number.isFinite(item))return {type:'number',value:String(item)};return {type:typeof item,value:item};}if(!ids.has(item)){ids.set(item,queue.length);queue.push(item);}return {node:ids.get(item)};}
  const references=roots.map(value);
  for(let at=0;at<queue.length;at++){
   const item=queue[at],parent=proto(item),kind=parent===null?'null':parent===objectPrototype?'Object.prototype':parent===arrayPrototype?'Array.prototype':null;if(kind===null)throw Error('unexpected public source witness prototype');
   const fields=ownKeys(item).map(key=>{const field=descriptor(item,key);return {key:typeof key==='symbol'?{symbol:key.description}:key,enumerable:field.enumerable,configurable:field.configurable,...(Object.hasOwn(field,'value')?{writable:field.writable,value:value(field.value)}:{get:value(field.get),set:value(field.set)})};});nodes.push({index:at,prototype:kind,frozen:Object.isFrozen(item),fields});
  }
  return {roots:references,nodes};
 }
 const tape=[],probes=[],phases=[],undos=[];let phase='bootstrap';
 function event(operation,args,returned){tape.push({phase,operation,args:graph(args),returned:typeof returned==='object'?{sameFirst:returned===args[0]}:{value:returned}});}
 function wrap(owner,key,operation){const before=descriptor(owner,key);Object.defineProperty(owner,key,{...before,value(...args){const returned=apply(before.value,this,args);event(operation,args,returned);return returned;}});undos.push(()=>Object.defineProperty(owner,key,before));}
 function hook(){
  const probeBegin=tape.length;
  if(mode==='cold-json'||mode==='late-json'){wrap(JSON,'stringify','JSON.stringify');JSON.stringify({probe:'λ😀'});probes.push(...tape.splice(probeBegin));}
  if(mode==='late-descriptor'){wrap(Object,'getOwnPropertyDescriptor','Object.getOwnPropertyDescriptor');Object.getOwnPropertyDescriptor({probe:'λ😀'},'probe');probes.push(...tape.splice(probeBegin));}
  if(mode==='inherited-toJSON'){
   const before=descriptor(objectPrototype,'toJSON');Object.defineProperty(objectPrototype,'toJSON',{get(){tape.push({phase,operation:'inherited toJSON getter',receiver:graph([this])});return undefined;},configurable:true});undos.push(()=>{if(before)Object.defineProperty(objectPrototype,'toJSON',before);else delete objectPrototype.toJSON;});JSON.stringify({probe:'λ😀'});probes.push(...tape.splice(probeBegin));
  }
 }
 const {loadDeriveDependencyProof,deriveExternalModules}=modules.dependencies,{resolveModuleGraph}=modules.project,{resolveModuleBindings}=modules.bindings,{originalSourceModuleItems}=modules.views,{PRODUCTION_PROFILE}=modules.profile;
 const dependencies=loadDeriveDependencyProof({manifest:source.manifest,lock:source.lock}),alias=source.originalRoot.slice(442,485),model='#[derive(Clone,Default,serde::Deserialize)] pub struct Payload { #[serde(default)] value:u32 }',sources=new Map([['src/lib.rs',alias+'\n#[cfg(unix)] mod sibling;\nmod model;'],['src/model.rs',model],['src/sibling.rs','#[macro_export] macro_rules! allow {()=>{}} #[derive(Clone,Copy,Debug)] pub struct Hidden;']]);
 const resolved=resolveModuleGraph({entry:'src/lib.rs',paths:[...sources.keys()],readSource:path=>sources.get(path),compilationProfile:PRODUCTION_PROFILE}),binding=resolveModuleBindings({modules:resolved.modules,externalModules:deriveExternalModules(dependencies),compilationProfile:PRODUCTION_PROFILE}),parent=resolved.modules[0],caller=resolved.modules.find(row=>row.path.join('.')==='model'),item=originalSourceModuleItems(parent).find(row=>row.name==='sibling');
 if(mode==='cold-json')hook();const beforeFacts=modules.cache.privateFrozenJsonCacheFacts();let implementation;
 let context,first,second,full,reissued,copied,stale,wrongRequest,foreignContext,restored,afterChurn,churnInputs=null,churnFacts=null,changedJson=null;
 const Hash=modules.crypto.Hash,update=descriptor(Hash.prototype,'update'),byteLength=descriptor(Buffer,'byteLength');
 Object.defineProperty(Hash.prototype,'update',{...update,value(value,...args){const returned=apply(update.value,this,[value,...args]);event('Hash.update',[value,...args],returned);if(mode==='hash-json-mutation'&&changedJson===null){const prior=descriptor(JSON,'stringify');changedJson=prior;Object.defineProperty(JSON,'stringify',{...prior,value(...args){const output=apply(prior.value,this,args);event('mutated JSON.stringify',args,output);return output;}});undos.push(()=>Object.defineProperty(JSON,'stringify',prior));}return returned;}});
 Object.defineProperty(Buffer,'byteLength',{...byteLength,value(...args){const returned=apply(byteLength.value,this,args);event('Buffer.byteLength',args,returned);return returned;}});
 const step=(name,read)=>{phase=name;const start=tape.length,value=read();phases.push({name,start,end:tape.length});return value;};let result;
 try{
  phase='subject-import';const importBegin=tape.length;implementation=await import(leaf.url);phases.push({name:'subject-import',start:importBegin,end:tape.length});
  context=step('context',()=>implementation.createOriginalAncestorAttributeScopeContext({modules:resolved.modules,binding,dependencies}));const options={context,module:parent,item,caller,requests};
  first=step('first',()=>implementation.proveOriginalConditionalSiblingScope(options));
  if(mode!=='cold-json'&&mode!=='native'&&mode!=='churn'&&mode!=='hash-json-mutation')hook();
  second=step('second',()=>implementation.proveOriginalConditionalSiblingScope(options));
  full=step('full-evidence',()=>implementation.originalConditionalSiblingScopeEvidence(first,context,parent,item,caller,requests));
  reissued=step('reissue',()=>implementation.assertOriginalConditionalSiblingScope(second,context,parent,item,caller,requests));
  if(mode==='churn'){
   const cache=modules.cache.createPrivateFrozenJsonCache();churnInputs=[];for(let at=0;at<20;at++){const value=Object.freeze({index:at,payload:'Ω😀'.repeat(65536)+at});churnInputs.push(value);cache(value);}churnFacts=modules.cache.privateFrozenJsonCacheFacts();afterChurn=step('after-churn',()=>implementation.proveOriginalConditionalSiblingScope(options));
  }
  copied=step('copied-refusal',()=>outcome(()=>implementation.assertOriginalConditionalSiblingScope(structuredClone(first),context,parent,item,caller,requests)));
  const prior=parent.source;parent.source+=' ';try{stale=step('changed-source-refusal',()=>outcome(()=>implementation.proveOriginalConditionalSiblingScope(options)));}finally{parent.source=prior;}
  wrongRequest=step('changed-request-refusal',()=>outcome(()=>implementation.assertOriginalConditionalSiblingScope(first,context,parent,item,caller,[{namespace:'type',name:'sibling'}])));
  foreignContext=step('copied-context-refusal',()=>outcome(()=>implementation.proveOriginalConditionalSiblingScope({...options,context:structuredClone(context)})));
  restored=step('restored-source',()=>implementation.proveOriginalConditionalSiblingScope(options));
  result={alias,sources:[...sources],resolved,binding,context,first,second,full,reissued,copied,stale,wrongRequest,foreignContext,restored,afterChurn,churnInputs,phases,tape,probes,changedJson:changedJson!==null};
 }finally{Object.defineProperty(Hash.prototype,'update',update);Object.defineProperty(Buffer,'byteLength',byteLength);for(let at=undos.length-1;at>=0;at--)undos[at]();}
 result.graph=graph([context,first,second,full,reissued,copied,stale,wrongRequest,foreignContext,restored,afterChurn]);result.beforeFacts=beforeFacts;result.afterFacts=modules.cache.privateFrozenJsonCacheFacts();result.churnFacts=churnFacts;return result;
}
function child(mode,which){
 const urls={common:imports['original-json-intrinsics.mjs'],cache:imports['private-frozen-json.mjs'],dependencies:imports['derive-dependencies.mjs'],project:imports['project.mjs'],bindings:imports['module-bindings.mjs'],views:imports['source-module-views.mjs'],profile:imports['cfg-profile.mjs'],active:imports['derive-ancestor-attribute-scope.mjs']},leaf=leaves[which];
 const code=["import * as crypto from 'node:crypto';import {gzipSync} from 'node:zlib';",'await import('+json(urls.active)+');await import('+json(urls.common)+');',
 'const modules={crypto,cache:await import('+json(urls.cache)+'),dependencies:await import('+json(urls.dependencies)+'),project:await import('+json(urls.project)+'),bindings:await import('+json(urls.bindings)+'),views:await import('+json(urls.views)+'),profile:await import('+json(urls.profile)+')};',
 'const run='+apply(text,driver,[])+';const result=await run('+json(mode)+','+json(leaf)+','+json(source)+','+json(requests)+');process.stdout.write(gzipSync(JSON.stringify(result)));'].join(String.fromCharCode(10));
 let wire;try{wire=execFileSync('node',['--input-type=module','-'],{input:code,timeout:10000,maxBuffer:8*1024*1024});}catch(error){retain(mode+'-'+which+'-failed-partial',{mode,which,code,leaf,urls,error:{name:error.name,message:error.message,signal:error.signal,status:error.status},stdout:Buffer.from(error.stdout??[]).toString('base64'),stderr:Buffer.from(error.stderr??[]).toString('base64'),partial:true});throw error;}
 const record={mode,which,code,leaf,urls,wire:{encoding:'gzip-json-base64',bytes:wire.length,sha256:hash(wire),base64:wire.toString('base64')}};retain(mode+'-'+which+'-complete-wire',record);const raw=gunzipSync(wire,{maxOutputLength:64*1024*1024}),result=JSON.parse(raw.toString('utf8'));retain(mode+'-'+which+'-complete-result',{record,result});return {record,result};
}
function paired(mode){
 retain(mode+'-complete-originals',{manifest,originals:[...originals],leaves,source,imports,relocations,requests});const expected=child(mode,'old'),actual=child(mode,'current');retain(mode+'-complete-both',{expected,actual});
 const data=result=>{const {beforeFacts,afterFacts,churnFacts,...rest}=result;return rest;};assert.deepEqual(data(actual.result),data(expected.result));
 for(const result of [expected.result,actual.result]){assert.equal(result.alias,'extern crate self as link_assistant_router;');assert.equal(result.first.namespaceAuthority,false);assert.equal(result.first.conditionalAvailabilitySelected,false);assert.equal(result.first.unresolvedGlobalBangEffectsRetained,true);assert.ok(result.tape.some(row=>row.operation==='Hash.update'));assert.ok(result.tape.some(row=>row.operation==='Buffer.byteLength'));assert.deepEqual(result.reissued,result.second);for(const key of ['copied','stale','wrongRequest','foreignContext'])assert.equal(result[key].error.name,'TypeError');assert.deepEqual(result.restored,result.first);assert.equal(result.afterFacts.limits.entries,16);assert.equal(result.afterFacts.limits.bytes,8388608);assert.equal(result.afterFacts.limits.entryBytes,4194304);assert.equal(result.afterFacts.limits.cells,200000);assert.equal(result.afterFacts.limits.depth,160);assert.ok(result.afterFacts.entries<=16);assert.ok(result.afterFacts.retainedBytes<=8388608);}
 return {expected,actual};
}
test('genuine complete source evidence retains exact fresh proof bytes descriptors sharing and all hash arguments under native storage reuse',{timeout:60000},()=>{
 const {actual}=paired('native');assert.ok(actual.result.afterFacts.hits>actual.result.beforeFacts.hits);
});
test('cold and late serialization and descriptor observers retain complete old callback tapes and original private refusals',{timeout:60000},()=>{
 for(const mode of ['cold-json','late-json','late-descriptor']){const {actual}=paired(mode);assert.ok(actual.result.probes.length>0);}
});
test('inherited serialization and hash-time intrinsic mutation keep fallback while bounded global churn preserves every reissued proof',{timeout:60000},()=>{
 for(const mode of ['inherited-toJSON','hash-json-mutation','churn']){const {actual}=paired(mode);if(mode==='inherited-toJSON')assert.ok(actual.result.probes.length>0);if(mode==='hash-json-mutation')assert.equal(actual.result.changedJson,true);if(mode==='churn'){assert.deepEqual(actual.result.afterChurn,actual.result.first);assert.ok(actual.result.churnFacts.evictions>actual.result.beforeFacts.evictions);assert.equal(actual.result.churnInputs.length,20);}}
});
