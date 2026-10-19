import {historicalPrivateParserPacket,validateHistoricalPrivateParserArchive} from './private-parser-historical-packet.mjs';
import {readFileSync} from 'node:fs';
import {originalPrivateParserExpectedCommonIntrinsicsUnchanged as stored,originalPrivateParserNumericCommonIntrinsicsUnchanged as numeric} from '../original-json-intrinsics.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs,{mkdirSync,writeFileSync} from 'node:fs';
import {Hash} from 'node:crypto';
import {join} from 'node:path';
import {originalPrivateParserIngressUnchanged as ingress,
  originalStaticSourceIntrinsicsUnchanged as staticGuard,
  originalDataFreezeIntrinsicsUnchanged as dataGuard,
  originalPrivateParserCommonIntrinsicsUnchanged as combined} from '../original-json-intrinsics.mjs';
import {assertPrivateParserExecution,lexPrivateConcreteSource} from '../private-parser-execution.mjs';

// The SAME genuine common issuer initializes before these controls. None claims
// to authenticate a common module first evaluated under a poisoned bootstrap.
const root=globalThis,descriptor=Object.getOwnPropertyDescriptor,define=Object.defineProperty;
const parent=Object.getPrototypeOf,setParent=Object.setPrototypeOf,remove=Reflect.deleteProperty;
const apply=Reflect.apply,stringify=JSON.stringify,keys=Reflect.ownKeys,own=Object.hasOwn;
const arrayPrototype=Array.prototype,functionText=Function.prototype.toString,symbolText=String;
const source='fn answer() -> u8 { 7 }';
const directory=process.env.ROUTER_PRIVATE_PARSER_COMMON_VECTOR_DIR;
function retain(name,value){if(directory){mkdirSync(directory,{recursive:true});writeFileSync(join(directory,name+'.json'),stringify(value)+'\n',{flag:'wx'});}}
function facts(){
  const entry=ingress();
  // Preserve the original ingress-before-either-old-guard ordering. Calling
  // either older guard alone under a poisoned global root is not this domain.
  const staticValue=entry?staticGuard():null,dataValue=entry?dataGuard():null;
  return {ingress:entry,static:staticValue,data:dataValue,legacy:entry&&staticValue&&dataValue,combined:combined()};
}
function attempt(read){let value,error;try{value=read();}catch(caught){error=caught;}return {value,error};}
function errorFacts(error){
  if(error===null||typeof error!=='object')return {type:typeof error};
  const result={};for(const name of ['name','message']){const field=descriptor(error,name);if(field&&Object.hasOwn(field,'value')&&typeof field.value==='string')result[name]=field.value;}return result;
}
function outcome(result){return result.error===undefined?{value:result.value}:{error:errorFacts(result.error)};}
function restored(){assert.deepEqual(facts(),{ingress:true,static:true,data:true,legacy:true,combined:true});}
function positive(){assertPrivateParserExecution();return lexPrivateConcreteSource(source,'Rust');}
function ownState(owner){
  const names=keys(owner),rows=[];for(let at=0;at<names.length;at++)rows.push({key:names[at],field:descriptor(owner,names[at])});return rows;
}
function sameOwnState(before,after){
  if(before.length!==after.length)return false;
  for(let at=0;at<before.length;at++){
    const left=before[at],right=after[at];if(left.key!==right.key)return false;
    const fields=keys(left.field),other=keys(right.field);if(fields.length!==other.length)return false;
    for(let index=0;index<fields.length;index++){const name=fields[index];if(name!==other[index]||!own(right.field,name)||left.field[name]!==right.field[name])return false;}
  }return true;
}
function stateOracle(rows,original){
  const result=[];for(let at=0;at<rows.length;at++){
    const row=rows[at],reference=original[at],names=keys(row.field),fields=[];
    for(let index=0;index<names.length;index++){
      const name=names[index],value=row.field[name],type=typeof value;
      fields.push({name,type,sameOriginalIdentity:!!reference&&own(reference.field,name)&&value===reference.field[name],
        primitive:type==='function'||type==='object'&&value!==null?undefined:value,
        functionSource:type==='function'?apply(functionText,value,[]):undefined});
    }
    result.push({keyType:typeof row.key,key:typeof row.key==='symbol'?symbolText(row.key):row.key,fields});
  }return result;
}
function mutation(owner,key,field){
  const before=descriptor(owner,key),length=owner===arrayPrototype?descriptor(owner,'length'):null;
  const beforeOwn=length?ownState(owner):null;let observed,lengthDuring;
  try{define(owner,key,field);lengthDuring=length?descriptor(owner,'length'):null;observed=facts();}
  finally{
    try{if(before)define(owner,key,before);else remove(owner,key);}
    finally{if(length)define(owner,'length',length);}
  }
  const afterOwn=length?ownState(owner):null;
  const arrayRestoration=length?{before:stateOracle(beforeOwn,beforeOwn),lengthDuring,after:stateOracle(afterOwn,beforeOwn),fullKeyOrderAndDescriptorIdentityEqual:sameOwnState(beforeOwn,afterOwn)}:null;
  return {key:typeof key==='symbol'?'symbol':key,observed,restored:facts(),arrayRestoration};
}
function rejected(row,expectedStatic,expectedData){
  assert.equal(row.observed.ingress,true);assert.equal(row.observed.static,expectedStatic);assert.equal(row.observed.data,expectedData);
  assert.equal(row.observed.legacy,false);assert.equal(row.observed.combined,false);assert.equal(row.restored.combined,true);
  if(row.arrayRestoration){assert.equal(row.arrayRestoration.fullKeyOrderAndDescriptorIdentityEqual,true);if(row.key==='1234567')assert.equal(row.arrayRestoration.lengthDuring.value,1234568);}
}

