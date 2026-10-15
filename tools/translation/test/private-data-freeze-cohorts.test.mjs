import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync,realpathSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';

const json=JSON.stringify,text=Function.prototype.toString,apply=Reflect.apply,hash=value=>createHash('sha256').update(value).digest('hex');
const origin=new URL('../private-data-freeze.mjs',import.meta.url),common=new URL('../original-json-intrinsics.mjs',import.meta.url).href,fixture=new URL('./fixtures/private-data-freeze-cohorts/',import.meta.url),manifest=JSON.parse(readFileSync(new URL('manifest.json',fixture),'utf8'));
const directory=mkdtempSync(join(tmpdir(),'router-freeze-cohorts-'));after(()=>rmSync(directory,{recursive:true,force:true}));
const originals=new Map(),relocations=[];for(const row of manifest.sources){const bytes=readFileSync(new URL(row.storedPath,fixture));assert.equal(bytes.length,row.bytes);assert.equal(hash(bytes),row.sha256);originals.set(row.path,bytes.toString('utf8'));}
const extra=String.fromCharCode(10)+'export {plan as planForObservation};'+String.fromCharCode(10);
function copied(source,label){const path=join(directory,label+'.mjs'),relocated=source.replace(/\bfrom (['"])(\.\.?\/[^'"]+)\1/g,(_match,quote,path)=>{const target=new URL(path,origin).href;relocations.push({label,path,target});return 'from '+quote+target+quote;}).replace(/\bimport\.meta\.url\b/g,()=>{relocations.push({label,kind:'original-module-url',target:origin.href});return json(origin.href);}),copiedSource=relocated+extra;writeFileSync(path,copiedSource);return {source,copiedSource,path,url:pathToFileURL(realpathSync(path)).href,extra};}
const subjects={old:copied(originals.get('tools/translation/private-data-freeze.mjs'),'complete-233'),current:copied(readFileSync(origin,'utf8'),'complete-current')};
const legacy="const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};";
function retain(name,value){const directory=process.env.ROUTER_FREEZE_COHORT_VECTOR_DIR;if(directory){mkdirSync(directory,{recursive:true});writeFileSync(join(directory,name+'.json.gz'),gzipSync(json(value)+String.fromCharCode(10)),{flag:'wx'});}}

function scenario(mode,read){
 const sized=(cells,label)=>{const value={};for(let at=0;at<cells-1;at++)value['field'+at]=label+':'+at;return value;};
 const smallChurn=()=>Array.from({length:5000},(_,at)=>({index:at}));
 if(mode==='root-small'){
  const protectedRoot={stable:{value:7},label:'Ω😀'};read(protectedRoot);const churn=smallChurn();read(churn);
  return {inputs:{protectedRoot,churn},expected:[protectedRoot],action:()=>({protectedRoot:read(protectedRoot)})};
 }
 if(mode==='large-small-root'){
  const large=sized(64,'large'),small=sized(63,'small'),holder={large,small};read(holder);const churn=smallChurn();read(churn);const roots=[];
  for(let at=0;at<1100;at++){const root={step:at};roots.push(root);read(root);}
  return {inputs:{large,small,holder,churn,roots},expected:[large,small],action:()=>({large:read(large),small:read(small)})};
 }
 if(mode==='large-rotation-depth'){
  const protectedRoot={stable:{value:'root'}},large=sized(64,'evicted-large'),holder={large};read(protectedRoot);read(holder);read(large);
  const churn=Array.from({length:2050},(_,at)=>sized(64,'churn'+at));read(churn);
  let shared={value:1};for(let at=0;at<80;at++)shared={next:shared};const sharedHolder={shared};read(sharedHolder);
  let deeper=shared;for(let at=0;at<85;at++)deeper={next:deeper};const refused={shallow:shared,deeper};
  return {inputs:{protectedRoot,large,holder,churn,shared,sharedHolder,refused},expected:[protectedRoot,large,shared,refused],action:()=>({protectedRoot:read(protectedRoot),large:read(large),shared:read(shared),refused:read(refused)})};
 }
 throw Error('unknown fixture mode');
}
function graph(roots){
 const ids=new Map(),nodes=[],records=[];
 function value(item){if(item===null||typeof item!=='object'){if(typeof item==='function'||typeof item==='symbol')throw Error('unexpected fixture value');return {type:typeof item,value:item};}if(!ids.has(item)){ids.set(item,nodes.length);nodes.push(item);}return {node:ids.get(item)};}
 const rootIds=roots.map(value);
 for(let at=0;at<nodes.length;at++){
  const node=nodes[at],prototype=Object.getPrototypeOf(node),kind=prototype===null?'null':prototype===Array.prototype?'Array.prototype':prototype===Object.prototype?'Object.prototype':null;if(kind===null)throw Error('unexpected fixture prototype');
  const fields=Reflect.ownKeys(node).map(key=>{const field=Object.getOwnPropertyDescriptor(node,key);if(typeof key!=='string'||!Object.hasOwn(field,'value'))throw Error('unexpected fixture descriptor');return {key,value:value(field.value),enumerable:field.enumerable,writable:field.writable,configurable:field.configurable};});
  records.push({index:at,prototype:kind,frozen:Object.isFrozen(node),fields});
 }
 return {roots:rootIds,nodes:records};
}
function child(mode,which){
 const subject=subjects[which],code=[
  "import {Session} from 'node:inspector';",
  "import {gzipSync} from 'node:zlib';",
  "await import("+json(common)+");",
  "const subject=await import("+json(subject.url)+"),common=await import("+json(common)+");",
  legacy,
  "const read=subject.createCompletedDataFreezer(freeze),make="+apply(text,scenario,[])+",graph="+apply(text,graph,[])+";",
  "const native=common.originalDataFreezeIntrinsicsUnchanged(),fixture=make("+json(mode)+",read),planSource=Function.prototype.toString.call(subject.planForObservation),session=new Session();session.connect();",
  "const post=(name,args={})=>new Promise((resolve,reject)=>session.post(name,args,(error,value)=>error?reject(error):resolve(value)));let result;",
  "try{await post('Debugger.enable');await post('Profiler.enable');await post('Profiler.startPreciseCoverage',{callCount:true,detailed:true});const originalProbe=freeze(null),planProbe=read({probe:1}),values=fixture.action(),identity=Object.values(values).map((value,index)=>value===fixture.expected[index]),coverage=await post('Profiler.takePreciseCoverage'),helperRows=coverage.result.filter(row=>row.url==="+json(subject.url)+"),scriptRows=coverage.result.filter(row=>row.url===import.meta.url);let helperScriptSource=null,fixtureScriptSource=null;if(helperRows.length===1)helperScriptSource=(await post('Debugger.getScriptSource',{scriptId:helperRows[0].scriptId})).scriptSource;if(scriptRows.length===1)fixtureScriptSource=(await post('Debugger.getScriptSource',{scriptId:scriptRows[0].scriptId})).scriptSource;result={native,originalProbe,planProbeFrozen:Object.isFrozen(planProbe),identity,fixtureScriptURL:import.meta.url,helperScriptSource,fixtureScriptSource,planSource,coverage,data:graph([fixture.inputs,values,planProbe])};}finally{session.disconnect();}",
  "process.stdout.write(gzipSync(JSON.stringify(result)));",
 ].join(String.fromCharCode(10));
 let wire;try{wire=execFileSync('node',['--input-type=module','--eval',code],{timeout:10000,maxBuffer:8*1024*1024});}
 catch(error){retain(mode+'-'+which+'-failed-partial',{mode,which,code,subject,error:{name:error.name,message:error.message,status:error.status,signal:error.signal},stdout:Buffer.from(error.stdout??[]).toString('base64'),stderr:Buffer.from(error.stderr??[]).toString('base64'),partial:true});throw error;}
 const record={mode,which,code,subject,common,wire:{encoding:'gzip-json-base64',bytes:wire.length,sha256:hash(wire),base64:wire.toString('base64')}};
 retain(mode+'-'+which+'-complete-wire',record);
 const raw=gunzipSync(wire,{maxOutputLength:64*1024*1024}),result=JSON.parse(raw.toString('utf8'));retain(mode+'-'+which+'-complete-result',{record,result});
 return {record,result};
}
function counts(report){
 const {record,result}=report,rows=result.coverage.result.filter(row=>row.url===record.subject.url);assert.equal(rows.length,1);const methods=rows[0].functions.filter(row=>row.functionName==='plan');assert.equal(methods.length,1);const range=methods[0].ranges[0];
 assert.equal(result.helperScriptSource,record.subject.copiedSource);assert.equal(result.fixtureScriptSource,record.code);assert.equal(result.helperScriptSource.slice(range.startOffset,range.endOffset),result.planSource);
 const scripts=result.coverage.result.filter(row=>row.url===result.fixtureScriptURL);assert.equal(scripts.length,1);const original=scripts[0].functions.filter(row=>row.functionName==='freeze');assert.equal(original.length,1);
 const observed={planCalls:range.count,knownPlanProbeCalls:1,scenarioPlanCalls:range.count-1,originalFreezeCalls:original[0].ranges[0].count,knownOriginalProbeCalls:1,scenarioFallbackCalls:original[0].ranges[0].count-1};retain(record.mode+'-'+record.which+'-complete-counts',{record,result,observed});return observed;
}
function paired(mode){
 retain(mode+'-complete-original-sources',{manifest,originals:[...originals],subjects,relocations,legacy});
 const expected=child(mode,'old'),actual=child(mode,'current');retain(mode+'-complete-both-results',{expected,actual});
 assert.equal(expected.result.native,true);assert.equal(actual.result.native,true);assert.equal(expected.result.originalProbe,null);assert.equal(actual.result.originalProbe,null);assert.equal(expected.result.planProbeFrozen,true);assert.equal(actual.result.planProbeFrozen,true);
 assert.ok(expected.result.identity.every(Boolean));assert.ok(actual.result.identity.every(Boolean));assert.deepEqual(actual.result.data,expected.result.data);assert.deepEqual(actual.result.identity,expected.result.identity);
 return {expected,actual,old:counts(expected),current:counts(actual)};
}

test('completed root retention is independent of thousands of small descendants under the same total weak bound',{timeout:30000},()=>{
 const report=paired('root-small');assert.equal(report.old.planCalls,2);assert.equal(report.current.planCalls,1);assert.equal(report.current.scenarioPlanCalls,0);assert.equal(report.old.scenarioPlanCalls,1);assert.equal(report.old.originalFreezeCalls,1);assert.equal(report.current.originalFreezeCalls,1);
});
test('exact 64-cell descendants survive small and root churn while 63-cell descendants retain their own bounded eviction',{timeout:30000},()=>{
 const report=paired('large-small-root');assert.equal(report.old.planCalls,3);assert.equal(report.current.planCalls,2);assert.equal(report.current.scenarioPlanCalls,1);assert.equal(report.old.scenarioPlanCalls,2);assert.equal(report.old.originalFreezeCalls,1);assert.equal(report.current.originalFreezeCalls,1);
});
test('large-cohort rotation does not promote hits or evict protected roots and every cached incoming depth still refuses whole input',{timeout:30000},()=>{
 const report=paired('large-rotation-depth');assert.equal(report.old.planCalls,2);assert.equal(report.current.planCalls,3);assert.equal(report.old.scenarioPlanCalls,1);assert.equal(report.current.scenarioPlanCalls,2);assert.ok(report.current.originalFreezeCalls>1);assert.equal(report.current.scenarioFallbackCalls,report.old.scenarioFallbackCalls);assert.ok(report.current.scenarioFallbackCalls>0);
});
