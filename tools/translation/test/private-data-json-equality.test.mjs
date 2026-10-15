import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {types} from 'node:util';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync,realpathSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {packReport} from './report-reference-transport.mjs';
import {privateDataJsonEquality,samePrivateDataJson,privateDataJsonFieldEquality,privateDataJsonEqualityFacts} from '../private-data-json-equality.mjs';

const temporary=realpathSync(mkdtempSync(join(tmpdir(),'router-json-equality-'))),directory=process.env.ROUTER_DATA_JSON_EQUALITY_VECTOR_DIR||temporary;
mkdirSync(directory,{recursive:true});after(()=>rmSync(temporary,{recursive:true,force:true}));
const sourceURL=new URL('../private-data-json-equality.mjs',import.meta.url),source=readFileSync(sourceURL,'utf8'),text=Function.prototype.toString,apply=Reflect.apply,descriptor=Object.getOwnPropertyDescriptor,define=Object.defineProperty;
function retain(name,value){writeFileSync(join(directory,name+'.reference.json'),JSON.stringify(packReport(value)),{flag:'wx'});}
const errorOf=action=>{try{return {value:action()};}catch(error){return {error:{name:error.name,message:error.message,stack:error.stack??null}};}};
const comparable=outcome=>outcome.error?{error:{name:outcome.error.name,message:outcome.error.message}}:{value:outcome.value};
const baseline=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const current=(a,b)=>samePrivateDataJson(a,b)||JSON.stringify(a)===JSON.stringify(b);
function freezeAuthoredData(value,seen=new Set()){if(value&&typeof value==='object'&&!seen.has(value)){seen.add(value);for(const child of Object.values(value))freezeAuthoredData(child,seen);Object.freeze(value);}return value;}
function pair(label,a,b,{positive=null,freeze=true}={}){
 if(freeze){freezeAuthoredData(a);freezeAuthoredData(b);}
 const expected=errorOf(()=>baseline(a,b)),fast=errorOf(()=>privateDataJsonEquality(a,b)),actual=errorOf(()=>current(a,b)),encoded=errorOf(()=>JSON.stringify(a));
 retain(label,{a,b,expected,fast,actual,encoded,facts:privateDataJsonEqualityFacts()});
 assert.deepEqual(comparable(actual),comparable(expected));assert.equal(fast.error,undefined);
 if(positive!==null)assert.equal(fast.value!==null,positive);
 if(fast.value){assert.equal(expected.value,true);assert.equal(fast.value.logicalJsonCodeUnits,encoded.value===undefined?0:encoded.value.length);assert.equal(fast.value.serialized,encoded.value!==undefined);}
 return {expected,fast,actual,encoded};
}
retain('00-complete-test-and-helper-sources',{sourceURL:sourceURL.href,source,test:readFileSync(new URL('./private-data-json-equality.test.mjs',import.meta.url),'utf8'),baseline:apply(text,baseline,[]),current:apply(text,current,[])});

test('qualified ordinary data matches independent complete native JSON including IEEE UTF16 escaping and omitted properties',{timeout:60000},()=>{
 assert.equal(privateDataJsonEqualityFacts().available,true);
 const record=Object.assign(Object.create(null),{text:'Ω😀\ud800\udfff\u0000\b\t\n\f\r"\\',missing:undefined,values:[undefined,null,true,false,0,-0,NaN,Infinity,-Infinity,Number.MIN_VALUE,Number.MAX_VALUE,1e-7,1e21]});
 pair('01-complete-record',record,structuredClone(record),{positive:true});
 for(const [index,value]of [null,undefined,true,false,0,-0,NaN,Infinity,-Infinity,1.2345678901234567e-27,'','\ud800','😀'].entries())pair('01-scalar-'+index,value,value,{positive:true});
 const a={first:1,second:{list:[2,undefined]}},b=structuredClone(a);pair('01-mutable-first',a,b,{positive:false,freeze:false});a.second.list[0]=9;pair('01-mutable-changed',a,b,{positive:false,freeze:false});b.second.list[0]=9;pair('01-mutable-restored',a,b,{positive:false,freeze:false});
 const partlyFrozen=Object.freeze({child:{value:1}});pair('01-frozen-root-mutable-child',partlyFrozen,partlyFrozen,{positive:false,freeze:false});
 const hostResult=privateDataJsonEquality(process.env,process.env);retain('01-native-host-data-deferred',{hostKind:'Node process.env native interceptor',hostResult,environmentValuesReadOrWritten:false});assert.equal(hostResult,null);
});

