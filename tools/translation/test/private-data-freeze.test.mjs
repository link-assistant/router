import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash,Hash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createCompletedDataFreezer} from '../private-data-freeze.mjs';
import {originalDataFreezeIntrinsicsUnchanged} from '../original-json-intrinsics.mjs';
import {captureSourceModuleViews} from '../source-module-views.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {createDeriveFootprintContext} from '../derive-footprints.mjs';
import {builtinDeriveAstSourceProfile,builtinAstOriginal} from '../builtin-derive-ast-meta.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {translateProject} from '../project.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
const json=JSON.stringify,apply=Reflect.apply,descriptor=Object.getOwnPropertyDescriptor,define=Object.defineProperty,text=Function.prototype.toString,hash=value=>createHash('sha256').update(value).digest('hex');
const root=new URL('../../../',import.meta.url),base=new URL('../',import.meta.url),fixture=new URL('./fixtures/private-data-freeze/',import.meta.url),manifest=JSON.parse(readFileSync(new URL('manifest.json',fixture),'utf8')),directory=mkdtempSync(join(tmpdir(),'router-data-freeze-'));after(()=>rmSync(directory,{recursive:true,force:true}));
const originals=new Map();for(const row of manifest.sources){const bytes=readFileSync(new URL(row.storedPath,fixture));assert.equal(bytes.length,row.bytes);assert.equal(hash(bytes),row.sha256);originals.set(row.path,bytes.toString('utf8'));}
const originalPath='tools/translation/builtin-derive-bang-footprints.mjs',oldSource=originals.get(originalPath),currentSource=readFileSync(new URL('../builtin-derive-bang-footprints.mjs',import.meta.url),'utf8'),legacyLine="const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};",relocations=[];
function relocate(source,origin,label,overrides={}){return source.replace(/\bfrom (['"])(\.\.?\/[^'"]+)\1/g,(_whole,quote,path)=>{const actual=new URL(path,origin).href,target=overrides[actual]??actual;relocations.push({label,path,target});return 'from '+quote+target+quote;}).replace(/\bimport\.meta\.url\b/g,()=>{relocations.push({label,kind:'original-module-url',target:origin.href});return json(origin.href);});}
const helperOrigin=new URL('../private-data-freeze.mjs',import.meta.url),helperSource=readFileSync(helperOrigin,'utf8'),freshHelperPath=join(directory,'fresh-helper.mjs');writeFileSync(freshHelperPath,relocate(helperSource,helperOrigin,'fresh-helper'));
function leaf(source,label,current){const origin=new URL('../builtin-derive-bang-footprints.mjs',import.meta.url),path=join(directory,label+'.mjs'),exports='
export {freeze as originalFreezeForOracle'+(current?',freezeCompleted as completedFreezeForOracle':'')+'};
';writeFileSync(path,relocate(source,origin,label,current?{[helperOrigin.href]:pathToFileURL(freshHelperPath).href}:{})+exports);return {source,path,url:pathToFileURL(path).href,exports};}
const leaves={old:leaf(oldSource,'complete-original',false),current:leaf(currentSource,'complete-current',true)};leaves.old.module=await import(leaves.old.url);leaves.current.module=await import(leaves.current.url);
const legacyFreeze=leaves.current.module.originalFreezeForOracle;
const cargo={manifest:readFileSync(new URL('Cargo.toml',root),'utf8'),lock:readFileSync(new URL('Cargo.lock',root),'utf8')},dependencies=loadDeriveDependencyProof(cargo);
function retain(name,value){const output=process.env.ROUTER_DATA_FREEZE_VECTOR_DIR;if(output){mkdirSync(output,{recursive:true});writeFileSync(join(output,name+'.json.gz'),gzipSync(json(value,(_key,item)=>typeof item==='bigint'?{$integer:item.toString()}:item)+'
'),{flag:'wx'});}}
const outcome=run=>{try{return {value:run()};}catch(error){return {error:{name:error.name,message:error.message}};}};
function model(){const shared={text:'λ😀',values:[1,true,null]},nullRecord=Object.assign(Object.create(null),{name:'original',shared});return {first:shared,second:shared,list:[shared,nullRecord],nothing:undefined};}
function selected(source,name='Copy'){
 const capture=captureSourceModuleViews({source,sourcePath:'src/lib.rs',compilationProfile:PRODUCTION_PROFILE}),modules=capture.views.map(sourceView=>({file:'src/lib.rs',path:[...sourceView.modulePath],source,sourceView,compilationProfile:sourceView.compilationProfile,configurationCondition:sourceView.configurationCondition})),context=createDeriveFootprintContext({modules,dependencies,compilationProfile:PRODUCTION_PROFILE}),certificate=context.certificates.find(row=>row.name==='Payload');assert.ok(certificate);const attribute=certificate.attributes.find(row=>row.derives?.some(path=>path.join('::')===name));assert.ok(attribute);return {context,certificate,invocation:{path:[name],attributeSpan:attribute.span}};
}

test('complete original freezer and source witnesses stay exact and native DAG returns preserve every identity and descriptor',{timeout:5000},()=>{
 assert.equal(originalDataFreezeIntrinsicsUnchanged(),true);assert.equal(oldSource.split(legacyLine).length,2);assert.equal(currentSource.split(legacyLine).length,2);assert.equal(apply(text,leaves.old.module.originalFreezeForOracle,[]),apply(text,legacyFreeze,[]));assert.equal(readFileSync(new URL('../original-json-intrinsics.mjs',import.meta.url),'utf8').startsWith(originals.get('tools/translation/original-json-intrinsics.mjs')),true);
 const expected=model(),actual=model(),freeze=createCompletedDataFreezer(legacyFreeze),first=freeze(actual),second=freeze(actual);legacyFreeze(expected);assert.equal(first,actual);assert.equal(second,actual);assert.equal(actual.first,actual.second);assert.equal(actual.first,actual.list[0]);assert.equal(actual.list[1].shared,actual.first);assert.equal(Object.getPrototypeOf(actual.list[1]),null);assert.deepEqual(actual,expected);assert.deepEqual(Object.getOwnPropertyDescriptors(actual),Object.getOwnPropertyDescriptors(expected));for(const node of [actual,actual.first,actual.list,actual.list[1],actual.first.values])assert.equal(Object.isFrozen(node),true);
 retain('01-complete-originals-and-native-identity',{manifest,originals:[...originals],currentSource,helperSource,relocations,oracleExports:{old:leaves.old.exports,current:leaves.current.exports},expected,actual});
});

test('weak completed roots and descendants survive ordinary reuse and bounded wholesale rotation without exposing private records',{timeout:10000},()=>{
 const freeze=createCompletedDataFreezer(legacyFreeze),child={value:1},root={child};assert.equal(freeze(root),root);const observations=[];
 for(let at=0;at<5000;at++){const input={index:at,child};const result=freeze(input);assert.equal(result,input);assert.equal(result.child,child);assert.equal(Object.isFrozen(input),true);observations.push(input);}
 assert.equal(freeze(root),root);assert.equal(freeze({child}).child,child);assert.deepEqual(Reflect.ownKeys(child),['value']);assert.deepEqual(Reflect.ownKeys(root),['child']);retain('02-complete-rotation-and-shared-roots',{root,child,observations,authority:false});
});

test('native precise coverage checks completed reuse and whole-root fallback for deep shared paths logical aliases and unique scratch limits',{timeout:30000},()=>{
 const helper=helperOrigin.href,old=leaves.old.url,observations=[];
 for(const kind of ['reuse','shared-depth','cached-depth','logical-cells','unique-nodes']){
  const construct=kind==='reuse'?"input={child:{value:1}};":kind==='logical-cells'?"input={value:1};for(let at=0;at<18;at++)input={left:input,right:input};":kind==='unique-nodes'?"input=Array.from({length:33000},(_,index)=>({index}));":"let shared={value:1};for(let at=0;at<80;at++)shared={next:shared};"+(kind==='cached-depth'?"read(shared);":"")+"let deeper=shared;for(let at=0;at<85;at++)deeper={next:deeper};input={shallow:shared,deeper};";
  const code=`import {Session} from 'node:inspector';import {createCompletedDataFreezer} from ${json(helper)};import {originalFreezeForOracle as freeze} from ${json(old)};const read=createCompletedDataFreezer(freeze);freeze({warm:true});read({warm:true});let input;${construct}const session=new Session();session.connect();const post=(name,args={})=>new Promise((resolve,reject)=>session.post(name,args,(error,value)=>error?reject(error):resolve(value)));let result;try{await post('Profiler.enable');await post('Profiler.startPreciseCoverage',{callCount:true,detailed:true});const first=read(input),second=read(input);result={firstSame:first===input,secondSame:second===input,frozen:Object.isFrozen(input),coverage:await post('Profiler.takePreciseCoverage')};}finally{session.disconnect();}process.stdout.write(JSON.stringify(result));`;
  const raw=execFileSync('node',['--input-type=module','--eval',code],{encoding:'utf8',timeout:10000,maxBuffer:8*1024*1024}),result=JSON.parse(raw),oldRows=result.coverage.result.filter(row=>row.url===old);assert.equal(oldRows.length,1);const methods=oldRows[0].functions.filter(row=>row.functionName==='freeze');assert.equal(methods.length,1);const count=methods[0].ranges[0].count;assert.equal(result.firstSame,true);assert.equal(result.secondSame,true);assert.equal(result.frozen,true);if(kind==='reuse')assert.equal(count,0);else assert.ok(count>0,'complete unchanged legacy freezer must run on every uncertain bound');observations.push({kind,code,raw,result,originalFreezeCalls:count});
 }
 retain('03-independent-native-coverage-and-bounds',observations);
});

test('accessors proxies hidden symbol cyclic opaque and mutable descendant inputs keep whole original behavior before any new freezing',{timeout:15000},()=>{
 const observations=[];
 for(const kind of ['accessor','changing-getter','proxy','hidden','symbol','hole','opaque','cycle']){
  function run(freeze){const tape=[],first={value:1},last={later:2};let input;
   if(kind==='accessor')input={first,get later(){tape.push({firstFrozen:Object.isFrozen(first)});return last;}};
   if(kind==='changing-getter'){input={first,get later(){tape.push({firstFrozen:Object.isFrozen(first)});define(input,'later',{value:last,enumerable:true});return first;}};}
   if(kind==='proxy')input=new Proxy({first},{ownKeys(target){tape.push('ownKeys');return Reflect.ownKeys(target);},getOwnPropertyDescriptor(target,key){tape.push('descriptor:'+String(key));return descriptor(target,key);},get(target,key,receiver){tape.push('get:'+String(key));return Reflect.get(target,key,receiver);}});
   if(kind==='hidden'){input={first};define(input,'hidden',{value:last});}
   if(kind==='symbol'){input={first};input[Symbol.for('original-freeze-hidden')]=last;}
   if(kind==='hole'){input=[];input.length=2;input[1]=first;}
   if(kind==='opaque')input=Object.assign(Object.create({inherited:last}),{first});
   if(kind==='cycle'){input={};input.self=input;}
   const result=outcome(()=>freeze(input));return {tape,result:result.error?result:{same:result.value===input},frozen:{root:Object.isFrozen(input),first:Object.isFrozen(first),last:Object.isFrozen(last)},keys:Reflect.ownKeys(input).map(key=>typeof key==='symbol'?'symbol:'+String(key):key)};
  }
  const expected=run(legacyFreeze),actual=run(createCompletedDataFreezer(legacyFreeze));retain('04-fallback-'+kind,{kind,expected,actual});assert.deepEqual(actual,expected);if(kind==='accessor'||kind==='changing-getter')assert.equal(actual.tape[0].firstFrozen,false);observations.push({kind,expected,actual});
 }
 const mutable={child:{value:1}};Object.freeze(mutable);const freeze=createCompletedDataFreezer(legacyFreeze);freeze(mutable);assert.equal(Object.isFrozen(mutable.child),true);retain('04-frozen-parent-mutable-descendant',{mutable,observations});
});

test('changed native operations preserve full original callback function identity text and order including getter reentrancy',{timeout:20000},()=>{
 const observations=[],controls=[[Object,'values'],[Object,'freeze'],[Object,'isFrozen'],[Object,'getOwnPropertyDescriptors'],[Reflect,'ownKeys'],[Array.prototype,'forEach'],[Map.prototype,'get'],[WeakMap.prototype,'get'],[WeakMap.prototype,'set']];
 for(const [owner,key]of controls){
  function run(fast){const freeze=legacyFreeze,read=fast?createCompletedDataFreezer(freeze):freeze,input=model(),prior=descriptor(owner,key),tape=[];let result,probe;
   try{define(owner,key,{...prior,value(...args){const returned=apply(prior.value,this,args);tape[tape.length]={operation:key,args:args.map(value=>typeof value==='function'?{name:value.name,source:apply(text,value,[]),sameOriginal:value===freeze}:typeof value==='object'?json(value):value),same:returned===args[0]};return returned;}});
    if(owner===Map.prototype)apply(owner[key],new Map(),['probe']);else if(owner===WeakMap.prototype)apply(owner[key],new WeakMap(),key==='set'?[{},true]:[{}]);else if(owner===Array.prototype)apply(owner[key],[1],[()=>true]);else owner[key]({probe:true});probe=tape.slice();tape.length=0;result=outcome(()=>read(input));
   }finally{define(owner,key,prior);}return {probe,tape,result};
  }
  const expected=run(false),actual=run(true);assert.deepEqual(actual,expected);assert.ok(actual.probe.length>0);retain('05-observer-'+key+'-'+observations.length,{expected,actual});observations.push({key,expected,actual});
 }
 for(const operation of ['freeze','forEach']){
  function run(fast){const read=fast?createCompletedDataFreezer(legacyFreeze):legacyFreeze,owner=operation==='freeze'?Object:Array.prototype,prior=descriptor(owner,operation),tape=[],first={value:1},input={first,get later(){tape.push({event:'getter',firstFrozen:Object.isFrozen(first)});define(owner,operation,{...prior,value(...args){tape.push({event:operation,callback:typeof args[0]==='function'?{name:args[0].name,source:apply(text,args[0],[]),sameOriginal:args[0]===legacyFreeze}:null});return apply(prior.value,this,args);}});return {value:2};}};let result;try{result=outcome(()=>read(input));}finally{define(owner,operation,prior);}return {tape,result};}
  const expected=run(false),actual=run(true);assert.deepEqual(actual,expected);assert.equal(actual.tape[0].firstFrozen,false);retain('05-getter-mutated-'+operation,{expected,actual});
 }
});

test('wrong native families and live inherited numeric cells keep fallback while hostile feature owners never gain memo authority',{timeout:15000},()=>{
 const prior=descriptor(WeakMap.prototype,'get');let result;try{define(WeakMap.prototype,'get',{...prior,value:Map.prototype.get});assert.equal(originalDataFreezeIntrinsicsUnchanged(),false);const input=model();result=createCompletedDataFreezer(legacyFreeze)(input);assert.equal(result,input);assert.equal(Object.isFrozen(result),true);}finally{define(WeakMap.prototype,'get',prior);}retain('06-wrong-native-family',{result});
 const numeric=descriptor(Object.prototype,'9000001');let callbacks=0;try{define(Object.prototype,'9000001',{get(){callbacks++;throw Error('numeric inherited getter');},configurable:true});assert.equal(originalDataFreezeIntrinsicsUnchanged(),false);const input=model();assert.equal(createCompletedDataFreezer(legacyFreeze)(input),input);assert.equal(callbacks,0);}finally{if(numeric)define(Object.prototype,'9000001',numeric);else delete Object.prototype[9000001];}
 for(const name of ['Map','WeakMap']){const prior=descriptor(globalThis,name),target=prior.value;let traps=0;try{define(globalThis,name,{...prior,value:new Proxy(target,{get(){traps++;throw Error('proxy feature owner');},getOwnPropertyDescriptor(){traps++;throw Error('proxy descriptor');}})});assert.equal(originalDataFreezeIntrinsicsUnchanged(),false);const input=model();assert.equal(createCompletedDataFreezer(legacyFreeze)(input),input);assert.equal(traps,0);}finally{define(globalThis,name,prior);}}
});

test('complete original builtin outputs private reissue failures and all cryptographic input bytes stay unchanged',{timeout:60000},()=>{
 const source='#[derive(Copy,Clone,Debug,PartialEq,Eq,Hash,Default)]pub struct Payload{value:u8}',profile=builtinDeriveAstSourceProfile(dependencies),sources=profile.sources.map(row=>({...row,content:builtinAstOriginal(profile,row.path).source}));retain('07-complete-pinned-compiler-inputs',{sources,source,cargo});
 for(const name of ['Copy','Clone','Debug','PartialEq','Eq','Hash','Default']){
  const input=selected(source,name),run=implementation=>{const prior=descriptor(Hash.prototype,'update'),tape=[];let first,second,reissued;try{define(Hash.prototype,'update',{...prior,value(value,...args){tape[tape.length]={bytes:Buffer.from(value,typeof args[0]==='string'?args[0]:undefined).toString('base64'),encoding:args[0]??null};return apply(prior.value,this,[value,...args]);}});first=implementation.proveBuiltinDeriveBangFootprint(input);second=implementation.proveBuiltinDeriveBangFootprint(input);reissued=implementation.originalBuiltinDeriveEnclosingOutput(first,input.context,input.certificate,input.invocation);}finally{define(Hash.prototype,'update',prior);}const copied=outcome(()=>implementation.assertBuiltinDeriveBangFootprint(structuredClone(first),input.context,input.certificate,input.invocation)),foreign=outcome(()=>implementation.proveBuiltinDeriveBangFootprint({...input,certificate:structuredClone(input.certificate)}));return {first,second,reissued,tape,copied,foreign};};
  const expected=run(leaves.old.module),actual=run(leaves.current.module);retain('07-complete-'+name,{input,expected,actual});assert.deepEqual(actual,expected);assert.equal(json(actual),json(expected));assert.ok(actual.tape.length>0);assert.ok(actual.copied.error);assert.ok(actual.foreign.error);assert.equal(actual.first.generatedImplBehavior,false);
 }
});

test('fresh helper and consumer imports share exact initialized issuer and fallback without changing cold tapes or checked targets',{timeout:60000},async()=>{
 const observations=[];
 for(const mode of ['freeze','values','forEach']){
  function child(which){const pair=leaves[which],code=`import {gzipSync} from 'node:zlib';await import(${json(new URL('../builtin-derive-bang-footprints.mjs',import.meta.url).href)});await import(${json(new URL('../original-json-intrinsics.mjs',import.meta.url).href)});const json=JSON.stringify,apply=Reflect.apply,define=Object.defineProperty,descriptor=Object.getOwnPropertyDescriptor,text=Function.prototype.toString,mode=${json(mode)},owner=mode==='forEach'?Array.prototype:Object,prior=descriptor(owner,mode),tape=[];let result,probe;try{define(owner,mode,{...prior,value(...args){const returned=apply(prior.value,this,args);tape[tape.length]={args:args.map(value=>typeof value==='function'?{name:value.name,source:apply(text,value,[])}:typeof value==='object'?json(value):value),same:returned===args[0]};return returned;}});if(mode==='forEach')apply(owner[mode],[1],[()=>true]);else owner[mode]({probe:true});probe=tape.slice();tape.length=0;const subject=await import(${json(pair.url)}),input={first:{value:1},second:[true,'λ😀']};const output=subject.${which==='old'?'originalFreezeForOracle':'completedFreezeForOracle'}(input);result={same:output===input,frozen:Object.isFrozen(input),value:output};}finally{define(owner,mode,prior);}process.stdout.write(gzipSync(json({probe,tape,result})));`;let wire;try{wire=execFileSync(process.execPath,['--input-type=module','--eval',code],{timeout:10000,maxBuffer:8*1024*1024});}catch(error){retain('08-cold-'+mode+'-'+which+'-failed-partial',{code,error:{name:error.name,message:error.message,signal:error.signal,status:error.status},stdout:Buffer.from(error.stdout??[]).toString('base64'),stderr:Buffer.from(error.stderr??[]).toString('base64'),partial:true});throw error;}const record={code,wire:{encoding:'gzip-json-base64',bytes:wire.length,sha256:hash(wire),base64:wire.toString('base64')}};retain('08-cold-'+mode+'-'+which+'-complete-wire',record);const decoded=gunzipSync(wire,{maxOutputLength:64*1024*1024});return {record,result:JSON.parse(decoded.toString('utf8'))};}
  const expected=child('old'),actual=child('current');assert.deepEqual(actual.result,expected.result);assert.ok(actual.result.probe.length>0);assert.equal(actual.result.result.same,true);observations.push({mode,expected:expected.record,actual:actual.record});
 }
 const source='#[derive(Copy,Clone,Debug)]pub struct Data{value:u8}pub fn accept(value:u8)->bool{value>0}',translation=translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source}),targets=[];retain('08-full-ordinary-translation',{source,translation,observations,scope:'native freeze reuse creates no executable derived trait authority'});
 try{await verifyTypedTargets(translation,api=>{const result=[api.accept(0n),api.accept(1n),api.accept(255n)];assert.deepEqual(result,[false,true,true]);targets.push(result);},{childTimeoutMs:20000});}finally{retain('08-target-observations',targets);}assert.equal(targets.length,2);
});
