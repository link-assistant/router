import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash,Hash} from 'node:crypto';
import {types} from 'node:util';
import * as current from '../matches-macro-context.mjs';
import {originalNamespaceTraversalIntrinsicsUnchanged} from '../original-json-intrinsics.mjs';
import {HostRustParser} from '../extensions/host-contracts.mjs';
import {tokenizeRust} from '../extensions/lexical.mjs';
import {metadataDigest} from '../extensions/source-links.mjs';
const json=JSON.stringify,apply=Reflect.apply,ownDescriptor=Object.getOwnPropertyDescriptor,define=Object.defineProperty;
const base=new URL('../',import.meta.url),fixture=new URL('../fixtures/namespace-streaming/',import.meta.url),manifest=JSON.parse(readFileSync(new URL('manifest.json',fixture),'utf8'));
const originalBytes=readFileSync(new URL(manifest.storedPath,fixture)),hash=value=>createHash('sha256').update(value).digest('hex');
assert.equal(originalBytes.length,manifest.bytes);assert.equal(hash(originalBytes),manifest.sha256);
const original=originalBytes.toString('utf8'),relocations=[],directory=mkdtempSync(join(tmpdir(),'router-namespace-streaming-'));
const relocated=original.replace(/\bfrom (['"])(\.\/[^'"]+)\1/g,(whole,quote,path)=>{const target=new URL(path,base).href;relocations.push({path,target});return 'from '+quote+target+quote;});
const originalPath=join(directory,'complete-original.mjs');writeFileSync(originalPath,relocated);after(()=>rmSync(directory,{recursive:true,force:true}));
const currentBytes=readFileSync(new URL('../matches-macro-context.mjs',import.meta.url),'utf8'),currentRelocations=[];
const currentRelocated=currentBytes.replace(/\bfrom (['"])(\.\/[^'"]+)\1/g,(whole,quote,path)=>{const target=new URL(path,base).href;currentRelocations.push({path,target});return 'from '+quote+target+quote;});
const currentPath=join(directory,'complete-current.mjs');writeFileSync(currentPath,currentRelocated);
const old=await import(pathToFileURL(originalPath).href);
const source='use std::matches;use serde_json::json;pub struct A{value:u8}pub enum B{On,Off}pub fn first(v:u8)->bool{matches!(v,1)}pub fn second(v:u8)->bool{matches!(v,2)}';
const namespaces=['type','value','macro'];
function retain(name,value){const path=process.env.ROUTER_NAMESPACE_STREAMING_VECTOR_DIR;if(path){mkdirSync(path,{recursive:true});writeFileSync(join(path,name+'.json'),json(value));}}
function configured(implementation,text=source,owner=null,options={}){const context=owner??implementation.standaloneMatchesMacroContext(text,{file:'src/lib.rs'}),parser=new HostRustParser(tokenizeRust(text));implementation.configureMatchesMacroParser(parser,context,{file:'src/lib.rs',...options});return {parser,context};}
function result(implementation,parser){try{return {frame:implementation.matchesParserFacts(parser)};}catch(error){return {error:{name:error.name,message:error.message}};}}
function equal(label,expected,actual,extra={}){retain(label,{...extra,expected,actual});assert.deepEqual(actual,expected);assert.equal(json(actual),json(expected));}
function digest(parser){return metadataDigest(namespaces.map(namespace=>[namespace,[...parser.sourceNamespaceAliases[namespace]].map(([path,map])=>[path,[...map]])]));}
function maps(parser){return namespaces.map(namespace=>[namespace,[...parser.sourceNamespaceAliases[namespace]].map(([path,map])=>[path,[...map]])]);}
function paired(mutate){const execute=implementation=>{const row=configured(implementation),before=result(implementation,row.parser),baseline=maps(row.parser),state=mutate(row,implementation),changed=result(implementation,row.parser);if(state?.restore)state.restore();return {context:row.context,before,baseline,changed,restored:state?.restore?result(implementation,row.parser):null,callbacks:state?.callbacks?.()??0};};return {expected:execute(old),actual:execute(current)};}
function observe(implementation,owner,key,probe,prepare=null){
 const row=configured(implementation),prior=ownDescriptor(owner,key),native=prior.value,tape=[],roles=new WeakMap();let serial=0,outcome,installed,probeTape;
 roles.set(row.parser,'parser');roles.set(row.parser.sourceNamespaceAliases,'aliases');for(const namespace of namespaces){const scopes=row.parser.sourceNamespaceAliases[namespace];roles.set(scopes,'scopes:'+namespace);for(const [path,map]of scopes){roles.set(map,'bindings:'+namespace+':'+path);for(const [name,target]of map)roles.set(target,'target:'+namespace+':'+path+':'+name);}}
 const describe=value=>{if(value===null||typeof value!=='object'&&typeof value!=='function')return typeof value==='symbol'?{type:'symbol'}:{type:typeof value,value};let role=roles.get(value);if(!role){role='observed:'+(serial++);roles.set(value,role);}return {type:typeof value,role};};
 try{define(owner,key,{...prior,value(...args){const argumentsSeen=[];for(let at=0;at<args.length;at++)argumentsSeen[at]=describe(args[at]);const receiver=describe(this),value=apply(native,this,args);tape[tape.length]={receiver,arguments:argumentsSeen,result:key==='stringify'?value:undefined};return value;}});installed=owner[key];apply(installed,probe.receiver,probe.args);probeTape=tape.slice();tape.length=0;serial=0;if(prepare)prepare(row);outcome=result(implementation,row.parser);}finally{define(owner,key,prior);}return {probeTape,tape,outcome};
}

test('complete old leaf relocation and same-issuer native captures retain every public frame byte',{timeout:5000},()=>{
 assert.equal(originalNamespaceTraversalIntrinsicsUnchanged(),true,'default native cursor route must actually qualify in this engine');
 const imports=original.split('\n').filter(line=>line.startsWith('import ')).map(line=>{const at=line.lastIndexOf('from ');assert.ok(at>=0);const rest=line.slice(at+5).trim(),quote=rest[0],end=rest.lastIndexOf(quote);assert.ok((quote==='"'||quote==="'")&&end>0&&rest.slice(end+1)===';');return {source:line,path:rest.slice(1,end)};}),relative=imports.filter(row=>row.path.startsWith('./'));
 assert.ok(relative.length>0);assert.deepEqual(relocations,relative.map(row=>({path:row.path,target:new URL(row.path,base).href})));assert.equal(relocated.replace(/\bfrom (['"])(file:[^'"]+)\1/g,(whole,quote,target)=>{const row=relocations.find(row=>row.target===target);return row?'from '+quote+row.path+quote:whole;}),original);
 const a=configured(old),b=configured(current);equal('01-complete-context-frame',result(old,a.parser),result(current,b.parser),{source,manifest,imports,relocations,completeOriginal:original,completeCurrent:readFileSync(new URL('../matches-macro-context.mjs',import.meta.url),'utf8'),completeQualifier:readFileSync(new URL('../original-json-intrinsics.mjs',import.meta.url),'utf8'),engine:process.versions});
 assert.equal(digest(a.parser),digest(b.parser));assert.equal(current.matchesParserFacts(b.parser).namespaceDigest,digest(b.parser));assert.equal(current.isMatchesMacroContext(b.context),true);assert.equal(old.isMatchesMacroContext(b.context),false);assert.equal(current.isMatchesMacroContext(structuredClone(b.context)),false);
 const oldCapture=original.slice(original.indexOf('function exactNamespaceCapture('),original.indexOf('function issuedNamespaceCapture(')).trim(),collected=currentBytes.slice(currentBytes.indexOf('function collectedNamespaceCapture('),currentBytes.indexOf('// Native cursors')).trim();assert.equal(collected,oldCapture.replace('function exactNamespaceCapture(', 'function collectedNamespaceCapture('));
 const currentImports=currentBytes.split('\n').filter(line=>line.startsWith('import ')).map(line=>{const match=/\bfrom (['"])([^'"]+)\1;$/u.exec(line);assert.ok(match);return match[2];}).filter(path=>path.startsWith('./'));assert.deepEqual(currentRelocations,currentImports.map(path=>({path,target:new URL(path,base).href})));assert.equal(currentRelocated.replace(/\bfrom (['"])(file:[^'"]+)\1/g,(whole,quote,target)=>{const row=currentRelocations.find(row=>row.target===target);return row?'from '+quote+row.path+quote:whole;}),currentBytes);
 const start=source.indexOf('matches!(v,1)'),end=start+'matches!(v,1)'.length,expected=old.proveOriginalMatchesCall(a.parser,{segments:['matches'],start,end}),actual=current.proveOriginalMatchesCall(b.parser,{segments:['matches'],start,end});equal('01-complete-original-call-proof',expected,actual,{source});assert.throws(()=>old.originalMatchesCallFacts(actual),/Unsealed/);assert.throws(()=>current.originalMatchesCallFacts(structuredClone(actual)),/Unsealed/);
});

test('all namespaces retain ordered complete mutable targets and add remove reorder full-scope refusals',{timeout:10000},()=>{
 for(const namespace of namespaces){
  const controls={
   'add-binding':row=>{const map=row.parser.sourceNamespaceAliases[namespace].get('');map.set('extra',['crate','extra']);return {restore:()=>map.delete('extra')};},
   'remove-binding':row=>{const map=row.parser.sourceNamespaceAliases[namespace].get(''),all=[...map],first=all[0];assert.ok(first);map.delete(first[0]);return {restore:()=>{map.clear();for(const pair of all)map.set(...pair);}};},
   'reorder-binding':row=>{const map=row.parser.sourceNamespaceAliases[namespace].get(''),all=[...map];assert.ok(all.length>1);map.delete(all[0][0]);map.set(...all[0]);return {restore:()=>{map.clear();for(const pair of all)map.set(...pair);}};},
   'add-scope':row=>{const map=row.parser.sourceNamespaceAliases[namespace];map.set('unexpected',new Map());return {restore:()=>map.delete('unexpected')};},
   'target-update':row=>{const map=row.parser.sourceNamespaceAliases[namespace].get(''),[name,target]=map.entries().next().value;map.set(name,['std','different']);return {restore:()=>map.set(name,target)};},
   'target-mutate':row=>{const map=row.parser.sourceNamespaceAliases[namespace].get(''),[,target]=map.entries().next().value;target.push('different');return {restore:()=>target.pop()};},
  };
  for(const [label,mutate]of Object.entries(controls)){const rows=paired(mutate);equal('02-'+namespace+'-'+label,rows.expected,rows.actual,{source});assert.equal(rows.actual.changed.error.name,'TypeError');assert.ok(rows.actual.restored.frame);}
 }
 const text='pub struct Root;mod a{pub struct A;}mod b{pub struct B;}';const run=implementation=>{const row=configured(implementation,text),outer=row.parser.sourceNamespaceAliases.type,all=[...outer];assert.ok(all.length>1);outer.delete(all[0][0]);outer.set(...all[0]);return result(implementation,row.parser);};equal('02-full-scope-reorder',run(old),run(current),{source:text});
});

test('target holes accessors extra keys proxy and native-map shapes preserve exact fallback and zero callbacks',{timeout:10000},()=>{
 const controls=['hole','same-key-count-hole','getter','hidden','symbol','own-iterator','proxy-target','proxy-map','own-map-method','map-subclass','proxy-aliases','aliases-getter'];
 for(const label of controls){const rows=paired(row=>{let callbacks=0;const scope=row.parser.sourceNamespaceAliases.type,map=scope.get(''),original=map.get('A'),proxy=value=>new Proxy(value,{get(){callbacks++;throw Error('get');},ownKeys(){callbacks++;throw Error('keys');},getOwnPropertyDescriptor(){callbacks++;throw Error('descriptor');},getPrototypeOf(){callbacks++;throw Error('prototype');}});let restore;
  if(label==='proxy-aliases'){const aliases=row.parser.sourceNamespaceAliases;row.parser.sourceNamespaceAliases=proxy(aliases);restore=()=>{row.parser.sourceNamespaceAliases=aliases;};}else if(label==='aliases-getter'){const prior=ownDescriptor(row.parser,'sourceNamespaceAliases');define(row.parser,'sourceNamespaceAliases',{configurable:true,get(){callbacks++;throw Error('aliases getter');}});restore=()=>define(row.parser,'sourceNamespaceAliases',prior);}else if(label==='proxy-map'){scope.set('',proxy(map));restore=()=>scope.set('',map);}else if(label==='own-map-method'){define(map,'entries',{configurable:true,value(){callbacks++;throw Error('own method');}});restore=()=>delete map.entries;}else if(label==='map-subclass'){class Foreign extends Map{}scope.set('',new Foreign(map));restore=()=>scope.set('',map);}else{let target=['crate','A'];if(label==='hole')target=Array(2);if(label==='same-key-count-hole'){delete target[0];target.extra='keeps count';}if(label==='getter')define(target,0,{enumerable:true,configurable:true,get(){callbacks++;throw Error('own getter');}});if(label==='hidden')define(target,'hidden',{value:true});if(label==='symbol')define(target,Symbol('extra'),{value:true});if(label==='own-iterator')define(target,Symbol.iterator,{value(){callbacks++;throw Error('own iterator');}});if(label==='proxy-target')target=proxy(target);map.set('A',target);restore=()=>map.set('A',original);}return {restore,callbacks:()=>callbacks};});equal('03-hostile-'+label,rows.expected,rows.actual,{source});assert.equal(rows.actual.changed.error.name,'TypeError');assert.equal(rows.actual.callbacks,0);assert.ok(rows.actual.restored.frame);}
 // The descriptor table must not acquire an inherited numeric value through a
 // same-key-count hole. Both complete leaf implementations use the fixed check.
 const rowA=configured(old),rowB=configured(current);let callbacks=0;const prior=ownDescriptor(Object.prototype,'0'),poison={__proto__:null,configurable:true,get(){callbacks++;throw Error('inherited index');}};
 for(const row of [rowA,rowB]){const target=['crate','A'];delete target[0];target.extra=true;row.parser.sourceNamespaceAliases.type.get('').set('A',target);}
 let expected,actual;try{define(Object.prototype,'0',poison);expected=result(old,rowA.parser);actual=result(current,rowB.parser);}finally{if(prior)define(Object.prototype,'0',prior);else delete Object.prototype[0];}equal('03-inherited-descriptor-hole',expected,actual);assert.equal(actual.error.name,'TypeError');assert.equal(callbacks,0);
});

test('metadata-compatible target descriptors still accept exactly and copied foreign frames never gain private identity',{timeout:5000},()=>{
 for(const label of ['null-prototype','frozen','nonwritable']){const rows=paired(row=>{const target=row.parser.sourceNamespaceAliases.type.get('').get('A');if(label==='null-prototype')Object.setPrototypeOf(target,null);if(label==='frozen')Object.freeze(target);if(label==='nonwritable')define(target,0,{writable:false});return {};});equal('04-compatible-'+label,rows.expected,rows.actual,{source});assert.ok(rows.actual.changed.frame);}
 for(const implementation of [old,current]){const row=configured(implementation);assert.throws(()=>configured(implementation,source,structuredClone(row.context)),/private original context/);assert.throws(()=>configured(implementation,source,implementation===old?configured(current).context:configured(old).context),/private original context/);assert.throws(()=>implementation.matchesParserFacts({...row.parser}),/private source association/);const frame=implementation.matchesParserFacts(row.parser),prior=frame.sourceLength;frame.sourceLength++;assert.throws(()=>implementation.matchesParserFacts(row.parser),/frame fields/);frame.sourceLength=prior;assert.strictEqual(implementation.matchesParserFacts(row.parser),frame);}
});

test('context and global eviction retain original full digest budgets and fresh-source guards',{timeout:15000},()=>{
 const run=implementation=>{const first=configured(implementation),before=result(implementation,first.parser),owners=[];for(let index=0;index<12;index++){const row=configured(implementation);owners.push(row);assert.ok(implementation.matchesParserFacts(row.parser));}const after=result(implementation,first.parser),map=first.parser.sourceNamespaceAliases.type.get(''),target=map.get('A'),failures=[];const cycle=[];cycle.push(cycle);for(const value of [['x'.repeat(4194305)],cycle,['crate','different']]){map.set('A',value);failures.push(result(implementation,first.parser));map.set('A',target);}const restored=result(implementation,first.parser);const text=Array.from({length:5},(_,at)=>`mod child${at}{pub struct A;}`).join(''),owner=implementation.standaloneMatchesMacroContext(text,{file:'src/lib.rs'}),contexts=[];for(let round=0;round<2;round++)for(let at=0;at<5;at++){const body='pub struct A;',offset=text.indexOf(body,text.indexOf('mod child'+at));contexts.push(result(implementation,configured(implementation,body,owner,{modulePath:['child'+at],offset}).parser));}assert.throws(()=>configured(implementation,source+' ',first.context),/source slice/);return {before,after,failures,restored,contexts};};const expected=run(old),actual=run(current);equal('05-eviction-budget-source',expected,actual,{source});assert.ok(actual.after.frame);assert.ok(actual.failures.every(row=>row.error.name==='TypeError'));assert.equal(actual.contexts.length,10);
});

function observerControls(){const mapIterator=Object.getPrototypeOf(new Map().entries()),iterator=Object.getPrototypeOf(mapIterator),arrayIterator=Object.getPrototypeOf([][Symbol.iterator]());return [
 [Map.prototype,'entries',{receiver:new Map([['probe',1]]),args:[]}],
 [mapIterator,'next',{receiver:new Map([['probe',1]]).entries(),args:[]}],
 [iterator,Symbol.iterator,{receiver:new Map().entries(),args:[]}],
 [Array.prototype,Symbol.iterator,{receiver:[1],args:[]}],
 [arrayIterator,'next',{receiver:[1][Symbol.iterator](),args:[]}],
 [Object,'getOwnPropertyDescriptor',{receiver:Object,args:[{probe:1},'probe']}],
 [Object,'getOwnPropertyDescriptors',{receiver:Object,args:[{probe:1}]}],
 [Object,'getPrototypeOf',{receiver:Object,args:[{}]}],
 [Object,'hasOwn',{receiver:Object,args:[{probe:1},'probe']}],
 [Reflect,'ownKeys',{receiver:Reflect,args:[{probe:1}]}],
 [Reflect,'apply',{receiver:Reflect,args:[function probe(){return 1;},null,[]]}],
 [Array,'isArray',{receiver:Array,args:[[]]}],
 [types,'isProxy',{receiver:types,args:[{}]}],
 [JSON,'stringify',{receiver:JSON,args:[{probe:1}]}],
 [Function.prototype,'call',{receiver:function probe(){return 1;},args:[null]}],
 [Map.prototype.entries,'call',{receiver:Map.prototype.entries,args:[new Map()]}],
 [mapIterator.next,'call',{receiver:mapIterator.next,args:[new Map().entries()]}],
 ];}

test('late collection reflection and call hooks preserve complete original callback order and full outcomes',{timeout:15000},()=>{
 const controls=observerControls();for(let at=0;at<controls.length;at++){const [owner,key,probe]=controls[at];if(!ownDescriptor(owner,key)){const prior=ownDescriptor(owner,key),native=Function.prototype.call;define(owner,key,{configurable:true,writable:true,value:native});try{const expected=observe(old,owner,key,probe),actual=observe(current,owner,key,probe);equal('06-own-hook-'+at,expected,actual,{source});assert.equal(actual.probeTape.length,1);}finally{if(prior)define(owner,key,prior);else delete owner[key];}}else{const expected=observe(old,owner,key,probe),actual=observe(current,owner,key,probe);equal('06-observer-'+at,expected,actual,{source});assert.equal(actual.probeTape.length,1);}}

 // A forwarding reflection callback can mutate the live maps while the
 // collected reference is inspecting a target. New streaming must be OFF,
 // retaining the exact old current-call result AND next-call refusal.
 const mutateDuring=implementation=>{const row=configured(implementation),map=row.parser.sourceNamespaceAliases.type.get(''),target=map.get('A'),prior=ownDescriptor(Object,'getOwnPropertyDescriptors'),tape=[];let changed=false,first,second;try{define(Object,'getOwnPropertyDescriptors',{...prior,value(value){const descriptors=apply(prior.value,this,[value]);tape[tape.length]=value===target?'target':'other';if(value===target&&!changed){changed=true;map.set('late_binding',['crate','late_binding']);}return descriptors;}});first=result(implementation,row.parser);second=result(implementation,row.parser);}finally{define(Object,'getOwnPropertyDescriptors',prior);}return {changed,tape,first,second};};const expected=mutateDuring(old),actual=mutateDuring(current);equal('06-in-call-target-mutation',expected,actual,{source});assert.equal(actual.changed,true);assert.equal(actual.second.error.name,'TypeError');
});

test('serializer String crypto and inherited serialization effects retain exact original call bytes and positions',{timeout:15000},()=>{
 for(const owner of [Object.prototype,Array.prototype]){const run=implementation=>{const row=configured(implementation),prior=ownDescriptor(owner,'toJSON'),tape=[];let outcome;try{define(owner,'toJSON',{configurable:true,get(){tape[tape.length]='get';return function(key){tape[tape.length]=['call',key];return this;};}});outcome=result(implementation,row.parser);}finally{if(prior)define(owner,'toJSON',prior);else delete owner.toJSON;}return {tape,outcome};};const expected=run(old),actual=run(current);equal('07-toJSON-'+(owner===Object.prototype?'object':'array'),expected,actual);assert.ok(actual.tape.length>0);}
 const run=implementation=>{const row=configured(implementation),stringDescriptor=ownDescriptor(globalThis,'String'),string=String,updateDescriptor=ownDescriptor(Hash.prototype,'update'),digestDescriptor=ownDescriptor(Hash.prototype,'digest'),tape=[];let outcome;try{define(globalThis,'String',{...stringDescriptor,value:function(...args){tape[tape.length]=['String',...args];return apply(string,this,args);}});define(Hash.prototype,'update',{...updateDescriptor,value(...args){tape[tape.length]=['update',...args];return apply(updateDescriptor.value,this,args);}});define(Hash.prototype,'digest',{...digestDescriptor,value(...args){const value=apply(digestDescriptor.value,this,args);tape[tape.length]=['digest',...args,value];return value;}});const target=row.parser.sourceNamespaceAliases.type.get('').get('A');Object.setPrototypeOf(target,null);outcome=result(implementation,row.parser);}finally{define(globalThis,'String',stringDescriptor);define(Hash.prototype,'update',updateDescriptor);define(Hash.prototype,'digest',digestDescriptor);}return {tape,outcome};};const expected=run(old),actual=run(current);equal('07-full-string-crypto-order',expected,actual,{source});assert.ok(actual.tape.some(row=>row[0]==='update'));assert.ok(actual.outcome.frame);
});

// Fresh children intentionally initialize the SAME common qualifier and private
// source issuers before installing cold-leaf observers, matching its documented
// boundary. The shared iterator-wrapper counterexample additionally starts its
// wrapper BEFORE issuer initialization, because its initial purity was missing.
function child(implementation,mode){const code=`
import {readFileSync} from 'node:fs';
const json=JSON.stringify,apply=Reflect.apply,descriptor=Object.getOwnPropertyDescriptor,define=Object.defineProperty;
const mapIterator=Object.getPrototypeOf(new Map().entries()),iterator=Object.getPrototypeOf(mapIterator),arrayIterator=Object.getPrototypeOf([][Symbol.iterator]());
const mode=${json(mode)},hook=mode.startsWith('initial-')?mode.slice(8):mode,tape=[];let owner,key,replacement;
if(hook==='iterator'||hook==='iterator-getter'){owner=iterator;key=Symbol.iterator;}
if(hook==='call'){owner=Function.prototype;key='call';}
if(hook==='apply'){owner=Reflect;key='apply';}
if(hook==='entries'){owner=Map.prototype;key='entries';}
if(hook==='next'){owner=mapIterator;key='next';}
if(hook==='descriptors'){owner=Object;key='getOwnPropertyDescriptors';}
if(hook==='wrong-entries'){owner=Map.prototype;key='entries';replacement=Set.prototype.entries;}
if(hook==='wrong-next'){owner=mapIterator;key='next';replacement=arrayIterator.next;}
const previous=descriptor(owner,key),native=previous.value,functionText=Function.prototype.toString;
const setup=()=>{if(replacement)define(owner,key,{...previous,value:replacement});else if(hook==='iterator-getter')define(owner,key,{configurable:previous.configurable,enumerable:previous.enumerable,get(){tape[tape.length]='get-iterator';return function(){tape[tape.length]='iterate';return apply(native,this,arguments);};}});else define(owner,key,{...previous,value:function(...args){const value=apply(native,this,args);if(hook==='call'||hook==='apply'){if(hook==='call'?this===functionText:args[0]===functionText)tape[tape.length]=value;}else tape[tape.length]=mode;return value;}});};
let before,HostRustParser,tokenizeRust,qualifier;
if(mode.startsWith('initial-'))setup();
({HostRustParser}=await import(${json(new URL('../extensions/host-contracts.mjs',import.meta.url).href)}));
({tokenizeRust}=await import(${json(new URL('../extensions/lexical.mjs',import.meta.url).href)}));
qualifier=await import(${json(new URL('../original-json-intrinsics.mjs',import.meta.url).href)});
if(!mode.startsWith('initial-')){before=qualifier.originalNamespaceTraversalIntrinsicsUnchanged();setup();}
let outcome,eligible,probeTape;
try{
 tape.length=0;
 if(!replacement){if(hook==='call')apply(owner[key],functionText,[function probe(){}]);else if(hook==='apply')owner[key](functionText,function probe(){},[]);else if(hook==='descriptors')owner[key]({probe:1});else if(hook==='entries')apply(owner[key],new Map([['probe',1]]),[]);else if(hook==='next')apply(owner[key],new Map().entries(),[]);else [...new Map().entries()];probeTape=tape.slice();tape.length=0;}
 eligible=qualifier.originalNamespaceTraversalIntrinsicsUnchanged();
 const implementation=await import(${json(implementation)}),text=${json(source)},context=implementation.standaloneMatchesMacroContext(text,{file:'src/lib.rs'}),parser=new HostRustParser(tokenizeRust(text));implementation.configureMatchesMacroParser(parser,context,{file:'src/lib.rs'});outcome={context,frame:implementation.matchesParserFacts(parser)};
}catch(error){outcome={error:{name:error.name,message:error.message}};}finally{define(owner,key,previous);}
process.stdout.write(json({engine:process.versions,before,eligible,probeTape,tape,outcome}));`;
 const stdout=execFileSync(process.execPath,['--input-type=module','--eval',code],{encoding:'utf8',timeout:12000,maxBuffer:16*1024*1024});return {code,result:JSON.parse(stdout)};}

test('cold leaves under preinstalled hooks retain complete reference results and callback tapes',{timeout:60000},()=>{
 for(const mode of ['call','apply','entries','next','descriptors','wrong-entries','wrong-next']){const expected=child(pathToFileURL(originalPath).href,mode),actual=child(pathToFileURL(currentPath).href,mode);equal('08-cold-'+mode,expected.result,actual.result,{expectedChild:expected.code,actualChild:actual.code});assert.equal(actual.result.before,true);assert.equal(actual.result.eligible,false);if(!mode.startsWith('wrong-'))assert.ok(actual.result.probeTape.length>0);}
});

test('pre-import shared iterator callback and accessor force legacy collection with original complete callback positions',{timeout:30000},()=>{
 for(const mode of ['initial-iterator','initial-iterator-getter','initial-call','initial-apply','initial-entries','initial-next','initial-descriptors']){const expected=child(pathToFileURL(originalPath).href,mode),actual=child(pathToFileURL(currentPath).href,mode);equal('09-original-preimport-'+mode,expected.result,actual.result,{expectedChild:expected.code,actualChild:actual.code});assert.equal(actual.result.eligible,false);assert.ok(actual.result.probeTape.length>0);if(!mode.endsWith('call')&&!mode.endsWith('apply'))assert.ok(actual.result.tape.length>0);assert.ok(actual.result.outcome.frame);}
});