test('key order dense arrays and conservative unequal-but-JSON-equivalent shapes retain the native fallback',{timeout:60000},()=>{
 for(const [index,a,b]of [[0,{a:1,b:2},{b:2,a:1}],[1,{missing:undefined},{}],[2,-0,0],[3,NaN,Infinity],[4,[undefined],[null]],[5,[1],{0:1}],[6,{a:1},{a:2}]])pair('02-different-'+index,a,b,{positive:false});
 const a={};a[10]='ten';a[2]='two';a.later='last';const b={2:'two',10:'ten',later:'last'};pair('02-native-numeric-order',a,b,{positive:true});
 const left=Object.assign(Object.create(null),{same:[1,2]}),right={same:[1,2]};pair('02-null-versus-ordinary-prototype',left,right,{positive:true});
 const accessor={};let calls=0;define(accessor,'items',{enumerable:true,get(){calls++;return [1];}});Object.freeze(accessor);const other=freezeAuthoredData({items:[1]}),before=calls,fast=privateDataJsonFieldEquality(accessor,other,'items');retain('02-field-ingress-accessor',{fast,before,after:calls,descriptor:{enumerable:true,get:apply(text,descriptor(accessor,'items').get,[])}});assert.equal(fast,null);assert.equal(calls,before);
 const simple=freezeAuthoredData({items:[1,undefined]}),copy=freezeAuthoredData(structuredClone(simple)),match=privateDataJsonFieldEquality(simple,copy,'items');retain('02-genuine-data-field',{simple,copy,match});assert.ok(match);assert.equal(match.operand,copy.items);assert.equal(match.logicalJsonCodeUnits,JSON.stringify(copy.items).length);
});

test('asymmetric sharing same identity and cached relative heights preserve exact expanded JSON sizes',{timeout:60000},()=>{
 const shared={value:'source',list:[1,null]},a={one:shared,two:shared},b={one:structuredClone(shared),two:structuredClone(shared)};pair('03-asymmetric-sharing',a,b,{positive:true});pair('03-same-identity',a,a,{positive:true});
 const wrap=(value,count)=>{for(let at=0;at<count;at++)value={child:value};return value;};
 pair('03-depth160',wrap({},159),wrap({},159),{positive:true});pair('03-depth161',wrap({},160),wrap({},160),{positive:false});
 const child=wrap({value:1},20),left={first:child,second:wrap(child,141)},right=structuredClone(left);pair('03-cached-incoming-depth',left,right,{positive:false});
 let x={value:'leaf'},y={value:'leaf'};for(let at=0;at<14;at++){x={left:x,right:x};y={left:y,right:y};}pair('03-logical-tree-expansion',x,y,{positive:true});
 const cycle={};cycle.self=cycle;pair('03-same-identity-cycle',cycle,cycle,{positive:false});
});

