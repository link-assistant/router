import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,writeFileSync,mkdirSync,rmSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import * as current from '../derive-footprints.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {captureSourceModuleViews} from '../source-module-views.mjs';
import {resolveModuleGraph} from '../project.mjs';
import {trackedSource} from '../source-corpus.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {originalJsonIntrinsicsUnchanged} from '../original-json-intrinsics.mjs';
const root=fileURLToPath(new URL('../../../',import.meta.url)),base=new URL('../',import.meta.url),fixture=new URL('../fixtures/derive-module-paths/',import.meta.url);
const hash=value=>createHash('sha256').update(value).digest('hex'),nativeJson=JSON.stringify,nativeApply=Reflect.apply,nativeIsArray=Array.isArray;
const manifest=JSON.parse(readFileSync(new URL('manifest.json',fixture),'utf8')),oldBytes=readFileSync(new URL(manifest.storedPath,fixture));
assert.equal(oldBytes.length,manifest.bytes);assert.equal(hash(oldBytes),manifest.sha256);
// The complete old leaf executes against the SAME active dependency/private
// issuers. Only import locations change; no old body/expression is substituted.
const directory=mkdtempSync(join(tmpdir(),'router-standard-module-paths-')),relocations=[];
const oldSource=oldBytes.toString('utf8').replace(/\bfrom (['"])(\.\/[^'"]+)\1/g,(whole,quote,path)=>{const target=new URL(path,base).href;relocations.push({path,target});return 'from '+quote+target+quote;});
const oldPath=join(directory,'complete-original.mjs');writeFileSync(oldPath,oldSource);
const currentBytes=readFileSync(new URL('../derive-footprints.mjs',import.meta.url)),currentRelocations=[],currentSource=currentBytes.toString('utf8').replace(/\bfrom (['"])(\.\/[^'"]+)\1/g,(whole,quote,path)=>{const target=new URL(path,base).href;currentRelocations.push({path,target});return 'from '+quote+target+quote;});
const currentPath=join(directory,'complete-current.mjs');writeFileSync(currentPath,currentSource);after(()=>rmSync(directory,{recursive:true,force:true}));
const old=await import(pathToFileURL(oldPath).href),cargo={manifest:readFileSync(join(root,'Cargo.toml'),'utf8'),lock:readFileSync(join(root,'Cargo.lock'),'utf8')},dependencies=loadDeriveDependencyProof(cargo);
function retain(name,value){const output=process.env.ROUTER_STANDARD_MODULE_PATH_VECTOR_DIR;if(output){mkdirSync(output,{recursive:true});writeFileSync(join(output,name+'.json'),nativeJson(value));}}
function inputs(source,count=0){if(count)source=Array.from({length:count},(_,index)=>`mod child_${index}{#[derive(Clone,Debug)]pub struct Payload{value:u8}}`).join('')+source;const views=captureSourceModuleViews({source,sourcePath:'src/lib.rs',compilationProfile:PRODUCTION_PROFILE}).views;return {source,modules:views.map(sourceView=>({file:'src/lib.rs',path:[...sourceView.modulePath],source,sourceView,configurationCondition:sourceView.configurationCondition,compilationProfile:PRODUCTION_PROFILE}))};}
function run(implementation,row){try{return {context:implementation.createDeriveFootprintContext({modules:row.modules,dependencies,compilationProfile:PRODUCTION_PROFILE})};}catch(error){return {error:{name:error.name,message:error.message}};}}
function equal(name,expected,actual,extra={}){retain(name,{...extra,expected,actual});assert.deepEqual(actual,expected);assert.equal(nativeJson(actual),nativeJson(expected));}
function observerProbe(owner,key){
 if(owner===JSON)return {receiver:JSON,args:[{probe:true}]};
 if(owner===Array.prototype)return {receiver:[1],args:key==='some'?[value=>value===1]:[]};
 if(owner===Set.prototype)return {receiver:new Set(),args:[{}]};
 if(owner===WeakMap.prototype)return {receiver:new WeakMap(),args:[{}]};
 if(owner===Object)return {receiver:Object,args:key==='getOwnPropertyDescriptor'||key==='hasOwn'?[{probe:true},'probe']:[{}]};
 if(owner===Reflect)return {receiver:Reflect,args:key==='apply'?[function probe(){return true;},null,[]]:[{probe:true}]};
 if(owner===Array)return {receiver:Array,args:[[]]};
 throw new Error('Unknown test observer dimension');
}
function observed(implementation,row,owner,key,label,mutate=null){const previous=Object.getOwnPropertyDescriptor(owner,key),native=previous.value,tape=[],probe=observerProbe(owner,key);let outcome,probeTape,probing=true;try{Object.defineProperty(owner,key,{...previous,value(...args){const result=nativeApply(native,this,args);tape[tape.length]=key==='stringify'?{label,result}:{label,length:nativeIsArray(this)?this.length:null};if(!probing&&mutate)mutate(row,tape.length);return result;}});nativeApply(owner[key],probe.receiver,probe.args);probeTape=tape.slice();tape.length=0;probing=false;outcome=run(implementation,row);}finally{Object.defineProperty(owner,key,previous);}return {probeTape,tape,outcome};}

test('complete original oracle and dense genuine mutable module graph preserve every context byte and private issuer',{timeout:5000},()=>{
 assert.equal(originalJsonIntrinsicsUnchanged(),true);
 const importCensus=oldBytes.toString('utf8').split('\n').filter(line=>line.startsWith('import ')).map(line=>{const at=line.lastIndexOf('from ');assert.ok(at>=0,'every complete original import has a source');const quoted=line.slice(at+5).trim(),quote=quoted[0],end=quoted.lastIndexOf(quote);assert.ok((quote==='\"'||quote==="'")&&end>0&&quoted.slice(end+1)===';');return {source:line,path:quoted.slice(1,end)};}),relativeImports=importCensus.filter(row=>row.path.startsWith('./'));
 assert.ok(relativeImports.length>0);assert.deepEqual(relocations,relativeImports.map(row=>({path:row.path,target:new URL(row.path,base).href})));retain('01-complete-independent-import-census',{manifest,importCensus,relocations});assert.equal(oldSource.replace(/\bfrom (['"])(file:[^'"]+)\1/g,(whole,quote,target)=>{const row=relocations.find(row=>row.target===target);return row?'from '+quote+row.path+quote:whole;}),oldBytes.toString('utf8'));
 const row=inputs('#[derive(Clone,Debug)]pub struct Root{value:u8}',12),expected=run(old,row),actual=run(current,row);equal('01-complete-genuine-dense-contexts',expected,actual,{source:row.source,manifest,relocations,completeOriginal:oldBytes.toString('utf8')});
 assert.ok(actual.context.certificates.filter(row=>row.standardInput).length>=13);for(const module of row.modules){assert.equal(Object.isFrozen(module.path),false);assert.equal(Object.isFrozen(module),false);}
 const certificate=actual.context.certificates[0];assert.equal(current.isDeriveFootprintCertificate(certificate),true);assert.equal(old.isDeriveFootprintCertificate(certificate),false);assert.equal(current.isDeriveFootprintCertificate(structuredClone(certificate)),false);
});

test('complete actual unchanged Router graph freshly reconstructs identical whole derive contexts',{timeout:60000},()=>{
 const paths=execFileSync('git',['ls-files','-z','--','*.rs'],{cwd:root,encoding:'utf8',timeout:10000,maxBuffer:4*1024*1024}).split('\0').filter(Boolean),readSource=path=>trackedSource(root,path),graph=resolveModuleGraph({entry:'src/lib.rs',paths,readSource,compilationProfile:PRODUCTION_PROFILE});
 assert.ok(paths.length>=804);assert.ok(graph.modules.length>100);assert.ok(graph.modules.every(module=>module.sourceView));const row={modules:graph.modules},expected=run(old,row),actual=run(current,row);equal('02-complete-actual-router-contexts',expected,actual,{paths,graph,cargo,originalOracle:manifest});assert.ok(actual.context.certificates.some(row=>row.standardInput));
});

test('legacy modules without private original views and conservative unknown owners keep complete original refusals',{timeout:5000},()=>{
 const cases=['#[derive(Clone)]pub struct P;','mod absent;#[derive(Clone)]pub struct P;','inject!();#[derive(Clone)]pub struct P;','use other::*;#[derive(Clone)]pub struct P;','#[cfg(unix)]mod conditional{pub struct Child;}#[derive(Clone)]pub struct P;'];const outcomes=[];
 for(const source of cases){const row=inputs(source);if(source===cases[0])for(const module of row.modules)delete module.sourceView;const expected=run(old,row),actual=run(current,row);equal('03-refusal-'+outcomes.length,expected,actual,{source});outcomes.push({source,expected,actual});}retain('03-all-original-legacy-and-refusal-contexts',outcomes);
});

test('cold call/apply and late serializer collection search and iterator replacements retain exact original callback tapes',{timeout:30000},()=>{
 const controls=[[JSON,'stringify','json'],[Array.prototype,'some','some'],[Array.prototype,Symbol.iterator,'iterator'],[Set.prototype,'add','set-add'],[Set.prototype,'has','set-has'],[WeakMap.prototype,'has','weak-has'],[Object,'getOwnPropertyDescriptor','descriptor'],[Object,'getPrototypeOf','prototype'],[Object,'hasOwn','has-own'],[Reflect,'ownKeys','own-keys'],[Reflect,'apply','apply'],[Array,'isArray','is-array']];const observations=[];
 for(const [owner,key,label]of controls){const a=inputs('#[derive(Clone)]pub struct P;',2),b=inputs(a.source),expected=observed(old,a,owner,key,label),actual=observed(current,b,owner,key,label);equal('04-observer-'+label,expected,actual,{source:a.source});assert.equal(actual.probeTape.length,1,'the installed observer is independently exercised');observations.push({label,...actual});}retain('04-complete-observer-tapes',observations);
 // Preload the actual shared compiler graph before the observer, then cold-
 // import TWO fresh leaf copies. module-bindings imports the active leaf, so
 // using that active leaf as one subject would compare different bootstraps.
 // Independently cold-imported complete subjects preserve the leaf-only scope. This directly falsifies added leaf bootstrap call/apply
 // callbacks while both versions share the SAME native qualification issuer.
 for(const control of ['call','apply']){const child=implementation=>{
  const source=`import * as activeCompiler from ${nativeJson(new URL('../derive-footprints.mjs',import.meta.url).href)};import {loadDeriveDependencyProof} from ${nativeJson(new URL('../derive-dependencies.mjs',import.meta.url).href)};import {captureSourceModuleViews} from ${nativeJson(new URL('../source-module-views.mjs',import.meta.url).href)};import {PRODUCTION_PROFILE} from ${nativeJson(new URL('../cfg-profile.mjs',import.meta.url).href)};import {originalPathMembershipIntrinsicsUnchanged} from ${nativeJson(new URL('../original-json-intrinsics.mjs',import.meta.url).href)};
const dependencies=loadDeriveDependencyProof(${nativeJson(cargo)}),source='mod child{pub struct C;}#[derive(Clone)]pub struct P;',views=captureSourceModuleViews({source,sourcePath:'src/lib.rs',compilationProfile:PRODUCTION_PROFILE}).views,modules=views.map(sourceView=>({file:'src/lib.rs',path:[...sourceView.modulePath],source,sourceView,compilationProfile:PRODUCTION_PROFILE,configurationCondition:sourceView.configurationCondition}));const qualify=originalPathMembershipIntrinsicsUnchanged(),owner=${control==='call'?'Function.prototype':'Reflect'},key=${nativeJson(control)},previous=Object.getOwnPropertyDescriptor(owner,key),native=previous.value,apply=Reflect.apply,json=JSON.stringify,functionText=Function.prototype.toString,probeFunction=function observerProbe(){},probeSource=apply(functionText,probeFunction,[]);let tape=[],result;Object.defineProperty(owner,key,{...previous,value(...args){const returned=apply(native,this,args);if(key==='call'?this===functionText:args[0]===functionText)tape[tape.length]=returned;return returned;}});if(key==='call')functionText.call(probeFunction);else Reflect.apply(functionText,probeFunction,[]);const observerProbe=tape.slice();tape.length=0;try{const implementation=await import(${nativeJson(implementation)});result=implementation.createDeriveFootprintContext({modules,dependencies,compilationProfile:PRODUCTION_PROFILE});}finally{Object.defineProperty(owner,key,previous);}process.stdout.write(json({qualify,probeSource,observerProbe,tape,result}));`;
  const stdout=execFileSync(process.execPath,['--input-type=module','--eval',source],{encoding:'utf8',timeout:8000,maxBuffer:8*1024*1024});return {source,result:JSON.parse(stdout)};
 };const expected=child(pathToFileURL(oldPath).href),actual=child(pathToFileURL(currentPath).href);equal('04-cold-'+control,expected.result,actual.result,{expectedChild:expected.source,actualChild:actual.source,completeCurrent:currentBytes.toString('utf8'),currentSha256:hash(currentBytes),currentRelocations});assert.equal(actual.result.observerProbe.length,1);assert.equal(actual.result.observerProbe[0],actual.result.probeSource);}

});

test('inherited toJSON getters and returned callbacks keep their complete order and original digests',{timeout:10000},()=>{
 for(const [owner,label]of [[Object.prototype,'object'],[Array.prototype,'array']]){const observe=implementation=>{const row=inputs('#[derive(Clone)]pub struct P;',1),previous=Object.getOwnPropertyDescriptor(owner,'toJSON'),tape=[];let outcome;try{Object.defineProperty(owner,'toJSON',{configurable:true,get(){tape[tape.length]='get';return function(){tape[tape.length]='call';return this;};}});outcome=run(implementation,row);}finally{if(previous)Object.defineProperty(owner,'toJSON',previous);else delete owner.toJSON;}return {tape,outcome};};const expected=observe(old),actual=observe(current);equal('05-inherited-'+label,expected,actual);assert.ok(actual.tape.length>0);}
});

test('getter proxy custom iterator incidental fields and own toJSON path inputs preserve all legacy observations',{timeout:10000},()=>{
 const controls=['getter','proxy','iterator','toJSON','extra'];for(const label of controls){const observe=implementation=>{const row=inputs('#[derive(Clone)]pub struct P;',1),path=row.modules[1].path,tape=[];if(label==='getter')Object.defineProperty(path,0,{enumerable:true,configurable:true,get(){tape[tape.length]='get-index';return 'child_0';}});if(label==='proxy')row.modules[1].path=new Proxy(path,{get(target,key,receiver){tape[tape.length]='get:'+String(key);return Reflect.get(target,key,receiver);},getOwnPropertyDescriptor(target,key){tape[tape.length]='descriptor:'+String(key);return Reflect.getOwnPropertyDescriptor(target,key);},ownKeys(target){tape[tape.length]='keys';return Reflect.ownKeys(target);}});if(label==='iterator')path[Symbol.iterator]=function*(){tape[tape.length]='iterate';yield 'child_0';};if(label==='toJSON')path.toJSON=function(){tape[tape.length]='toJSON';return ['child_0'];};if(label==='extra')path.extra='retained';return {tape,outcome:run(implementation,row)};};const expected=observe(old),actual=observe(current);equal('06-path-'+label,expected,actual);if(label!=='extra')assert.ok(actual.tape.length>0);}
});

test('per-invocation mutable paths copied views stale source and unknown conditional siblings never reuse another graph',{timeout:5000},()=>{
 const row=inputs('#[derive(Clone)]pub struct P;',2),first=run(current,row);equal('07-initial-mutable',run(old,row),first);row.modules[1].path[0]='changed';equal('07-mutated-path',run(old,row),run(current,row));row.modules[1].path[0]='child_0';equal('07-restored-path',run(old,row),run(current,row));
 for(const label of ['copy-view','stale-source']){const other=inputs('#[derive(Clone)]pub struct P;',1);if(label==='copy-view')other.modules[0].sourceView=structuredClone(other.modules[0].sourceView);else other.modules[0].source+=' ';const expected=run(old,other),actual=run(current,other);equal('07-'+label,expected,actual);assert.equal(actual.error.name,'TypeError');}
 const conditional=inputs('#[cfg(unix)]mod unix_choice{#[derive(Clone)]pub struct Child;}#[cfg(windows)]mod windows_choice{#[derive(Clone)]pub struct Other;}#[derive(Clone)]pub struct P;');equal('07-full-original-conditional-context',run(old,conditional),run(current,conditional),{source:conditional.source});
});

test('serializer-triggered path mutation keeps the complete original fallback rather than a stale membership snapshot',{timeout:10000},()=>{
 const observe=implementation=>{const row=inputs('#[derive(Clone)]pub struct P;',1),before=[...row.modules[1].path];let mutated=false;const result=observed(implementation,row,JSON,'stringify','mutating-json',(_row,count)=>{if(!mutated&&count===20){mutated=true;row.modules[1].path[0]='changed';}});return {...result,mutated,before,after:[...row.modules[1].path]};};const expected=observe(old),actual=observe(current);equal('08-mid-call-mutation-complete',expected,actual);assert.equal(actual.mutated,true);assert.deepEqual(actual.after,['changed']);
});