test('private parser combined guard preserves the complete healthy conjunction and output',{timeout:60000},()=>{
  const rows=[];for(let at=0;at<4;at++)rows.push(facts());
  const output=positive();retain('01-complete-healthy',{source,rows,output});
  restored();for(const row of rows)assert.deepEqual(row,{ingress:true,static:true,data:true,legacy:true,combined:true});
  assert.deepEqual(output.map(token=>[token.type,token.text,token.start,token.end]),[
    ['ident','fn',0,2],['ident','answer',3,9],['punct','(',9,10],['punct',')',10,11],
    ['punct','->',12,14],['ident','u8',15,17],['punct','{',18,19],['number','7',20,21],['punct','}',22,23],
  ]);
  assert.deepEqual(positive(),output);
});

test('private parser combined guard retains static-only String and RegExp failures',{timeout:60000},()=>{
  let callbacks=0;const rows=[];
  try{
    rows.push(mutation(String.prototype,'charCodeAt',{configurable:true,get(){callbacks++;return ()=>0;}}));
    rows.push(mutation(RegExp.prototype,'exec',{...descriptor(RegExp.prototype,'exec'),value:function(){callbacks++;return null;}}));
  }finally{retain('02-static-only',{rows,callbacks});}
  assert.equal(callbacks,0);for(const row of rows)rejected(row,false,true);restored();
});

test('private parser combined guard retains independent WeakMap get and set failures',{timeout:60000},()=>{
  let callbacks=0;const rows=[];
  try{
    rows.push(mutation(WeakMap.prototype,'get',{configurable:true,get(){callbacks++;return ()=>undefined;}}));
    rows.push(mutation(WeakMap.prototype,'set',{...descriptor(WeakMap.prototype,'set'),value:function(){callbacks++;return this;}}));
  }finally{retain('03-data-only',{rows,callbacks});}
  assert.equal(callbacks,0);for(const row of rows)rejected(row,true,false);restored();
});

test('private parser combined guard retains shared namespace descriptors and flags',{timeout:60000},()=>{
  let callbacks=0;const rows=[];
  try{
    rows.push(mutation(Array.prototype,'find',{configurable:true,get(){callbacks++;return ()=>undefined;}}));
    rows.push(mutation(Map.prototype,'entries',{...descriptor(Map.prototype,'entries'),enumerable:true}));
    rows.push(mutation(Object,'getOwnPropertyDescriptor',{configurable:true,get(){callbacks++;return descriptor;}}));
    rows.push(mutation(Array.prototype,'privateParserExtra',{value:7,configurable:true}));
  }finally{retain('04-shared-namespace',{rows,callbacks});}
  assert.equal(callbacks,0);for(const row of rows)rejected(row,false,false);restored();
});