test('callback foreign exotic and unsupported scalar inputs preserve complete original serializer outcomes',{timeout:60000},()=>{
 const observations=[];
 function run(label,read){
  let tape='';const callback=message=>{tape+=message+';';};let a,b;
  if(label==='getter'){a={get value(){callback('left get');return 1;}};b={get value(){callback('right get');return 1;}};}
  else if(label==='toJSON'){a={toJSON(){callback('left toJSON');return {value:1};}};b={toJSON(){callback('right toJSON');return {value:1};}};}
  else if(label==='same-toJSON'){a={toJSON(){callback('same toJSON');return tape;}};b=a;}
  else if(label==='proxy'){const proxy=(side)=>new Proxy({value:1},{ownKeys(target){callback(side+' keys');return Reflect.ownKeys(target);},getOwnPropertyDescriptor(target,key){callback(side+' descriptor '+String(key));return descriptor(target,key);},get(target,key,receiver){callback(side+' get '+String(key));return Reflect.get(target,key,receiver);}});a=proxy('left');b=proxy('right');}
  else if(label==='BigInt'){a={value:1n};b={value:1n};}
  else if(label==='symbol'){a={value:Symbol('source')};b={value:Symbol('source')};}
  else if(label==='function'){a={value:function kept(){}};b={value:function kept(){}};}
  else if(label==='hole'){a=Array(2);b=[null,null];}
  else if(label==='extra'){a=Object.assign([1],{extra:'ignored'});b=[1];}
  else if(label==='hidden'){a=define({value:1},'hidden',{value:2});b={value:1};}
  else if(label==='Date'){a=new Date(0);b=new Date(0);}
  if(label!=='proxy'){Object.freeze(a);Object.freeze(b);}
  const result=errorOf(()=>read(a,b));return {label,tape,result};
 }
 for(const label of ['getter','toJSON','same-toJSON','proxy','BigInt','symbol','function','hole','extra','hidden','Date']){const expected=run(label,baseline),actual=run(label,current);observations.push({label,expected,actual});}
 const exotic=[];for(const parent of [null,Object.prototype]){const error=new Error('original error'),buffer=new SharedArrayBuffer(4),view=new Uint8Array(buffer);view[0]=7;Object.setPrototypeOf(error,parent);Object.setPrototypeOf(view,parent);const previous=descriptor(Error,'prepareStackTrace');let calls=0,probe;try{define(Error,'prepareStackTrace',{configurable:true,value(){calls++;return 'formatted original stack';}});probe={error:privateDataJsonEquality(error,error),view:privateDataJsonEquality(view,view),calls};}finally{if(previous)define(Error,'prepareStackTrace',previous);else delete Error.prepareStackTrace;}exotic.push({prototype:parent===null?'null':'Object.prototype',probe,viewBytes:[...new Uint8Array(buffer)],errorMessage:'original error'});}
 const boxed=[];for(const parent of [null,Object.prototype])for(const primitive of [2,true,3n,'source',Symbol('boxed source')]){const value=Object(primitive);Object.setPrototypeOf(value,parent);Object.freeze(value);const other=Object.freeze({}),expected=errorOf(()=>baseline(value,other)),fast=privateDataJsonEquality(value,other),actual=errorOf(()=>current(value,other));boxed.push({prototype:parent===null?'null':'Object.prototype',primitive:typeof primitive==='symbol'?{type:'symbol',description:primitive.description}:primitive,expected,fast,actual});}
 retain('04-complete-callback-and-exotic-controls',{observations,exotic,boxed,fixtureFactory:apply(text,run,[])});
 for(const row of observations){assert.equal(row.actual.tape,row.expected.tape,row.label);assert.deepEqual(comparable(row.actual.result),comparable(row.expected.result),row.label);}
 for(const row of exotic){assert.equal(row.probe.error,null);assert.equal(row.probe.view,null);assert.equal(row.probe.calls,0);}
 for(const row of boxed){assert.equal(row.fast,null);assert.deepEqual(comparable(row.actual),comparable(row.expected));}
});

