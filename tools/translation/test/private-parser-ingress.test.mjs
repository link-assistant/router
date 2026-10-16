import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync,realpathSync} from 'node:fs';
import {Hash,createHash} from 'node:crypto';
import {syncBuiltinESMExports} from 'node:module';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {types} from 'node:util';
// This SAME common issuer is initialized normally before every poison control.
// Fresh leaves below do not claim authentication of a poisoned common bootstrap.
import {originalPrivateParserIngressUnchanged as ingress} from '../original-json-intrinsics.mjs';
import {assertPrivateParserExecution,lexPrivateConcreteSource,transportPrivateConcreteSource,transportPrivateConcreteMeta} from '../private-parser-execution.mjs';
import {createConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {prepareReverseConcreteSource} from '../js-to-rust/concrete-source.mjs';

const root=globalThis,StockSymbol=Symbol,descriptor=Object.getOwnPropertyDescriptor;
const define=Object.defineProperty,own=Object.hasOwn,keys=Reflect.ownKeys,apply=Reflect.apply;
const parent=Object.getPrototypeOf,remove=Reflect.deleteProperty,bind=Function.prototype.bind,create=Object.create,isProxy=types.isProxy;
const stringify=JSON.stringify;
const originalGlobal=descriptor(root,'globalThis'),originalSymbol=descriptor(root,'Symbol');
const rust='fn answer() -> u8 { 7 }',javascript='export const value = 7;';
const originalHashUpdate=descriptor(Hash.prototype,'update');
const directory=process.env.ROUTER_PRIVATE_PARSER_INGRESS_VECTOR_DIR;
const hash=value=>createHash('sha256').update(value).digest('hex');
function retain(name,value){if(directory){mkdirSync(directory,{recursive:true});writeFileSync(join(directory,name+'.json'),stringify(value)+'\n',{flag:'wx'});}}
function errorFacts(error){
  if(error===null||typeof error!=='object')return {type:typeof error};
  const result={};
  for(const key of ['name','message','code']){const field=descriptor(error,key);if(field&&own(field,'value')&&['string','number','boolean'].includes(typeof field.value))result[key]=field.value;}
  return result;
}
function descriptorFacts(field,stock){
  if(!field)return null;
  return {data:own(field,'value'),writable:field.writable,enumerable:field.enumerable,configurable:field.configurable,
    sameValue:own(field,'value')?field.value===stock.value:undefined,valueType:own(field,'value')?typeof field.value:undefined,
    hasGetter:own(field,'get')&&field.get!==undefined,hasSetter:own(field,'set')&&field.set!==undefined};
}
function restoreGlobals(){define(root,'globalThis',originalGlobal);define(root,'Symbol',originalSymbol);}
function attempt(read){let value,error;try{value=read();}catch(caught){error=caught;}return {value,error};}
function observed(result){return result.error===undefined?{value:result.value}:{error:errorFacts(result.error)};}
function assertRestored(){assert.equal(ingress(),true);assert.deepEqual(descriptor(root,'globalThis'),originalGlobal);assert.deepEqual(descriptor(root,'Symbol'),originalSymbol);}
function positive(){return {assertion:assertPrivateParserExecution(),rust:lexPrivateConcreteSource(rust,'Rust')};}

// A physically distinct complete executor, with only exact import/module-URL
// relocation. All active issuers remain the same modules; profile resolution
// remains bound to the genuine source URL. No common issuer copy is evaluated.
function physicalLeaf(label,kind='executor'){
  const file=kind==='core'?'../concrete-syntax-meta.mjs':kind==='reverse'?'../js-to-rust/concrete-source.mjs':'../private-parser-execution.mjs';
  const folder=realpathSync(mkdtempSync(join(tmpdir(),'router-parser-ingress-'))),origin=new URL(file,import.meta.url);
  const source=readFileSync(origin,'utf8'),edits=[];
  const imports=[...source.matchAll(/^import\b[\s\S]*?\bfrom\s+(['"])([^'"\n]+)\1;/gmu)];
  assert.equal(imports.length,[...source.matchAll(/^import\b/gmu)].length);
  for(const match of imports){
    if(!match[2].startsWith('.'))continue;
    const expected=match[1]+match[2]+match[1],start=match.index+match[0].lastIndexOf(expected);
    edits.push({start,end:start+expected.length,expected,replacement:stringify(new URL(match[2],origin).href)});
  }
  for(const match of source.matchAll(/\bimport\.meta\.url\b/gu))edits.push({start:match.index,end:match.index+match[0].length,expected:match[0],replacement:stringify(origin.href)});
  edits.sort((left,right)=>left.start-right.start);
  const pieces=[],relocations=[];let at=0,length=0;
  for(const edit of edits){assert.ok(edit.start>=at);assert.equal(source.slice(edit.start,edit.end),edit.expected);const part=source.slice(at,edit.start);pieces.push(part,edit.replacement);length+=part.length;relocations.push({...edit,outputStart:length,outputEnd:length+edit.replacement.length});length+=edit.replacement.length;at=edit.end;}
  pieces.push(source.slice(at));const relocated=pieces.join('');let reverse=relocated;
  for(let index=relocations.length-1;index>=0;index--){const edit=relocations[index];assert.equal(reverse.slice(edit.outputStart,edit.outputEnd),edit.replacement);reverse=reverse.slice(0,edit.outputStart)+edit.expected+reverse.slice(edit.outputEnd);}
  assert.equal(reverse,source);const target=join(folder,'fresh-executor.mjs');writeFileSync(target,relocated,{flag:'wx'});assert.equal(readFileSync(target,'utf8'),relocated);
  const evidence={label,kind,originalURL:origin.href,physicalURL:pathToFileURL(target).href,source,sourceSha256:hash(source),relocated,relocatedSha256:hash(relocated),relocations,fullReverseEquality:true,commonIssuerCopied:false};
  retain(label+'-physical-before',evidence);
  return {folder,url:evidence.physicalURL,evidence};
}
async function coldControl(label,key,replacement,kind='executor'){
  const leaf=physicalLeaf(label,kind);let calls=0,module,importError,during,initialDescriptor;
  const get=()=>{calls++;return key==='globalThis'?root:StockSymbol;};
  try{
    define(root,key,replacement??{configurable:true,enumerable:false,get});
    initialDescriptor=descriptorFacts(descriptor(root,key),key==='globalThis'?originalGlobal:originalSymbol);
    during=attempt(()=>ingress());
    try{module=await import(leaf.url);}catch(error){importError=error;}
  }finally{restoreGlobals();}
  let sticky;
  try{if(module)sticky=attempt(()=>kind==='core'?module.createConcreteSyntaxMeta(javascript,{language:'JavaScript'}):kind==='reverse'?module.prepareReverseConcreteSource(javascript):module.assertPrivateParserExecution());}
  finally{restoreGlobals();rmSync(leaf.folder,{recursive:true,force:true});}
  const observation={...leaf.evidence,key,initialDescriptor,during:observed(during),calls,importError:importError&&errorFacts(importError),distinctAssertion:module?(kind==='core'?module.createConcreteSyntaxMeta!==createConcreteSyntaxMeta:kind==='reverse'?module.prepareReverseConcreteSource!==prepareReverseConcreteSource:module.assertPrivateParserExecution!==assertPrivateParserExecution):null,sticky:sticky&&observed(sticky),restored:ingress(),trustedCommonWasAlreadyInitialized:true};
  retain(label+'-complete',observation);
  assertRestored();assert.equal(importError,undefined);assert.equal(during.value,false);assert.equal(calls,0);assert.equal(observation.distinctAssertion,true);assert.ok(sticky.error);assert.equal(errorFacts(sticky.error).name,'TypeError');return observation;
}

// Every test has its own explicit finite deadline; no original case or limit
// changes. Poison windows contain only captured operations and direct calls.
test('trusted common ingress and the fixed private executor expose complete data under the genuine descriptors',{timeout:60000},()=>{
  assertRestored();const result=positive(),source=transportPrivateConcreteSource(javascript,'JavaScript'),serialized=transportPrivateConcreteMeta(source.meta),publicDocument=createConcreteSyntaxMeta(javascript,{language:'JavaScript'}),publicReverse=prepareReverseConcreteSource(javascript);
  retain('01-complete-positive',{versions:process.versions,global:descriptorFacts(originalGlobal,originalGlobal),symbol:descriptorFacts(originalSymbol,originalSymbol),iterator:descriptorFacts(descriptor(StockSymbol,'iterator'),descriptor(StockSymbol,'iterator')),species:descriptorFacts(descriptor(StockSymbol,'species'),descriptor(StockSymbol,'species')),rust,javascript,result,source,serialized,publicDocument,publicReverse,trustedCommonBootstrap:true});
  assert.equal(result.assertion,undefined);assert.deepEqual(result.rust.map(row=>[row.type,row.text,row.start,row.end]),[['ident','fn',0,2],['ident','answer',3,9],['punct','(',9,10],['punct',')',10,11],['punct','->',12,14],['ident','u8',15,17],['punct','{',18,19],['number','7',20,21],['punct','}',22,23]]);
  assert.equal(publicDocument.source,javascript);assert.equal(publicReverse.source,javascript);assert.equal(source.source,javascript);assert.deepEqual(serialized,source);assert.deepEqual(source.document.authority,{type:false,owner:false,executable:false});assert.deepEqual(source.trace,[{phase:'language',rules:[]},{phase:'repository',rules:[]}]);
});

test('a post-bootstrap cold globalThis accessor is refused before lookup and keeps the physical leaf ineligible after restore',{timeout:60000},async()=>{
  assertRestored();const baseline=positive(),rows=[];for(const kind of ['executor','core','reverse'])rows.push(await coldControl('02-global-accessor-'+kind,'globalThis',undefined,kind));const restored=positive();retain('02-restored',{rows,baseline,restored,cachedExecutorBeforeFreshPublicImports:true});assert.deepEqual(restored,baseline);
});

test('a post-bootstrap cold Symbol accessor is refused before species or iterator lookup and restoration cannot bless that leaf',{timeout:60000},async()=>{
  assertRestored();const baseline=positive(),rows=[];for(const kind of ['executor','core','reverse'])rows.push(await coldControl('03-symbol-accessor-'+kind,'Symbol',undefined,kind));const restored=positive();retain('03-restored',{rows,baseline,restored,cachedExecutorBeforeFreshPublicImports:true});assert.deepEqual(restored,baseline);
});

test('foreign exact-shape Symbol objects same-descriptor callables and proxies gain no ingress or cold qualification',{timeout:60000},async()=>{
  assertRestored();const foreign=create(parent(StockSymbol)),stockKeys=keys(StockSymbol);
  for(const key of stockKeys)define(foreign,key,descriptor(StockSymbol,key));
  let callableCalls=0;
  const target=(...args)=>{callableCalls++;return apply(StockSymbol,undefined,args);},callable=apply(bind,target,[undefined]),initialCallableKeys=keys(callable),deletions=[];
  for(const key of initialCallableKeys){const field=descriptor(callable,key);deletions.push({key,configurable:field.configurable,removed:field.configurable?remove(callable,key):false});}
  for(const key of stockKeys)define(callable,key,descriptor(StockSymbol,key));
  const callableKeys=keys(callable),callableOrderEqualsStock=callableKeys.length===stockKeys.length&&callableKeys.every((key,index)=>key===stockKeys[index]);
  retain('04-foreign-shape-before-assert',{versions:process.versions,stockKeys,foreignKeys:keys(foreign),foreignType:typeof foreign,callableType:typeof callable,initialCallableKeys,deletions,callableKeys,callableOrderEqualsStock,
    proofDomains:{object:'exact own-key order descriptors and parent; noncallable',callable:'all own keys descriptors and parent; actual runtime function ordering retained'},
    samePrototype:parent(foreign)===parent(StockSymbol),descriptors:stockKeys.map(key=>({key,object:descriptorFacts(descriptor(foreign,key),descriptor(StockSymbol,key)),callable:descriptorFacts(descriptor(callable,key),descriptor(StockSymbol,key))}))});
  assert.deepEqual(keys(foreign),keys(StockSymbol));assert.equal(parent(foreign),parent(StockSymbol));
  for(const key of keys(StockSymbol))assert.deepEqual(descriptor(foreign,key),descriptor(StockSymbol,key));
  assert.equal(typeof foreign,'object');assert.equal(isProxy(foreign),false);assert.equal(typeof callable,'function');assert.equal(isProxy(callable),false);assert.notEqual(callable,StockSymbol);
  for(const row of deletions){assert.equal(row.configurable,true);assert.equal(row.removed,true);}
  assert.equal(callableKeys.length,stockKeys.length);assert.equal(parent(callable),parent(StockSymbol));
  for(const key of stockKeys){assert.equal(own(callable,key),true);assert.deepEqual(descriptor(callable,key),descriptor(StockSymbol,key));}
  // These are observed ordering facts, not a guard/domain exception. Every
  // runtime still executes BOTH foreign-value live and physical-cold controls.
  if(process.versions.bun){assert.deepEqual(stockKeys.slice(0,4),['for','keyFor','length','name']);assert.deepEqual(callableKeys,['length','name',...stockKeys.filter(key=>key!=='length'&&key!=='name')]);assert.equal(callableOrderEqualsStock,false);}
  else assert.deepEqual(callableKeys,stockKeys);
  const shape={stockKeys,objectKeys:keys(foreign),callableKeys,callableOrderEqualsStock,sameOwnDescriptors:true,samePrototype:true,distinctIdentities:foreign!==StockSymbol&&callable!==StockSymbol};
  const observations=[];
  for(const row of [{label:'04-foreign-exact-object',value:foreign},{label:'04-foreign-callable',value:callable}]){
    let during,live,cold;
    try{define(root,'Symbol',{...originalSymbol,value:row.value});during=attempt(()=>ingress());live=attempt(()=>assertPrivateParserExecution());}
    finally{restoreGlobals();}
    retain(row.label+'-live-before-assert',{during:observed(during),live:observed(live),callableCalls});
    try{cold=await coldControl(row.label,'Symbol',{...originalSymbol,value:row.value});}
    finally{retain(row.label+'-callback-tape',{callableCalls});}
    observations.push({label:row.label,during:observed(during),live:observed(live),cold,callableCalls});
    assert.equal(during.value,false);assert.equal(errorFacts(live.error).name,'TypeError');assert.equal(callableCalls,0);
  }
  for(const key of ['globalThis','Symbol']){
    let traps=0;const proxy=new Proxy(key==='globalThis'?root:StockSymbol,{get(){traps++;return undefined;},ownKeys(){traps++;return [];},getPrototypeOf(){traps++;return null;},getOwnPropertyDescriptor(){traps++;return undefined;}});
    const row=await coldControl('04-proxy-'+key,key,{...(key==='globalThis'?originalGlobal:originalSymbol),value:proxy});
    retain('04-proxy-traps-'+key,{traps,row});assert.equal(traps,0);observations.push({key,traps,row});
  }
  const revoked=Proxy.revocable(StockSymbol,{});revoked.revoke();observations.push(await coldControl('04-revoked-symbol','Symbol',{...originalSymbol,value:revoked.proxy}));
  retain('04-complete',{shape,observations});assertRestored();positive();
});

test('own descriptor flag changes deletion and data replacement refuse with exact restored positives',{timeout:60000},()=>{
  assertRestored();const observations=[];
  for(const key of ['globalThis','Symbol'])for(const kind of ['enumerability','writability','deleted','data']){
    const before=key==='globalThis'?originalGlobal:originalSymbol;let during,changed;
    try{
      if(kind==='deleted')remove(root,key);
      else define(root,key,kind==='enumerability'?{...before,enumerable:!before.enumerable}:kind==='writability'?{...before,writable:!before.writable}:{...before,value:undefined});
      changed=descriptorFacts(descriptor(root,key),before);during=attempt(()=>ingress());
    }finally{restoreGlobals();}
    const restored=ingress(),row={key,kind,before:descriptorFacts(before,before),changed,during:observed(during),restored};observations.push(row);retain('05-'+key+'-'+kind,row);assert.equal(during.error,undefined);assert.equal(during.value,false);assert.equal(restored,true);assertRestored();
  }
  retain('05-complete',{observations,configurabilityNeverIrreversiblyChanged:true});positive();
});

test('live global accessors stop every fixed executor entry before callback and full source output recovers after restore',{timeout:60000},()=>{
  assertRestored();const baseline=positive(),meta=transportPrivateConcreteSource(javascript,'JavaScript').meta,observations=[];
  const entries=[['assert',()=>assertPrivateParserExecution()],['lex',()=>lexPrivateConcreteSource(rust,'Rust')],['source',()=>transportPrivateConcreteSource(javascript,'JavaScript')],['serialized',()=>transportPrivateConcreteMeta(meta)],['public-core',()=>createConcreteSyntaxMeta(javascript,{language:'JavaScript'})],['public-reverse',()=>prepareReverseConcreteSource(javascript)]];
  for(const key of ['globalThis','Symbol']){
    let calls=0,during,rows=[];
    try{define(root,key,{configurable:true,enumerable:false,get(){calls++;return key==='globalThis'?root:StockSymbol;}});during=attempt(()=>ingress());for(const [name,read]of entries)rows.push({name,result:attempt(read)});}
    finally{restoreGlobals();}
    const restored=positive(),row={key,calls,during:observed(during),entries:rows.map(({name,result})=>({name,...observed(result)})),restored};observations.push(row);retain('06-'+key,row);assert.equal(calls,0);assert.equal(during.value,false);for(const item of rows)assert.equal(errorFacts(item.result.error).name,'TypeError');assert.deepEqual(restored,baseline);assertRestored();
  }
  retain('06-complete',{observations});
});

test('a real source hash callback installing global accessors is stopped before the next operation without executing the getters',{timeout:60000},()=>{
  assertRestored();const baseline=positive(),observations=[];
  for(const key of ['globalThis','Symbol']){
    let callbacks=0,getters=0,armed=true,result;
    try{
      define(Hash.prototype,'update',{...originalHashUpdate,value:function ingressChangingHash(...args){const value=apply(originalHashUpdate.value,this,args);callbacks++;if(armed){armed=false;define(root,key,{configurable:true,enumerable:false,get(){getters++;return key==='globalThis'?root:StockSymbol;}});}return value;}});
      result=attempt(()=>lexPrivateConcreteSource(rust,'Rust'));
    }finally{restoreGlobals();define(Hash.prototype,'update',originalHashUpdate);}
    const restored=positive(),row={key,callbacks,getters,result:observed(result),restored};observations.push(row);retain('07-'+key,row);assert.ok(callbacks>0);assert.equal(getters,0);assert.equal(errorFacts(result.error).name,'TypeError');assert.deepEqual(restored,baseline);assertRestored();
  }
  retain('07-complete',{observations});
});

test('a real complete-source read callback installing global accessors is stopped and builtin bindings are restored before return',{timeout:60000},()=>{
  assertRestored();const baseline=positive(),originalRead=descriptor(fs,'readSync'),observations=[];
  for(const key of ['globalThis','Symbol']){
    let callbacks=0,getters=0,armed=true,result;const tape=[];
    try{
      define(fs,'readSync',{...originalRead,value:function ingressChangingRead(...args){const value=apply(originalRead.value,this,args);callbacks++;tape.push({thisUndefined:this===undefined,argCount:args.length,offset:args[2],length:args[3],position:args[4],count:value,source:Buffer.from(args[1]).toString('utf8')});if(armed){armed=false;define(root,key,{configurable:true,enumerable:false,get(){getters++;return key==='globalThis'?root:StockSymbol;}});}return value;}});syncBuiltinESMExports();
      result=attempt(()=>lexPrivateConcreteSource(rust,'Rust'));
    }finally{restoreGlobals();define(fs,'readSync',originalRead);syncBuiltinESMExports();}
    const restored=positive(),row={key,callbacks,getters,result:observed(result),restored,tape,builtinReadRestored:descriptor(fs,'readSync').value===originalRead.value};observations.push(row);retain('08-'+key,row);assert.ok(callbacks>0,'the actual executor source read must cross the installed callback');assert.equal(getters,0);assert.equal(errorFacts(result.error).name,'TypeError');assert.equal(row.builtinReadRestored,true);assert.deepEqual(restored,baseline);for(const read of tape){assert.equal(read.thisUndefined,true);assert.equal(read.argCount,5);}assertRestored();
  }
  const invalid=[];
  for(const mode of ['getter','proxy','missing','nonfunction']){
    let calls=0,traps=0,result,changed;
    try{
      if(mode==='getter')define(fs,'readSync',{get(){calls++;return originalRead.value;},configurable:true});
      else if(mode==='proxy')define(fs,'readSync',{...originalRead,value:new Proxy(originalRead.value,{apply(){calls++;throw Error('read proxy called');},get(){traps++;return undefined;},ownKeys(){traps++;return [];},getPrototypeOf(){traps++;return null;},getOwnPropertyDescriptor(){traps++;return undefined;}})});
      else if(mode==='missing')remove(fs,'readSync');
      else define(fs,'readSync',{...originalRead,value:{toString(){calls++;return 'not a read function';}}});
      changed=descriptor(fs,'readSync');result=attempt(()=>lexPrivateConcreteSource(rust,'Rust'));
      // Do not ask syncBuiltinESMExports to read an accessor/proxy field.
    }finally{define(fs,'readSync',originalRead);syncBuiltinESMExports();}
    const restored=positive(),row={mode,calls,traps,changed:descriptorFacts(changed,originalRead),result:observed(result),restored};invalid.push(row);retain('08-invalid-'+mode,row);
    assert.equal(errorFacts(result.error).name,'TypeError');assert.equal(calls,0);assert.equal(traps,0);assert.deepEqual(restored,baseline);assertRestored();
  }
  retain('08-complete',{observations,invalid});
});