test('private parser combined guard qualifies ingress before any old guard lookup',{timeout:60000},()=>{
  const globalField=descriptor(root,'globalThis'),symbolField=descriptor(root,'Symbol');
  let getters=0,traps=0;const proxy=new Proxy(symbolField.value,{get(){traps++;throw 0;},ownKeys(){traps++;throw 0;},getPrototypeOf(){traps++;throw 0;},getOwnPropertyDescriptor(){traps++;throw 0;}});
  const cases=[
    ['globalThis',{configurable:true,get(){getters++;return root;}}],
    ['Symbol',{configurable:true,get(){getters++;return symbolField.value;}}],
    ['Symbol',{...symbolField,value:proxy}],
    ['Symbol',{...symbolField,enumerable:!symbolField.enumerable}],
    ['globalThis',{...globalField,value:{}}],
  ],rows=[];
  try{
    for(let at=0;at<cases.length;at++){
      const item=cases[at];let observed;
      try{define(root,item[0],item[1]);observed=facts();}
      finally{define(root,'globalThis',globalField);define(root,'Symbol',symbolField);}
      rows.push({key:item[0],observed,restored:facts()});
    }
  }finally{define(root,'globalThis',globalField);define(root,'Symbol',symbolField);retain('05-earliest-ingress',{rows,getters,traps,trustedCommonAlreadyInitialized:true});}
  assert.equal(getters,0);assert.equal(traps,0);assert.equal(rows.length,5);
  for(const row of rows){assert.deepEqual(row.observed,{ingress:false,static:null,data:null,legacy:false,combined:false});assert.equal(row.restored.combined,true);}restored();
});

test('private parser combined guard retains ancestry and independent numeric slot scans',{timeout:60000},async t=>{
  let callbacks=0;const rows=[];const originalParent=parent(String.prototype);let ancestry;
  try{setParent(String.prototype,{});ancestry=facts();}finally{setParent(String.prototype,originalParent);}
  try{
    rows.push(mutation(Object.prototype,'1234567',{configurable:true,set(){callbacks++;}}));
    rows.push(mutation(Array.prototype,'1234567',{value:9,configurable:true,writable:false}));
    rows.push(mutation(String.prototype,'1234567',{configurable:true,get(){callbacks++;return 'x';}}));
  }finally{retain('06-ancestry-numeric',{ancestry,rows,callbacks});}
  assert.equal(callbacks,0);assert.deepEqual(ancestry,{ingress:true,static:false,data:true,legacy:false,combined:false});
  rejected(rows[0],false,false);rejected(rows[1],false,false);rejected(rows[2],false,true);restored();
  // Independent full287 common from its immutable complete registered packet.
  // The prior three original controls above remain intact and fully asserted.
  const packet=historicalPrivateParserPacket(t,retain),previous=await import(packet.url('original-json-intrinsics.mjs'));
  const old287=previous.originalPrivateParserExpectedCommonIntrinsicsUnchanged;
  const three=()=>({old287:old287(),stored:stored(),numeric:numeric()}),healthy=three();
  const numericCases=['0','1234567','9007199254740991','01','-0','+0','1.0','1e0','9007199254740992','Infinity','NaN','','-1','1.5'],owners=[Object.prototype,Array.prototype,String.prototype],names=['Object','Array','String'],observations=[];
  let newCallbacks=0;
  for(let ownerIndex=0;ownerIndex<owners.length;ownerIndex++)for(let keyIndex=0;keyIndex<numericCases.length;keyIndex++)for(let kind=0;kind<2;kind++){
    const owner=owners[ownerIndex],key=numericCases[keyIndex],before=ownState(owner),field=descriptor(owner,key),length=owner===Array.prototype?descriptor(owner,'length'):null;let observed;
    try{define(owner,key,kind===0?{__proto__:null,value:9,writable:true,enumerable:false,configurable:true}:{__proto__:null,get(){newCallbacks++;return 9;},set(){newCallbacks++;},enumerable:false,configurable:true});observed=three();}
    finally{if(field)define(owner,key,field);else remove(owner,key);if(length)define(owner,'length',length);}
    observations.push({owner:names[ownerIndex],key,kind:kind===0?'data':'accessor',before,observed,after:ownState(owner),restored:three()});
  }
  const callbackRows=[];
  for(const kind of ['hash','read']){
    const owner=kind==='hash'?Hash.prototype:fs,key=kind==='hash'?'update':'readSync',prior=descriptor(owner,key),before=descriptor(Object.prototype,'1234567');let calls=0,getters=0,observed,result;
    try{define(owner,key,{...prior,value:function(...args){const result=apply(prior.value,this,args);calls++;define(Object.prototype,'1234567',{__proto__:null,configurable:true,get(){getters++;return 1;}});observed=three();return result;}});result=attempt(()=>positive());}
    finally{define(owner,key,prior);if(before)define(Object.prototype,'1234567',before);else remove(Object.prototype,'1234567');}
    callbackRows.push({kind,calls,getters,observed,result:outcome(result),restored:three(),positive:positive()});
  }
  const archive=readFileSync(new URL('./fixtures/private-parser-historical-288/registered-inputs.json.gz',import.meta.url)),changed=Buffer.from(archive);changed[changed.length-1]^=1;
  const corrupt=attempt(()=>validateHistoricalPrivateParserArchive(changed));
  retain('06-full-numeric-subset',{healthy,numericCases,observations,newCallbacks,callbackRows,archiveBefore:archive.toString('base64'),archiveChanged:changed.toString('base64'),corrupt:outcome(corrupt),historicalFullGraph:packet.files,contract:'Only immutable expected keys and same-invocation fresh owner equality are reused; no current truth or source/owner authority is retained.'});
  assert.deepEqual(healthy,{old287:true,stored:true,numeric:true});assert.equal(newCallbacks,0);assert.equal(observations.length,84);
  for(const row of observations){assert.equal(row.observed.stored,row.observed.old287);assert.equal(row.observed.numeric,row.observed.old287);assert.deepEqual(row.restored,healthy);assert.ok(sameOwnState(row.before,row.after));}
  for(const row of callbackRows){assert.ok(row.calls>0);assert.equal(row.getters,0);assert.deepEqual(row.observed,{old287:false,stored:false,numeric:false});assert.ok(row.result.error);assert.deepEqual(row.restored,healthy);assert.ok(row.positive.length>0);}
  assert.ok(corrupt.error);assert.deepEqual(three(),healthy);

});