test('all late native and brand changes defer with exact original callback tapes and operand evaluation order',{timeout:60000},()=>{
 const observations=[],subjects=[[Object,'getOwnPropertyDescriptor'],[Object,'getPrototypeOf'],[Reflect,'ownKeys'],[Map.prototype,'get'],[Set.prototype,'has'],[JSON,'stringify'],[String.prototype,'charCodeAt'],[types,'isNativeError'],[types,'isBoxedPrimitive'],[ArrayBuffer,'isView']];
 for(const [owner,key]of subjects){const previous=descriptor(owner,key);function run(read){const left=freezeAuthoredData({value:'Ω😀',array:[1]}),right=freezeAuthoredData({value:'Ω😀',array:[1]});let tape='',result;try{define(owner,key,{...previous,value:function(...args){tape+=key+';';return apply(previous.value,this,args);}});result=errorOf(()=>read(left,right));}finally{define(owner,key,previous);}return {tape,result};}const expected=run(baseline),actual=run(current);observations.push({key,expected,actual});}
 let calls=0;const previous=descriptor(Object.prototype,'0');let expected,actual;try{define(Object.prototype,'0',{configurable:true,get(){calls++;throw Error('numeric scratch read');},set(){calls++;throw Error('numeric scratch write');}});expected=errorOf(()=>baseline({x:1},{x:1}));actual=errorOf(()=>current({x:1},{x:1}));}finally{if(previous)define(Object.prototype,'0',previous);else delete Object.prototype[0];}
 const order=[];function fields(useFast){let tape='';const left={get items(){tape+='left field;';return {toJSON(){tape+='left JSON;';return 1;}};}},right={get items(){tape+='right field;';return 1;}};const result=errorOf(()=>{const fast=useFast?privateDataJsonFieldEquality(left,right,'items'):null;return fast!==null||JSON.stringify(left.items)===JSON.stringify(right.items);});return {tape,result};}order.push({expected:fields(false),actual:fields(true)});
 retain('05-complete-native-and-order-controls',{observations,numeric:{calls,expected,actual},order});for(const row of observations){assert.equal(row.actual.tape,row.expected.tape,row.key);assert.deepEqual(comparable(row.actual.result),comparable(row.expected.result),row.key);}assert.equal(calls,0);assert.deepEqual(comparable(actual),comparable(expected));assert.equal(order[0].actual.tape,order[0].expected.tape);assert.equal(order[0].actual.tape,'left field;left JSON;right field;');
});

