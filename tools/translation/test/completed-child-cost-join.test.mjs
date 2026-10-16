import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync,realpathSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import {verifyTypedTargets} from './typed-targets.mjs';
import {translateProject} from '../project.mjs';
import {runReferenceProof,compareReferenceProofFiles,withReferenceProof} from './report-reference-transport.mjs';

const json=JSON.stringify,text=Function.prototype.toString,apply=Reflect.apply;
const hash=value=>createHash('sha256').update(value).digest('hex');
const origin=new URL('../private-data-freeze.mjs',import.meta.url),common=new URL('../original-json-intrinsics.mjs',import.meta.url).href;
const root=new URL('../../../',import.meta.url),fixture=new URL('./fixtures/completed-child-cost-join/',import.meta.url);
const manifest=JSON.parse(readFileSync(new URL('manifest.json',fixture),'utf8'));
const directory=realpathSync(mkdtempSync(join(tmpdir(),'router-completed-children-'))),relocations=[],originals=new Map();
after(()=>rmSync(directory,{recursive:true,force:true}));
for(const row of manifest.sources){const raw=readFileSync(new URL(row.storedPath,fixture));assert.equal(raw.length,row.bytes);assert.equal(hash(raw),row.sha256);originals.set(row.path,raw.toString('utf8'));}
const output=process.env.ROUTER_COMPLETED_CHILD_COST_VECTOR_DIR||directory;
mkdirSync(output,{recursive:true});
function retain(name,value){writeFileSync(join(output,name+'.json.gz'),gzipSync(json(value)+String.fromCharCode(10)),{flag:'wx'});}
const probe=String.fromCharCode(10)+'export {plan as planForObservation};export const completedPlanForObservation=value=>plan(value,lookup);'+String.fromCharCode(10);
function copied(source,label){
 const changes=[];
 const relocated=source.replace(/\bfrom (['"])(\.\.?\/[^'"]+)\1/g,(before,quote,path)=>{const after='from '+quote+new URL(path,origin).href+quote;changes.push({before,after});return after;}).replace(/\bimport\.meta\.url\b/g,before=>{const after=json(origin.href);changes.push({before,after});return after;});
 let reversed=relocated;for(const change of [...changes].reverse()){assert.equal(reversed.split(change.after).length,2);reversed=reversed.replace(change.after,change.before);}assert.equal(reversed,source);
 const path=join(directory,label+'.mjs'),compiled=relocated+probe;writeFileSync(path,compiled,{flag:'wx'});assert.equal(readFileSync(path,'utf8'),compiled);relocations.push({label,changes,originalURL:origin.href});
 return {source,compiled,path,url:pathToFileURL(realpathSync(path)).href,probe};
}
const subjects={old:copied(originals.get('tools/translation/private-data-freeze.mjs'),'complete-before'),current:copied(readFileSync(origin,'utf8'),'complete-current')};
const legacy="const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};";

// A complete compact census: every key, own data/accessor descriptor, prototype,
// sharing edge, primitive and frozen state is retained. No JSON-expanded DAG.
function graph(root){
 const ids=new Map(),nodes=[],rows=[],symbols=new Map(),symbolRows=[];
 function symbol(value){let id=symbols.get(value);if(id===undefined){id=symbolRows.length;symbols.set(value,id);symbolRows.push([Symbol.keyFor(value)??null,value.description??null]);}return id;}
 function scalar(value){
  if(value===null)return [0];if(value===undefined)return [1];
  if(typeof value==='object'){if(!ids.has(value)){ids.set(value,nodes.length);nodes.push(value);}return [2,ids.get(value)];}
  if(typeof value==='number')return [3,Number.isNaN(value)?'NaN':value===Infinity?'+Infinity':value===-Infinity?'-Infinity':Object.is(value,-0)?'-0':value];
  if(typeof value==='boolean')return [4,value];if(typeof value==='string')return [5,value];if(typeof value==='bigint')return [6,value.toString()];if(typeof value==='symbol')return [7,symbol(value)];
  if(typeof value==='function')return [8,Function.prototype.toString.call(value)];throw Error('unhandled census scalar');
 }
 const selected=scalar(root);
 for(let at=0;at<nodes.length;at++){
  const value=nodes[at],prototype=Object.getPrototypeOf(value),kind=prototype===null?0:prototype===Object.prototype?1:prototype===Array.prototype?2:null;
  if(kind===null)throw Error('explicit prototype outside synthetic census domain');
  const fields=[];for(const key of Reflect.ownKeys(value)){const d=Object.getOwnPropertyDescriptor(value,key),flags=(d.enumerable?1:0)|(d.configurable?2:0)|(Object.hasOwn(d,'writable')&&d.writable?4:0);fields.push([typeof key==='symbol'?[7,symbol(key)]:key,flags,Object.hasOwn(d,'value')?scalar(d.value):[9,scalar(d.get),scalar(d.set)]]);}
  rows.push([at,kind,Object.isFrozen(value),fields]);
 }
 return {root:selected,nodes:rows,symbols:symbolRows};
}
function outcome(run){try{return {same:run()};}catch(error){return {error:{name:error.name,message:error.message}};}}
function chain(length,tail={v:1}){for(let at=0;at<length;at++)tail={n:tail};return tail;}
function scalarCost(value){
 const active=new Set();function visit(value){if(value===null||typeof value!=='object')return {cells:1,height:0,flags:typeof value==='bigint'||typeof value==='symbol'?2:3};if(active.has(value))return null;active.add(value);let cells=1,height=1,flags=3;
  for(const key of Reflect.ownKeys(value)){const d=Object.getOwnPropertyDescriptor(value,key);if(Array.isArray(value)&&key==='length')continue;if(typeof key!=='string'||!Object.hasOwn(d,'value')||!d.enumerable||typeof d.value==='function')return null;const cost=visit(d.value);if(!cost)return null;cells=Math.min(200001,cells+cost.cells);height=Math.max(height,cost.height+1);flags&=cost.flags;if(key==='toJSON')flags&=1;}
  active.delete(value);return {cells,height,flags};
 }return visit(value);
}
function compactPlan(plan){return plan===null?null:{root:{cells:plan.root.cells,height:plan.root.height,jsonFlags:plan.root.jsonFlags,done:plan.root.done},order:plan.order.map(row=>({cells:row.cells,height:row.height,jsonFlags:row.jsonFlags,done:row.done,keys:Reflect.ownKeys(row.value)}))};}

function scenario(kind,subject){
 const read=subject.createCompletedDataFreezer(freeze),tape=[],details={};let input,before,observed;
 if(kind==='aliases'||kind==='aliases-63'||kind==='aliases-64'){
  const child={v:1};read(child);const count=kind==='aliases'?2:Number(kind.slice(8));input=count===2?{a:child,b:child}:Object.fromEntries(Array.from({length:count},(_,at)=>['f'+at,child]));before=graph(input);const actualPlan=subject.completedPlanForObservation(input);details.privatePlan=compactPlan(actualPlan);
  const encoded=(1*200002+2)*4+3,lookups=[];const synthetic=subject.planForObservation(input,value=>{lookups.push(value===input?'root':value===child?'child':'other');return value===child?encoded:undefined;});details.pureLookupProbe={lookups,plan:compactPlan(synthetic),authority:false};
  observed=outcome(()=>read(input)===input);details.budgets=[subject.completedDataTraversalExceedsBudget(input,4),subject.completedDataTraversalExceedsBudget(input,5),subject.completedDataJsonWithinBudget(input,5,2),subject.completedDataJsonWithinBudget(input,5,1)];
 }else if(kind==='unknown-lookup-native-flag'){
  const child={v:1};read(child);input={a:child,b:child};before=graph(input);
  const prior=Object.getOwnPropertyDescriptor(Array.prototype,'pop'),apply=Reflect.apply,lookups=[];let installed=false,pops=0,selected;
  const custom=value=>{lookups.push(value===input?'root':value===child?'child':'other');if(value===child&&!installed){installed=true;Object.defineProperty(Array.prototype,'pop',{...prior,value(){pops++;return apply(prior.value,this,[]);}});}return value===child?(1*200002+2)*4+3:undefined;};
  try{selected=subject.planForObservation(input,custom,true);}finally{Object.defineProperty(Array.prototype,'pop',prior);}
  details.plan=compactPlan(selected);details.lookups=lookups;details.pops=pops;observed=outcome(()=>read(input)===input);
 }else if(kind.startsWith('mixed-')){
  const first={v:1},second={v:2};read(first);read(second);const cold={nested:{v:3}},wide=kind.startsWith('mixed-wide-'),position=kind.slice(wide?11:6);
  if(wide){const slot=position==='first'?0:position==='middle'?31:63,children=Array.from({length:64},(_,at)=>at===slot?cold:at%2?first:second);input=Object.fromEntries(children.map((value,at)=>['f'+at,value]));}
  else{input=position==='first'?{cold,first,second}:position==='middle'?{first,cold,second}:{first,second,cold};input.again=cold;}
  before=graph(input);details.privatePlan=compactPlan(subject.completedPlanForObservation(input));observed=outcome(()=>read(input)===input);
 }else if(kind==='cold'){
  input={a:{v:1},b:{v:2},c:[1,2,3]};before=graph(input);details.privatePlan=compactPlan(subject.completedPlanForObservation(input));observed=outcome(()=>read(input)===input);
 }else if(['depth-exact','depth-over','wide-depth-exact','wide-depth-over'].includes(kind)){
  const shared=chain(79);read(shared);const wide=kind.startsWith('wide-'),exact=kind.endsWith('-exact'),base=wide?Object.fromEntries(Array.from({length:64},(_,at)=>['f'+at,shared])):shared;input=chain(wide?(exact?79:80):(exact?80:81),base);before=graph(input);details.privatePlan=compactPlan(subject.completedPlanForObservation(input));observed=outcome(()=>read(input)===input);
 }else if(['cycle','local-shared','wide-cycle','wide-local-shared'].includes(kind)){
  const warm={v:1};read(warm);const cold={v:2},wide=kind.startsWith('wide-');input=wide?Object.fromEntries(Array.from({length:64},(_,at)=>['f'+at,at===31||at===63?cold:warm])):{warm,cold,again:cold};if(kind.endsWith('cycle'))cold.back=input;before=graph(input);details.privatePlan=compactPlan(subject.completedPlanForObservation(input));observed=outcome(()=>read(input)===input);
 }else if(kind==='flags'){
  const shared=Object.assign(Object.create(null),{u:undefined,n:null,z:-0,nan:NaN,inf:Infinity});read(shared);input={a:shared,b:shared,list:[shared,true,'Ω😀']};before=graph(input);details.privatePlan=compactPlan(subject.completedPlanForObservation(input));details.independent=scalarCost(input);observed=outcome(()=>read(input)===input);details.budgets=[subject.completedDataJsonWithinBudget(input,details.independent.cells,details.independent.height),subject.completedDataJsonWithinBudget(input,details.independent.cells-1,details.independent.height)];
 }else if(kind==='bigint'||kind==='symbol'||kind==='toJSON'){
  const child=kind==='bigint'?{v:4n}:kind==='symbol'?{v:Symbol.for('child-cost')}:{toJSON:1,v:2};read(child);input={a:child,b:child};before=graph(input);details.privatePlan=compactPlan(subject.completedPlanForObservation(input));details.independent=scalarCost(input);observed=outcome(()=>read(input)===input);details.jsonEligible=subject.completedDataJsonWithinBudget(input,200000,160);
 }else if(kind==='saturation'){
  let child={v:1};for(let at=0;at<18;at++)child={a:child,b:child};read(child);input={a:child,b:child};before=graph(input);details.privatePlan=compactPlan(subject.completedPlanForObservation(input));observed=outcome(()=>read(input)===input);details.budgets=[subject.completedDataTraversalExceedsBudget(input,200000),subject.completedDataJsonWithinBudget(input,200000,160)];
 }else if(kind.startsWith('nodes-')){
  const count=Number(kind.slice(6));input=Array.from({length:count-1},(_,at)=>({v:at}));before=graph(input);details.privatePlan=compactPlan(subject.completedPlanForObservation(input));observed=outcome(()=>read(input)===input);
 }else if(kind.startsWith('cells-')){
  // Flat complete records hit the exact unique accounting cap, without a
  // giant argument spread, recursive JSON graph or filtered output.
  const count=Number(kind.slice(6));input={};for(let at=0;at<count-1;at++)input['f'+at]=at;before=graph(input);details.privatePlan=compactPlan(subject.completedPlanForObservation(input));observed=outcome(()=>read(input)===input);
 }else if(kind==='cohorts'){
  const large={},small={};for(let at=0;at<63;at++)large['f'+at]=at;for(let at=0;at<62;at++)small['f'+at]=at;read({large,small});read(Array.from({length:4100},(_,v)=>({v})));input={large,small,again:large};before=graph(input);details.privatePlan=compactPlan(subject.completedPlanForObservation(input));observed=outcome(()=>read(input)===input);
 }else throw Error('unknown scenario');
 return {kind,before,after:graph(input),observed,details,tape};
}

function synthetic(kind,which){
 const subject=subjects[which],code=[
  'await import('+json(common)+');',
  'const subject=await import('+json(subject.url)+');',
  legacy,
  ...[graph,outcome,chain,scalarCost,compactPlan,scenario].map(value=>apply(text,value,[])),
  'const result=scenario('+json(kind)+',subject);',
  "const {gzipSync}=await import('node:zlib');process.stdout.write(gzipSync(JSON.stringify(result)));",
 ].join(String.fromCharCode(10));
 let wire;try{wire=execFileSync(process.execPath,['--input-type=module','--eval',code],{timeout:10000,maxBuffer:65*1024*1024});}
 catch(error){retain(kind+'-'+which+'-failed-partial',{code,subject,error:{name:error.name,message:error.message,status:error.status,signal:error.signal},stdout:Buffer.from(error.stdout??[]).toString('base64'),stderr:Buffer.from(error.stderr??[]).toString('base64'),partial:true});throw error;}
 const record={kind,which,code,subject,common,wire:{bytes:wire.length,sha256:hash(wire),base64:wire.toString('base64')},limits:{childMs:10000,wireBytes:65*1024*1024,decodedBytes:64*1024*1024}};retain(kind+'-'+which+'-complete-wire',record);
 const raw=gunzipSync(wire,{maxOutputLength:64*1024*1024});writeFileSync(join(output,kind+'-'+which+'-complete-report.json'),raw,{flag:'wx'});const result=JSON.parse(raw.toString('utf8'));
 return {record,result};
}
function paired(kind){const old=synthetic(kind,'old'),current=synthetic(kind,'current');retain(kind+'-complete-pair',{old:old.record,current:current.record});assert.deepEqual(current.result.before,old.result.before);assert.deepEqual(current.result.after,old.result.after);assert.deepEqual(current.result.observed,old.result.observed);return {old:old.result,current:current.result};}

function hostileScenario(kind,subject,legacyOnly=false){
 const define=Object.defineProperty,descriptor=Object.getOwnPropertyDescriptor,apply=Reflect.apply,tape=[],read=legacyOnly?freeze:subject.createCompletedDataFreezer(freeze),warm={v:1};read(warm);let input,restore=()=>{},phase='setup';
 if(kind==='proxy'){input=new Proxy({warm},{ownKeys(target){tape.push('keys');return Reflect.ownKeys(target);},getOwnPropertyDescriptor(target,key){tape.push('descriptor:'+key);return descriptor(target,key);},get(target,key,receiver){tape.push('get:'+key);return Reflect.get(target,key,receiver);}});}
 else if(kind==='getter'){input={warm,get later(){tape.push(['getter',Object.isFrozen(warm)]);return {v:2};}};}
 else if(kind==='stack-getter'){input={warm,get stack(){tape.push(['stack-getter',Object.isFrozen(warm)]);return {v:2};}};}
 else if(kind==='last-hidden'){input={warm,cold:{v:2}};define(input,'hidden',{value:{v:3}});}
 else if(kind.startsWith('error-')){
  const prior=descriptor(Error,'prepareStackTrace'),get=descriptor(WeakMap.prototype,'get');let called=0;
  define(Error,'prepareStackTrace',{value(){tape.push(['formatter',++called,phase]);if(kind==='error-reenter'){for(let at=0;at<1100;at++)read({v:at});tape.push(['reentered',called]);}if(kind==='error-hook'||kind==='error-enumerable-hook'||kind==='error-restore')define(WeakMap.prototype,'get',{...get,value(...args){tape.push(['weak-get',args.length]);return apply(get.value,this,args);}});if(kind==='error-restore'){try{const map=new WeakMap();map.get(warm);read({inside:warm});}finally{define(WeakMap.prototype,'get',get);}for(let at=0;at<1100;at++)read({v:at});tape.push(['restored-and-reentered',called]);}return 'fixed retained formatter result';},configurable:true,writable:true});
  restore=()=>{if(prior)define(Error,'prepareStackTrace',prior);else delete Error.prepareStackTrace;define(WeakMap.prototype,'get',get);};
  const error=kind==='error-capture'?{}:new Error('retained-original');if(kind==='error-capture')Error.captureStackTrace(error);else Object.setPrototypeOf(error,Object.prototype);
  error[0]=warm;if(kind==='error-enumerable-hook')define(error,'stack',{enumerable:true});input=kind==='error-parent'||kind==='error-enumerable-hook'?error:{warm,later:{error}};
 }else if(kind==='late-guard'){
  const prior=descriptor(WeakMap.prototype,'get');define(WeakMap.prototype,'get',{...prior,value(...args){tape.push(['weak-get',args.length]);return apply(prior.value,this,args);}});restore=()=>define(WeakMap.prototype,'get',prior);input={warm,cold:{v:2}};
 }else if(kind==='mutating-getter'){
  const prior=descriptor(Object,'freeze');input={warm,get later(){tape.push(['getter',Object.isFrozen(warm)]);define(Object,'freeze',{...prior,value(value){tape.push(['freeze',value===input?'root':'child']);return apply(prior.value,Object,[value]);}});return {v:2};}};restore=()=>define(Object,'freeze',prior);
 }else throw Error('unknown hostile scenario');
 let result,rootFrozen;phase='action';try{result=outcome(()=>read(input)===input);rootFrozen=Object.isFrozen(input);}finally{restore();}
 return {kind,tape,result,rootFrozen};
}
function hostile(kind,which,legacyOnly=false){
 const label=which+(legacyOnly?'-original-legacy':''),subject=subjects[which],code=['await import('+json(common)+');','const subject=await import('+json(subject.url)+');',legacy,apply(text,outcome,[]),apply(text,hostileScenario,[]),'const result=hostileScenario('+json(kind)+',subject,'+json(legacyOnly)+');',"const {gzipSync}=await import('node:zlib');process.stdout.write(gzipSync(JSON.stringify(result)));"].join(String.fromCharCode(10));
 let wire;try{wire=execFileSync(process.execPath,['--input-type=module','--eval',code],{timeout:10000,maxBuffer:65*1024*1024});}catch(error){retain(kind+'-'+label+'-failed-hostile',{code,error:{name:error.name,message:error.message,status:error.status,signal:error.signal},stdout:Buffer.from(error.stdout??[]).toString('base64'),stderr:Buffer.from(error.stderr??[]).toString('base64')});throw error;}
 retain(kind+'-'+label+'-hostile-wire',{subject,code,wire:{bytes:wire.length,sha256:hash(wire),base64:wire.toString('base64')}});const raw=gunzipSync(wire,{maxOutputLength:64*1024*1024}),result=JSON.parse(raw.toString('utf8'));retain(kind+'-'+label+'-hostile-result',{result});return result;
}

function coldImport(key,which){
 const subject=subjects[which],code=[
  'await import('+json(common)+');',
  'const descriptor=Object.getOwnPropertyDescriptor,define=Object.defineProperty,apply=Reflect.apply,owner='+ (key==='get'?'WeakMap.prototype':'Object')+',key='+json(key)+',prior=descriptor(owner,key),tape=[];let subject;',
  "try{define(owner,key,{...prior,value(...args){tape.push({key,args:args.map(value=>typeof value==='function'?{name:value.name,text:Function.prototype.toString.call(value)}:typeof value==='object'?'object':value)});return apply(prior.value,this,args);}});subject=await import("+json(subject.url)+");}finally{define(owner,key,prior);}",
  legacy,
  'const input={child:{v:1}},read=subject.createCompletedDataFreezer(freeze),result={same:read(input)===input,rootFrozen:Object.isFrozen(input),childFrozen:Object.isFrozen(input.child)};',
  "const {gzipSync}=await import('node:zlib');process.stdout.write(gzipSync(JSON.stringify({tape,result})));",
 ].join(String.fromCharCode(10));
 let wire;try{wire=execFileSync(process.execPath,['--input-type=module','--eval',code],{timeout:10000,maxBuffer:65*1024*1024});}catch(error){retain('cold-'+key+'-'+which+'-failed',{code,error:{name:error.name,message:error.message,status:error.status,signal:error.signal},stdout:Buffer.from(error.stdout??[]).toString('base64'),stderr:Buffer.from(error.stderr??[]).toString('base64')});throw error;}
 retain('cold-'+key+'-'+which+'-complete-wire',{code,subject,wire:{bytes:wire.length,sha256:hash(wire),base64:wire.toString('base64')}});const raw=gunzipSync(wire,{maxOutputLength:64*1024*1024}),result=JSON.parse(raw.toString('utf8'));retain('cold-'+key+'-'+which+'-complete-result',{result});return result;
}

test('full before source and private completed child probe retain aliases and hand-counted costs',{timeout:60000},()=>{
 retain('00-complete-source-witnesses',{manifest,originals:[...originals],subjects,relocations,legacy,scope:'Private test-copy plan observations; no production export, proof or authority.'});
 assert.equal(subjects.old.source.includes('let allCompleted='),false);assert.equal(subjects.current.source.split('let allCompleted=').length,2);
 const {old,current}=paired('aliases');assert.equal(current.observed.same,true);assert.deepEqual(current.details.privatePlan,old.details.privatePlan);assert.deepEqual(current.details.budgets,[true,false,true,false]);assert.equal(current.details.privatePlan.root.cells,5);assert.equal(current.details.privatePlan.root.height,2);
 assert.deepEqual(current.details.pureLookupProbe.lookups,['root','child','child','child','child','root']);assert.deepEqual(old.details.pureLookupProbe.lookups,['root','child','child','child','child','root']);assert.deepEqual(current.details.pureLookupProbe.plan,old.details.pureLookupProbe.plan);
 for(const count of [63,64]){const pair=paired('aliases-'+count),expectedCells=1+2*count,oldTrace=['root',...Array(count*2).fill('child'),'root'],currentTrace=['root',...Array(count===64?count:count*2).fill('child'),'root'];assert.deepEqual(pair.current.details.privatePlan,pair.old.details.privatePlan);assert.deepEqual(pair.current.details.privatePlan.root,{cells:expectedCells,height:2,jsonFlags:3,done:true});assert.deepEqual(pair.current.details.pureLookupProbe.plan,pair.old.details.pureLookupProbe.plan);assert.deepEqual(pair.current.details.budgets,[true,true,false,false]);assert.deepEqual(pair.current.details.budgets,pair.old.details.budgets);assert.deepEqual(pair.old.details.pureLookupProbe.lookups,oldTrace);assert.deepEqual(pair.current.details.pureLookupProbe.lookups,currentTrace);assert.equal(pair.current.observed.same,true);}
});
test('every mixed cold or local child keeps complete original ordered state and whole graph outcomes',{timeout:60000},()=>{
 for(const kind of ['mixed-first','mixed-middle','mixed-last','cold','mixed-wide-first','mixed-wide-middle','mixed-wide-last']){const {old,current}=paired(kind);assert.deepEqual(current.details,old.details);assert.equal(current.observed.same,true);}
});
test('a custom lookup cannot claim a closed native segment or erase its reentrant operation callbacks',{timeout:60000},()=>{
 const {old,current}=paired('unknown-lookup-native-flag');assert.deepEqual(current.details,old.details);assert.deepEqual(current.details.lookups,['root','child','child','child','child','root']);assert.equal(current.details.pops,6);assert.equal(current.details.plan.root.cells,5);assert.equal(current.observed.same,true);
 const expected=hostile('error-restore','old'),actual=hostile('error-restore','current'),formatterObserved=expected.tape.some(row=>row[0]==='formatter');retain('error-restore-complete-hostile-pair',{expected,actual,capability:{originalFormatterObserved:formatterObserved,currentFormatterObserved:actual.tape.some(row=>row[0]==='formatter')}});assert.deepEqual(actual,expected);assert.equal(actual.result.same,true);if(formatterObserved){assert.ok(actual.tape.some(row=>row[0]==='restored-and-reentered'));assert.ok(actual.tape.some(row=>row[0]==='weak-get'));}
});
test('each cached incoming height is charged at exact depth and over-depth retains whole original fallback',{timeout:60000},()=>{
 for(const prefix of ['','wide-']){const exact=paired(prefix+'depth-exact'),over=paired(prefix+'depth-over');assert.deepEqual(exact.current.details,exact.old.details);assert.equal(exact.current.details.privatePlan.root.height,160);assert.equal(over.current.details.privatePlan,null);assert.equal(over.old.details.privatePlan,null);assert.equal(exact.current.observed.same,true);assert.equal(over.current.observed.same,true);}
});
test('cycles and invocation-local shared states preserve original refusal and exact complete data',{timeout:60000},()=>{
 for(const prefix of ['','wide-']){const cyclic=paired(prefix+'cycle');assert.equal(cyclic.current.details.privatePlan,null);assert.equal(cyclic.old.details.privatePlan,null);assert.equal(cyclic.current.observed.error.name,'RangeError');const local=paired(prefix+'local-shared');assert.deepEqual(local.current.details,local.old.details);assert.equal(local.current.observed.same,true);}
});
test('full cached scalar flags arrays null records and every alias match independent cost and eligibility calculations',{timeout:60000},()=>{
 const flags=paired('flags');assert.deepEqual(flags.current.details,flags.old.details);assert.deepEqual(flags.current.details.budgets,[true,false]);assert.deepEqual(flags.current.details.privatePlan.root,{cells:flags.current.details.independent.cells,height:flags.current.details.independent.height,jsonFlags:flags.current.details.independent.flags,done:true});
 for(const kind of ['bigint','symbol','toJSON']){const {old,current}=paired(kind);assert.deepEqual(current.details,old.details);assert.deepEqual(current.details.privatePlan.root,{cells:current.details.independent.cells,height:current.details.independent.height,jsonFlags:current.details.independent.flags,done:true});assert.equal(current.details.jsonEligible,false);}
});
test('complete saturation node cell and cohort boundaries retain every original field under bounded new report transport',{timeout:60000},()=>{
 for(const kind of ['saturation','nodes-32768','nodes-32769','cells-200000','cells-200001','cohorts']){const {old,current}=paired(kind);assert.deepEqual(current.details,old.details);assert.equal(current.observed.same,true);if(kind==='saturation'){assert.equal(current.details.privatePlan.root.cells,200001);assert.deepEqual(current.details.budgets,[true,false]);}if(kind==='nodes-32769'||kind==='cells-200001')assert.equal(current.details.privatePlan,null);}
});
test('full original callback tapes survive lazy stack parents descendants reentry native mutation and ordinary fallback',{timeout:60000},()=>{
 for(const key of ['get','getOwnPropertyDescriptor']){const expected=coldImport(key,'old'),actual=coldImport(key,'current');assert.deepEqual(actual,expected);assert.deepEqual(actual.tape,[]);assert.deepEqual(actual.result,{same:true,rootFrozen:true,childFrozen:true});}
 for(const kind of ['proxy','getter','stack-getter','last-hidden','late-guard','mutating-getter','error-parent','error-capture','error-reenter','error-hook','error-enumerable-hook']){const expected=hostile(kind,'old'),actual=hostile(kind,'current');retain(kind+'-hostile-comparison',{expected,actual});assert.deepEqual(actual,expected);assert.equal(actual.result.same,true);if(kind.startsWith('error-')){const originalLegacy=hostile(kind,'old',true);retain(kind+'-original-legacy-separate',{originalLegacy,currentBefore:expected,currentAfter:actual,scope:'Existing helper lazy-stack behavior is compared exactly; original recursive closure may differ and is preserved separately, not claimed equivalent.'});}}
});
test('actual builtin full source crypto proof reissue refusals and independent strict targets remain unchanged',{timeout:60000},async()=>{
 const cargo={manifest:readFileSync(new URL('Cargo.toml',root),'utf8'),lock:readFileSync(new URL('Cargo.lock',root),'utf8')};
 const leafOrigin=new URL('../builtin-derive-bang-footprints.mjs',import.meta.url),leafSource=readFileSync(leafOrigin,'utf8'),leaves={};
 for(const which of ['old','current']){
  const changes=[],compiled=leafSource.replace(/\bfrom (['"])(\.\.?\/[^'"]+)\1/g,(before,quote,path)=>{const actual=new URL(path,leafOrigin).href,target=actual===origin.href?subjects[which].url:actual,after='from '+quote+target+quote;changes.push({before,after});return after;}).replace(/\bimport\.meta\.url\b/g,before=>{const after=json(leafOrigin.href);changes.push({before,after});return after;});let reverse=compiled;for(const change of [...changes].reverse()){assert.equal(reverse.split(change.after).length,2);reverse=reverse.replace(change.after,change.before);}assert.equal(reverse,leafSource);const path=join(directory,'builtin-'+which+'.mjs');writeFileSync(path,compiled,{flag:'wx'});leaves[which]={path,url:pathToFileURL(realpathSync(path)).href,compiled,changes};
 }
 retain('08-complete-builtin-provenance',{subjects,leafOrigin:leafOrigin.href,leafSource,leaves,cargo,transport:readFileSync(new URL('./report-reference-transport.mjs',import.meta.url),'utf8'),indexedTransport:readFileSync(new URL('./report-reference-file-cursor.mjs',import.meta.url),'utf8')});
 function child(which){
  const imports={capture:new URL('../source-module-views.mjs',import.meta.url).href,dependencies:new URL('../derive-dependencies.mjs',import.meta.url).href,context:new URL('../derive-footprints.mjs',import.meta.url).href,profile:new URL('../cfg-profile.mjs',import.meta.url).href,active:leafOrigin.href,transport:new URL('./report-reference-transport.mjs',import.meta.url).href};
  const code=`import {Hash} from 'node:crypto';import {captureSourceModuleViews} from ${json(imports.capture)};import {loadDeriveDependencyProof} from ${json(imports.dependencies)};import {createDeriveFootprintContext} from ${json(imports.context)};import {PRODUCTION_PROFILE} from ${json(imports.profile)};import {writeReferenceProofReport} from ${json(imports.transport)};await import(${json(common)});await import(${json(imports.active)});const implementation=await import(${json(leaves[which].url)}),cargo=${json(cargo)},source='#[derive(Copy,Clone,Debug,PartialEq,Eq,Hash,Default)]pub struct Payload{value:u8}',dependencies=loadDeriveDependencyProof(cargo),capture=captureSourceModuleViews({source,sourcePath:'src/lib.rs',compilationProfile:PRODUCTION_PROFILE}),modules=capture.views.map(sourceView=>({file:'src/lib.rs',path:[...sourceView.modulePath],source,sourceView,compilationProfile:sourceView.compilationProfile,configurationCondition:sourceView.configurationCondition})),context=createDeriveFootprintContext({modules,dependencies,compilationProfile:PRODUCTION_PROFILE}),certificate=context.certificates.find(row=>row.name==='Payload'),attribute=certificate.attributes.find(row=>row.derives?.some(path=>path.join('::')==='Copy')),invocation={path:['Copy'],attributeSpan:attribute.span},input={context,certificate,invocation},outcome=${apply(text,outcome,[])},prior=Object.getOwnPropertyDescriptor(Hash.prototype,'update'),tape=[];let first,second,reissued;try{Object.defineProperty(Hash.prototype,'update',{...prior,value(value,...args){tape.push({bytes:Buffer.from(value,typeof args[0]==='string'?args[0]:undefined).toString('base64'),encoding:args[0]??null});return Reflect.apply(prior.value,this,[value,...args]);}});first=implementation.proveBuiltinDeriveBangFootprint(input);second=implementation.proveBuiltinDeriveBangFootprint(input);reissued=implementation.originalBuiltinDeriveEnclosingOutput(first,context,certificate,invocation);}finally{Object.defineProperty(Hash.prototype,'update',prior);}const copied=outcome(()=>implementation.assertBuiltinDeriveBangFootprint(structuredClone(first),context,certificate,invocation)),foreign=outcome(()=>implementation.proveBuiltinDeriveBangFootprint({...input,certificate:structuredClone(certificate)}));writeReferenceProofReport({input,first,second,reissued,tape,copied,foreign},{canonicalJson:true});`;
  return runReferenceProof({name:'08-complete-builtin-'+which,code,execPath:process.execPath,directory:output,provenance:{imports,subject:subjects[which],leaf:leaves[which],cargo}});
 }
 const expected=child('old'),actual=child('current'),comparison=compareReferenceProofFiles(expected,actual);retain('08-complete-proof-comparison',{expected,actual,comparison});assert.equal(comparison.equal,true);withReferenceProof(actual,view=>{assert.ok(view.arrayLength('tape')>0);assert.ok(view.has('copied','error'));assert.ok(view.has('foreign','error'));assert.equal(view.read('first','generatedImplBehavior'),false);},{canonicalJson:true});
 const source='pub fn accept(value:u8)->bool{value>0}',translation=translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source}),targets=[];retain('08-complete-translation',{source,translation});try{await verifyTypedTargets(translation,api=>{const value=[api.accept(0n),api.accept(1n),api.accept(255n)];assert.deepEqual(value,[false,true,true]);targets.push(value);},{childTimeoutMs:20000});}finally{retain('08-strict-target-results',{targets});}assert.equal(targets.length,2);
});