test('private parser combined guard remains fresh after a genuine observed hash installs a data hook',{timeout:60000},()=>{
  const before=positive(),update=descriptor(Hash.prototype,'update'),weak=descriptor(WeakMap.prototype,'get');
  let callbacks=0,getters=0,observed,result;
  try{
    define(Hash.prototype,'update',{...update,value:function(...args){
      const value=apply(update.value,this,args);callbacks++;
      define(WeakMap.prototype,'get',{configurable:true,get(){getters++;return ()=>undefined;}});
      observed=facts();return value;
    }});
    result=attempt(()=>lexPrivateConcreteSource(source,'Rust'));
  }finally{define(WeakMap.prototype,'get',weak);define(Hash.prototype,'update',update);}
  const after=positive();retain('07-hash-live',{callbacks,getters,observed,result:outcome(result),before,after});
  assert.ok(callbacks>0);assert.equal(getters,0);assert.deepEqual(observed,{ingress:true,static:true,data:false,legacy:false,combined:false});
  assert.ok(result.error);assert.match(errorFacts(result.error).message,/native source operations changed/);assert.deepEqual(after,before);restored();
});

test('private parser combined guard remains fresh after actual default read installs a static hook',{timeout:60000},()=>{
  const before=positive(),read=descriptor(fs,'readSync'),char=descriptor(String.prototype,'charCodeAt');
  let callbacks=0,getters=0,observed,result;const calls=[];
  try{
    define(fs,'readSync',{...read,value:function(...args){
      const value=apply(read.value,undefined,args);callbacks++;
      calls.push({thisUndefined:this===undefined,argumentCount:args.length,offset:args[2],length:args[3],position:args[4],returned:value});
      define(String.prototype,'charCodeAt',{configurable:true,get(){getters++;return ()=>0;}});
      observed=facts();return value;
    }});
    result=attempt(()=>lexPrivateConcreteSource(source,'Rust'));
  }finally{define(String.prototype,'charCodeAt',char);define(fs,'readSync',read);}
  const after=positive();retain('08-read-live',{callbacks,getters,observed,calls,result:outcome(result),before,after});
  assert.ok(callbacks>0);assert.equal(getters,0);assert.deepEqual(observed,{ingress:true,static:false,data:true,legacy:false,combined:false});
  assert.ok(result.error);assert.match(errorFacts(result.error).message,/native source operations changed/);
  for(const call of calls){assert.equal(call.thisUndefined,true);assert.equal(call.argumentCount,5);}assert.deepEqual(after,before);restored();
});