test('physically fresh poisoned issuer stays disabled and genuine cyclic ESM TDZ namespaces reach the original expression',{timeout:60000},async()=>{
 const changes=[];let copied=source;const matches=[...source.matchAll(/^import\b[^\n]*?\bfrom\s+(['"])([^'"\n]+)\1;/gmu)];assert.equal(matches.length,[...source.matchAll(/^import\b/gmu)].length);
 for(const match of matches){if(!match[2].startsWith('.'))continue;const original=match[1]+match[2]+match[1],start=match.index+match[0].lastIndexOf(original);changes.push({start,end:start+original.length,original,replacement:JSON.stringify(new URL(match[2],sourceURL).href)});}for(const change of [...changes].reverse())copied=copied.slice(0,change.start)+change.replacement+copied.slice(change.end);let rebuilt=copied,delta=0;const relocations=[];for(const change of changes){relocations.push({...change,copiedStart:change.start+delta,copiedEnd:change.start+delta+change.replacement.length});delta+=change.replacement.length-change.original.length;}for(const change of [...relocations].reverse())rebuilt=rebuilt.slice(0,change.copiedStart)+change.original+rebuilt.slice(change.copiedEnd);assert.equal(rebuilt,source);assert.equal(source.includes('import.meta.url'),false);
 const path=join(temporary,'cold-equality.mjs');writeFileSync(path,copied,{flag:'wx'});retain('06-complete-cold-source-before-import',{source,copied,relocations,path,commonIssuersPreinitialized:true});const previous=descriptor(types,'isNativeError');let calls=0,cold;try{define(types,'isNativeError',{...previous,value(){calls++;throw Error('cold brand callback');}});cold=await import(pathToFileURL(path).href);}finally{define(types,'isNativeError',previous);}const coldFacts=cold.privateDataJsonEqualityFacts(),coldResult=cold.privateDataJsonEquality({x:1},{x:1});retain('06-complete-sticky-cold-outcome',{calls,coldFacts,coldResult});assert.equal(calls,0);assert.equal(coldFacts.available,false);assert.equal(coldResult,null);
 const slot='__router_json_equality_tdz_probe_000257',a=join(temporary,'cycle-a.mjs'),b=join(temporary,'cycle-b.mjs'),observations=[];const aSource="import './cycle-b.mjs'; export let pending=1;",bSource="import * as namespace from './cycle-a.mjs'; globalThis["+JSON.stringify(slot)+"](namespace);";
 assert.equal(Object.hasOwn(globalThis,slot),false);globalThis[slot]=namespace=>{const fast=errorOf(()=>privateDataJsonEquality(namespace,namespace));function run(useFast){let tape='';const serialize=value=>{tape+='operand;';return JSON.stringify(value);};const result=errorOf(()=>useFast?(samePrivateDataJson(namespace,namespace)||serialize(namespace)===serialize(namespace)):(serialize(namespace)===serialize(namespace)));return {tape,result};}observations.push({fast,expected:run(false),actual:run(true)});};writeFileSync(a,aSource,{flag:'wx'});writeFileSync(b,bSource,{flag:'wx'});retain('06-complete-TDZ-inputs-before-import',{slot,a,b,aSource,bSource});try{await import(pathToFileURL(a).href);}finally{delete globalThis[slot];}retain('06-complete-TDZ-outcomes',observations);assert.equal(observations.length,1);const row=observations[0];assert.equal(row.fast.value,null);assert.equal(row.fast.error,undefined);assert.equal(row.expected.result.error?.name,'ReferenceError');assert.deepEqual(comparable(row.actual.result),comparable(row.expected.result));assert.equal(row.actual.tape,row.expected.tape);assert.equal(row.actual.tape,'operand;');
});

test('unique pair descriptor string and logical expansion bounds decline without widening existing serializer limits',{timeout:60000},()=>{
 const boundary=Array(199998).fill(0),over=Array(199999).fill(0);pair('07-exact-unique-cell-boundary',boundary,boundary,{positive:true});pair('07-over-unique-cell-boundary',over,over,{positive:false});
 const objects=Array.from({length:32767},(_,at)=>({at}));pair('07-exact-pair-boundary',objects,objects,{positive:true});const more=[...objects,{at:32767}];pair('07-over-pair-boundary',more,more,{positive:false});
 const long='x'.repeat(8388609);pair('07-over-string-budget',long,long,{positive:false});
 let huge={text:'x'.repeat(1024)};for(let at=0;at<20;at++)huge={left:huge,right:huge};freezeAuthoredData(huge);const before=privateDataJsonEqualityFacts(),fast=privateDataJsonEquality(huge,huge),after=privateDataJsonEqualityFacts();retain('07-complete-overexpanded-input-and-refusal',{huge,before,fast,after,scope:'The fast check declines before a native serializer allocation. No native outcome is inferred for this over-limit expansion.'});assert.equal(fast,null);assert.ok(after.deferrals>before.deferrals);assert.equal(after.limits.logicalJsonCodeUnits,67108864);
});

test('complete original source operands and deterministic independent JSON corpus preserve exact native results and lengths',{timeout:60000},()=>{
 const root=new URL('../../../',import.meta.url),originals=['Cargo.toml','Cargo.lock','src/lib.rs'].map(path=>({path,source:readFileSync(new URL(path,root),'utf8')}));pair('08-entire-original-source-records',originals,structuredClone(originals),{positive:true});
 let seed=759;const next=()=>{seed=(seed*1664525+1013904223)>>>0;return seed;},observations=[];
 for(let at=0;at<256;at++){const scalar=[null,undefined,true,false,-0,NaN,Infinity,-Infinity,1e-23,'Ω😀\ud800','"\n\\'][next()%11],left={index:at,scalar,values:[scalar,next()/4294967296],nested:{key:'original-'+next()}},right=structuredClone(left);if(at%3===1)right.nested.key+=' changed';if(at%3===2){delete right.index;right.index=at;}freezeAuthoredData(left);freezeAuthoredData(right);const expected=baseline(left,right),fast=privateDataJsonEquality(left,right),actual=current(left,right),encoded=JSON.stringify(left);observations.push({left,right,expected,fast,actual,encoded});}
 retain('08-complete-corpus-before-assertions',{originals,initialSeed:759,observations,finalSeed:seed,facts:privateDataJsonEqualityFacts(),translationAuthority:false});for(const row of observations){assert.equal(row.actual,row.expected);if(row.fast){assert.equal(row.expected,true);assert.equal(row.fast.logicalJsonCodeUnits,row.encoded.length);}}
});
