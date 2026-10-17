import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {gunzipSync,gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {pathToFileURL} from 'node:url';
import {sourceItems} from '../rust-structure.mjs';
import {resolveModuleBindings} from '../module-bindings.mjs';
import * as current from '../source-scopes.mjs';
import {closedFrozenNamespaceScopes,closedNamespaceVisibilityMask} from '../immutable-source-namespace-paths.mjs';
import {HostRustParser} from '../extensions/host-contracts.mjs';
import {tokenizeRust} from '../extensions/lexical.mjs';
import {standaloneMatchesMacroContext,configureMatchesMacroParser,matchesParserFacts} from '../matches-macro-context.mjs';
import {translateProject} from '../project.mjs';
import {parseProgram} from '../semantic-meta.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
const origin=new URL('../source-scopes.mjs',import.meta.url),fixture=new URL('./fixtures/immutable-source-namespace-paths/',import.meta.url);
const manifest=JSON.parse(readFileSync(new URL('manifest.json',fixture),'utf8'));
const directory=mkdtempSync(join(tmpdir(),'router-immutable-paths-'));
after(()=>rmSync(directory,{recursive:true,force:true}));
let before;
for(const row of manifest.sources){
 const stored=readFileSync(new URL(row.storedPath,fixture));assert.equal(stored.length,row.storedBytes);assert.equal(hash(stored),row.storedSha256);
 const bytes=row.encoding==='gzip'?gunzipSync(stored):stored;assert.equal(bytes.length,row.bytes);assert.equal(hash(bytes),row.sha256);
 assert.equal(createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex'),row.gitBlobSha1);
 if(row.path==='tools/translation/source-scopes.mjs')before=bytes.toString('utf8');
}
assert.ok(before);
const relocations=[],oldSource=before.replace(/\bfrom (['"])(\.\.?\/[^'"]+)\1/g,(whole,quote,path)=>{
 const after='from '+quote+new URL(path,origin).href+quote;relocations.push({before:whole,after});return after;
});
let reversed=oldSource;for(const row of [...relocations].reverse()){assert.equal(reversed.split(row.after).length,2);reversed=reversed.replace(row.after,row.before);}assert.equal(reversed,before);
const oldPath=join(directory,'complete-original.mjs');writeFileSync(oldPath,oldSource,{flag:'wx'});
const old=await import(pathToFileURL(oldPath));
const currentRelocations=[],currentSource=readFileSync(origin,'utf8'),freshCurrentSource=currentSource.replace(/\bfrom (['"])(\.\.?\/[^'"]+)\1/g,(whole,quote,path)=>{const after='from '+quote+new URL(path,origin).href+quote;currentRelocations.push({before:whole,after});return after;});
let currentReversed=freshCurrentSource;for(const row of [...currentRelocations].reverse()){assert.equal(currentReversed.split(row.after).length,2);currentReversed=currentReversed.replace(row.after,row.before);}assert.equal(currentReversed,currentSource);
const currentPath=join(directory,'complete-current.mjs');writeFileSync(currentPath,freshCurrentSource,{flag:'wx'});assert.equal(readFileSync(currentPath,'utf8'),freshCurrentSource);
const inspect=value=>typeof value==='function'?{function:Function.prototype.toString.call(value)}:value instanceof Map?{map:[...value].map(([key,item])=>[key,inspect(item)])}:value instanceof Set?{set:[...value]}:Array.isArray(value)?value.map(inspect):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).map(([key,item])=>[key,inspect(item)])):value;
function retain(name,value){const output=process.env.ROUTER_IMMUTABLE_NAMESPACE_VECTORS;if(output){mkdirSync(output,{recursive:true});writeFileSync(join(output,name+'.json.gz'),gzipSync(JSON.stringify(value)+'\n'),{flag:'wx'});}}
const modules=[{file:'src/lib.rs',path:[],source:'mod inner;use inner::Public as Alias;fn Option(){}'},
 {file:'src/inner.rs',path:['inner'],source:'pub struct Public;struct Private;pub fn Public()->u8{1}macro_rules! hidden{()=>{}}'}].map(row=>({...row,items:sourceItems(row.source)}));
const resolve=()=>resolveModuleBindings({modules}).scopes;
function configure(api,scopes,{index=0,path=scopes[index].path,immutable=false,parser={}}={}){
 if(immutable&&api.requestImmutableNamespaceTargets)api.requestImmutableNamespaceTargets(parser);
 return api.configureParserSourceScope(parser,scopes[index],scopes,path);
}
function freezeData(value){if(value&&typeof value==='object'){for(const name of Reflect.ownKeys(value)){const field=Object.getOwnPropertyDescriptor(value,name);if(Object.hasOwn(field,'value'))freezeData(field.value);}Object.freeze(value);}return value;}

test('complete original public setup retains mutable per-parser target arrays and native map isolation',{timeout:30000},()=>{
 const scopes=resolve(),expected=inspect(configure(old,scopes)),rows=Array.from({length:3},()=>configure(current,scopes));
 for(const row of rows)assert.deepEqual(inspect(row),expected);
 for(const namespace of ['type','value','macro']){
  const first=rows[0].sourceNamespaceAliases[namespace],second=rows[1].sourceNamespaceAliases[namespace];assert.notEqual(first,second);
  for(const [path,map]of first){assert.notEqual(map,second.get(path));for(const [name,target]of map){assert.equal(Object.isFrozen(target),false);assert.notEqual(target,second.get(path).get(name));target.push('changed');}}
  first.clear();
 }
 assert.deepEqual(inspect(configure(current,scopes)),expected);retain('01-default-original-equivalence',{expected,actual:inspect(rows[1]),relocations});
});

test('explicit internal storage shares only immutable vectors while every complete native map stays independent',{timeout:30000},()=>{
 const scopes=resolve(),rows=Array.from({length:3},()=>configure(current,scopes,{immutable:true}));
 assert.equal(closedFrozenNamespaceScopes(scopes),true);let targets=0;
 for(const namespace of ['type','value','macro']){
  assert.notEqual(rows[0].sourceNamespaceAliases[namespace],rows[1].sourceNamespaceAliases[namespace]);
  for(const [path,map]of rows[0].sourceNamespaceAliases[namespace]){
   assert.notEqual(map,rows[1].sourceNamespaceAliases[namespace].get(path));
   for(const [name,target]of map){targets++;assert.equal(Object.isFrozen(target),true);assert.strictEqual(target,rows[1].sourceNamespaceAliases[namespace].get(path).get(name));assert.throws(()=>target.push('forged'),TypeError);}
  }
 }
 assert.ok(targets>0);const before=inspect(rows[1]);rows[0].sourceNamespaceAliases.type.get('').set('forged',['crate','forged']);rows[0].sourceNamespaceAliases.value.clear();rows[0].sourceNamespaceBindingEvidence.clear();
 assert.deepEqual(inspect(rows[1]),before);assert.deepEqual(inspect(rows[2]),inspect(configure(old,scopes)));retain('02-opted-storage',{targets,before});
});

test('all consuming paths and repeated restrictions preserve the original last-inaccessible decision',{timeout:30000},()=>{
 const scopes=resolve(),observations=[];
 for(const path of [[],['inner'],['elsewhere'],['inner','child'],[]]){
  const expected=configure(old,scopes,{path}),actual=configure(current,scopes,{path,immutable:true});assert.deepEqual(inspect(actual),inspect(expected));
  const target=actual.sourceNamespaceAliases.type.get('inner').get('Private');assert.deepEqual(target,path[0]==='inner'?['crate','inner','Private']:['crate','ml_inaccessible_source_binding','inner','Private']);observations.push({path,target});
 }
 const copied=structuredClone(scopes),binding=copied[1].bindings.find(row=>row.name==='Private'&&row.namespace==='type');binding.visibility={kind:'restricted',path:['inner','child']};copied[1].bindings.push({...structuredClone(binding),visibility:{kind:'restricted',path:['inner']}});
 for(const path of [[],['inner'],['inner','child'],['elsewhere']])assert.deepEqual(inspect(configure(current,copied,{path,immutable:true})),inspect(configure(old,copied,{path})));
 copied[1].bindings.reverse();assert.deepEqual(inspect(configure(current,copied,{path:['inner'],immutable:true})),inspect(configure(old,copied,{path:['inner']})));
 const first=configure(current,scopes,{immutable:true}),second=configure(current,resolve(),{immutable:true});assert.notEqual(first.sourceNamespaceAliases.type.get('').get('Alias'),second.sourceNamespaceAliases.type.get('').get('Alias'));retain('03-visibility',observations);
});

test('complete frozen-data preflight rejects hostile descriptors cycles holes and stack formatting without callbacks',{timeout:30000},()=>{
 let callbacks=0;const scopes=resolve(),proxy=new Proxy({},{get(){callbacks++;throw Error('get');},ownKeys(){callbacks++;throw Error('keys');},getOwnPropertyDescriptor(){callbacks++;throw Error('descriptor');},getPrototypeOf(){callbacks++;throw Error('prototype');}});
 const hostile=[Object.freeze([proxy]),Object.freeze([null]),Object.freeze([{get path(){callbacks++;throw Error('getter');}}]),Object.freeze(Object.assign([], {hidden:true})),Object.freeze([()=>{}]),Object.freeze([Symbol('x')]),Object.freeze([{stack:'captured'}]),Object.freeze([{toJSON:null}])];
 const hole=[1,2];delete hole[0];hole.extra=3;hostile.push(Object.freeze(hole));const cycle=[];cycle.push(cycle);hostile.push(Object.freeze(cycle));let deep=Object.freeze({});for(let at=0;at<165;at++)deep=Object.freeze({child:deep});hostile.push(deep);
 for(const value of hostile)assert.equal(closedFrozenNamespaceScopes(value),false);assert.equal(callbacks,0);
 const copied=structuredClone(scopes);assert.equal(closedFrozenNamespaceScopes(copied),false);const a=configure(current,copied,{immutable:true}),b=configure(current,copied,{immutable:true});assert.notEqual(a.sourceNamespaceAliases.type.get('').get('Alias'),b.sourceNamespaceAliases.type.get('').get('Alias'));assert.equal(Object.isFrozen(a.sourceNamespaceAliases.type.get('').get('Alias')),false);
 copied[1].bindings.find(row=>row.name==='Public'&&row.namespace==='type').target=['std','option','Option'];assert.deepEqual(inspect(configure(current,copied,{immutable:true})),inspect(configure(old,copied)));
 assert.equal(closedNamespaceVisibilityMask(Object.defineProperty({},'0',{get(){callbacks++;throw Error('mask');}}),1),false);assert.equal(closedNamespaceVisibilityMask(new Proxy(new Uint8Array(1),{ownKeys(){callbacks++;throw Error('mask proxy');}}),1),false);assert.equal(closedNamespaceVisibilityMask(new Uint8Array([0,1]),2),true);
 const captured={},prepare=Object.getOwnPropertyDescriptor(Error,'prepareStackTrace');let formatted=0;
 if(typeof Error.captureStackTrace==='function'){
  Error.captureStackTrace(captured);Object.freeze(captured);Object.defineProperty(Error,'prepareStackTrace',{configurable:true,writable:true,value(){formatted++;return 'observed';}});
  try{assert.equal(closedFrozenNamespaceScopes(Object.freeze([captured])),false);}finally{if(prepare)Object.defineProperty(Error,'prepareStackTrace',prepare);else delete Error.prepareStackTrace;}
 }
 assert.equal(formatted,0);assert.equal(callbacks,0);retain('04-refusals',{hostileCount:hostile.length,callbacks,formatted,mutableCopyRefused:true});
});

test('complete project functions and original static shared methods execute through reparsed meta in JS and strict TS',{timeout:60000},async()=>{
 const files={'src/lib.rs':'mod inner;pub fn run(v:u8)->bool{inner::Counter::make(v).small()}pub fn amount(v:u8)->u8{inner::plus(v)}',
  'src/inner.rs':'pub struct Counter{value:u8}impl Counter{pub fn make(value:u8)->Self{Self{value}}pub fn small(&self)->bool{matches!(self.value,1|2)}}pub fn plus(v:u8)->u8{v+3}'};
 const result=translateProject({entry:'src/lib.rs',paths:Object.keys(files),readSource:path=>files[path]});assert.ok(result.meta.executable.some(row=>row.name==='run'));assert.ok(result.meta.checkedMethods.some(row=>row.name==='inner.Counter.small'&&row.receiver==='shared'));
 const reparsed=parseProgram(JSON.stringify(result.meta.checkedSemanticProgram));assert.ok(reparsed.declarations.size);assert.equal(result.meta.runtimeParity,false);
 await verifyTypedTargets(result,api=>{for(const [value,expected]of [[0n,false],[1n,true],[2n,true],[3n,false],[252n,false]]){assert.equal(api.run(value),expected);assert.equal(api.amount(value),value+3n);}assert.throws(()=>api.amount(253n),RangeError);});retain('05-project-original-bodies',{files,result});
});

test('opted immutable targets keep every fresh source association and reject mutable native-map rebinding',{timeout:30000},()=>{
 const source='pub struct A{value:u8}pub fn active(v:u8)->bool{matches!(v,1)}',context=standaloneMatchesMacroContext(source,{file:'src/lib.rs'}),parser=current.requestImmutableNamespaceTargets(new HostRustParser(tokenizeRust(source)));
 configureMatchesMacroParser(parser,context,{file:'src/lib.rs'});const frame=matchesParserFacts(parser),map=parser.sourceNamespaceAliases.type.get(''),target=map.get('A');assert.equal(Object.isFrozen(target),true);
 map.set('A',['crate','forged']);assert.throws(()=>matchesParserFacts(parser),TypeError);map.set('A',target);assert.strictEqual(matchesParserFacts(parser),frame);
 map.set('invented',['crate','invented']);assert.throws(()=>matchesParserFacts(parser),TypeError);map.delete('invented');assert.strictEqual(matchesParserFacts(parser),frame);
 assert.throws(()=>configureMatchesMacroParser(current.requestImmutableNamespaceTargets(new HostRustParser(tokenizeRust(source+' '))),context,{file:'src/lib.rs'}),/source slice/);retain('06-fresh-association',{source,namespaceDigest:frame.namespaceDigest,reboundRefused:true,changedSourceRefused:true});
});

test('late native hooks retain complete original callback tapes and restoration never revives an escaped template',{timeout:60000},()=>{
 const scopes=resolve();configure(old,scopes);configure(current,scopes,{immutable:true});const apply=Reflect.apply,define=Object.defineProperty;
 const cases=[[Uint8Array,'from'],[Map.prototype,'get'],[WeakMap.prototype,'get'],[Array.prototype,Symbol.iterator],[Object,'freeze'],[JSON,'stringify']],observations=[];
 for(const [owner,name]of cases){
  const field=Object.getOwnPropertyDescriptor(owner,name),operation=owner[name],run=api=>{
   const tape=[],parser={};if(api.requestImmutableNamespaceTargets)api.requestImmutableNamespaceTargets(parser);let result;
   define(owner,name,{configurable:true,writable:true,enumerable:field?.enumerable??false,value:function(...args){tape[tape.length]={args,receiver:this,frozen:Array.isArray(this)?Object.isFrozen(this):null};if(owner===Uint8Array)for(const candidate of args[0])if(candidate.binding.name==='Private')candidate.path=['observed','mutation'];return apply(operation,this,args);}});
   try{result=api.configureParserSourceScope(parser,scopes[0],scopes,['elsewhere']);}finally{if(field)define(owner,name,field);else delete owner[name];}
   return {tape:inspect(tape),result:inspect(result)};
  };
  const expected=run(old),actual=run(current),label=typeof name==='symbol'?name.description:name;observations.push({name:label,expected,actual});retain('07-hook-'+observations.length+'-'+label,{expected,actual});assert.deepEqual(actual,expected);
 }
 const a=configure(current,scopes,{immutable:true}),b=configure(current,scopes,{immutable:true});assert.equal(Object.isFrozen(a.sourceNamespaceAliases.type.get('').get('Alias')),false);assert.notEqual(a.sourceNamespaceAliases.type.get('').get('Alias'),b.sourceNamespaceAliases.type.get('').get('Alias'));retain('07-complete-hook-tapes',observations);
});

test('physically fresh cold leaves preserve constructor setter and transient from callback tapes',{timeout:60000},()=>{
 const moduleBindings=new URL('../module-bindings.mjs',import.meta.url).href,structure=new URL('../rust-structure.mjs',import.meta.url).href,results=[];
 for(const mode of ['weak-map-constructor','weak-set-constructor','namespace-setter','transient-path-from']){
  const rows=[];
  for(const [label,url]of [['old',pathToFileURL(oldPath).href],['current',pathToFileURL(currentPath).href]]){
   const script=`import assert from 'node:assert/strict';const warm=await import(${JSON.stringify(origin.href)}),{resolveModuleBindings}=await import(${JSON.stringify(moduleBindings)}),{sourceItems}=await import(${JSON.stringify(structure)});const source='mod inner;pub struct A;',child='struct Private;',modules=[{file:'src/lib.rs',path:[],source,items:sourceItems(source)},{file:'src/inner.rs',path:['inner'],source:child,items:sourceItems(child)}],scopes=resolveModuleBindings({modules}).scopes;
const mode=${JSON.stringify(mode)},define=Object.defineProperty,apply=Reflect.apply,construct=Reflect.construct,tape=[];let restore=()=>{};
const inspect=value=>typeof value==='function'?{function:Function.prototype.toString.call(value)}:value instanceof Map?{map:[...value].map(([key,item])=>[key,inspect(item)])}:value instanceof Set?{set:[...value]}:Array.isArray(value)?value.map(inspect):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).map(([key,item])=>[key,inspect(item)])):value;
if(mode.endsWith('constructor')){const name=mode==='weak-map-constructor'?'WeakMap':'WeakSet',field=Object.getOwnPropertyDescriptor(globalThis,name),Original=field.value;const wrapper=function(...args){tape[tape.length]={kind:name,args};return construct(Original,args,Original);};define(wrapper,'prototype',{value:Original.prototype});define(globalThis,name,{...field,value:wrapper});restore=()=>define(globalThis,name,field);}
if(mode==='namespace-setter'){const field=Object.getOwnPropertyDescriptor(Object.prototype,'type');define(Object.prototype,'type',{configurable:true,set(value){tape[tape.length]={kind:'type',value};define(this,'type',{value,writable:true,configurable:true,enumerable:true});}});restore=()=>{if(field)define(Object.prototype,'type',field);else delete Object.prototype.type;};}
const api=await import(${JSON.stringify(url)});const physicallyFresh=api.configureParserSourceScope!==warm.configureParserSourceScope;let one,parser={},path=['outside'];if(api.requestImmutableNamespaceTargets)api.requestImmutableNamespaceTargets(parser);
if(mode==='transient-path-from'){api.configureParserSourceScope({},scopes[0],scopes,[]);const own=Object.getOwnPropertyDescriptor(Uint8Array,'from'),original=Uint8Array.from;path=[];define(path,'toJSON',{configurable:true,value:function(){tape[tape.length]={kind:'path.toJSON'};define(Uint8Array,'from',{configurable:true,writable:true,value:function(...args){tape[tape.length]={kind:'from',args};for(const candidate of args[0])if(candidate.binding.name==='Private')candidate.path=['transient','mutation'];if(own)define(Uint8Array,'from',own);else delete Uint8Array.from;return apply(original,this,args);}});return ['outside'];}});restore=()=>{if(own)define(Uint8Array,'from',own);else delete Uint8Array.from;};}
try{one=api.configureParserSourceScope(parser,scopes[0],scopes,path);}finally{restore();}const target=one.sourceNamespaceAliases.type.get('').get('A'),initialStillMutable=!Object.isFrozen(target);const p={};if(api.requestImmutableNamespaceTargets)api.requestImmutableNamespaceTargets(p);api.configureParserSourceScope(p,scopes[0],scopes,['after']);const restoredStillMutable=!Object.isFrozen(p.sourceNamespaceAliases.type.get('').get('A'));console.log(JSON.stringify({mode,tape:inspect(tape),result:inspect(one),restored:inspect(p),physicallyFresh,initialStillMutable,restoredStillMutable,localRustExecuted:false}));`;
   const stdout=execFileSync(process.execPath,['--input-type=module','-e',script],{encoding:'utf8',timeout:15000,stdio:'pipe'});rows.push({label,report:JSON.parse(stdout.trim())});
  }
  results.push({mode,rows});retain('08-cold-'+mode,{rows,oldSource,currentSource,relocations,currentRelocations});for(const row of rows){assert.equal(row.report.physicallyFresh,true);assert.equal(row.report.initialStillMutable,true);assert.equal(row.report.restoredStillMutable,true);}assert.deepEqual(rows[1].report,rows[0].report);
 }
 assert.equal(results.length,4);retain('08-leaf-cold-controls',results);
});
