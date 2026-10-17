// Complete independent old leaf; new native data is never a private permit.
import testCase,{after} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash,Hash} from 'node:crypto';
import {types} from 'node:util';
import {copyMetadata,metadataDigest,linkParsedFile,linkedSourceContext,bindCheckedSourceLinks} from '../extensions/source-links.mjs';
import {tryCopyDigestMetadata} from '../native-metadata-copy.mjs';
import {originalFlatTokenIntrinsicsUnchanged,originalJsonIntrinsicsUnchanged,originalNamespaceTraversalIntrinsicsUnchanged,originalStaticSourceIntrinsicsUnchanged,originalDataFreezeIntrinsicsUnchanged,originalPrivateParserIngressUnchanged,originalPrivateParserCommonIntrinsicsUnchanged,originalPrivateParserNumericCommonIntrinsicsUnchanged} from '../original-json-intrinsics.mjs';
import {HostRustParser,parseRust,checkProgram} from '../extensions/host-contracts.mjs';
import {tokenizeRust} from '../extensions/lexical.mjs';
import {translateProject,originalProjectMethodFieldEvidence} from '../project.mjs';
import {validCopyCertificate} from '../impl-resolver.mjs';
import {parseOriginalMethodTransform} from '../source-method-parser.mjs';
import {originalMethodSemantic,originalMethodSemanticFacts} from '../source-method-admission.mjs';
import {serializeProgram,parseProgram} from '../semantic-meta.mjs';
import {transportConcreteSyntaxSource} from '../concrete-syntax-meta.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
import {associatedOriginalParentInputs} from './associated-original-context.mjs';
import {writeJsonGzip} from '../../evidence/write-json-gzip.mjs';
// Test-only current-state evidence, never a permission or automatic repair.
// Capture reflection once before this file installs any observer. Descriptors
// retain identity/source and own key order without reading their accessors.
const diagnosticDescriptor=Object.getOwnPropertyDescriptor,diagnosticDefine=Object.defineProperty,diagnosticKeys=Reflect.ownKeys,diagnosticPrototype=Object.getPrototypeOf,diagnosticApply=Reflect.apply,diagnosticProxy=types.isProxy,diagnosticFunctionText=Function.prototype.toString,diagnosticSymbolText=Symbol.prototype.toString,diagnosticBigIntText=BigInt.prototype.toString;
const diagnosticIdentities=[];
const diagnosticOwners=[['globalThis',globalThis],['Object',Object],['Object.prototype',Object.prototype],['Array',Array],['Array.prototype',Array.prototype],['Map',Map],['Map.prototype',Map.prototype],['Set',Set],['Set.prototype',Set.prototype],['WeakMap',WeakMap],['WeakMap.prototype',WeakMap.prototype],['WeakSet',WeakSet],['WeakSet.prototype',WeakSet.prototype],['String',String],['String.prototype',String.prototype],['Number',Number],['Number.prototype',Number.prototype],['BigInt',BigInt],['BigInt.prototype',BigInt.prototype],['RegExp',RegExp],['RegExp.prototype',RegExp.prototype],['Function',Function],['Function.prototype',Function.prototype],['Error',Error],['Error.prototype',Error.prototype],['TypeError',TypeError],['TypeError.prototype',TypeError.prototype],['Symbol',Symbol],['Symbol.prototype',Symbol.prototype],['Uint32Array',Uint32Array],['Uint32Array.prototype',Uint32Array.prototype],['Uint8Array',Uint8Array],['Uint8Array.prototype',Uint8Array.prototype],['JSON',JSON],['Reflect',Reflect],['Buffer',Buffer],['util.types',types]];
function diagnosticAppend(array,value){diagnosticDefine(array,array.length,{__proto__:null,value,enumerable:true,writable:true,configurable:true});}
function diagnosticIdentity(value){for(let index=0;index<diagnosticIdentities.length;index++)if(diagnosticIdentities[index]===value)return index+1;diagnosticAppend(diagnosticIdentities,value);return diagnosticIdentities.length;}
function diagnosticValue(value){
 const type=typeof value;
 if(value===null||type==='undefined'||type==='boolean'||type==='string')return {type,value};
 if(type==='number')return {type,value:value!==value?'NaN':value===Infinity?'Infinity':value===-Infinity?'-Infinity':value===0&&1/value===-Infinity?'-0':value};
 if(type==='symbol')return {type,identity:diagnosticIdentity(value),text:diagnosticApply(diagnosticSymbolText,value,[])};
 const identity=diagnosticIdentity(value);
 if(type==='bigint')return {type,identity,text:diagnosticApply(diagnosticBigIntText,value,[])};
 const proxy=diagnosticProxy(value);if(proxy)return {type,identity,proxy:true};
 return {type,identity,proxy:false,...(type==='function'?{source:diagnosticApply(diagnosticFunctionText,value,[])}:{})};
}
function diagnosticField(field){
 if(!field)return null;
 const result={__proto__:null,enumerable:field.enumerable,configurable:field.configurable};
 const ownValue=diagnosticDescriptor(field,'value');
 if(ownValue){result.value=diagnosticValue(ownValue.value);result.writable=field.writable;}
 else{result.get=diagnosticValue(field.get);result.set=diagnosticValue(field.set);}
 return result;
}
function captureGuardDiagnostic(stage){
 const guards={__proto__:null},owners=[],reads=[['json',originalJsonIntrinsicsUnchanged],['namespace',originalNamespaceTraversalIntrinsicsUnchanged],['flatToken',originalFlatTokenIntrinsicsUnchanged],['staticSource',originalStaticSourceIntrinsicsUnchanged],['dataFreeze',originalDataFreezeIntrinsicsUnchanged],['privateIngress',originalPrivateParserIngressUnchanged],['privateCommon',originalPrivateParserCommonIntrinsicsUnchanged],['privateNumericCommon',originalPrivateParserNumericCommonIntrinsicsUnchanged]];
 for(let index=0;index<reads.length;index++){
  const name=reads[index][0],read=reads[index][1];
  try{guards[name]={returned:read()};}catch(error){guards[name]={threw:diagnosticValue(error)};}
 }
 for(let index=0;index<diagnosticOwners.length;index++){
  const name=diagnosticOwners[index][0],owner=diagnosticOwners[index][1],identity=diagnosticValue(owner);
  if(identity.proxy){diagnosticAppend(owners,{name,owner:identity,uncertain:true});continue;}
  const fields=[],keys=diagnosticKeys(owner);
  for(let at=0;at<keys.length;at++){const key=keys[at];diagnosticAppend(fields,{key:diagnosticValue(key),descriptor:diagnosticField(diagnosticDescriptor(owner,key))});}
  diagnosticAppend(owners,{name,owner:identity,prototype:diagnosticValue(diagnosticPrototype(owner)),fields});
 }
 return {stage,guards,owners,authority:false,restorationPerformed:false,parserWarmupPerformed:false};
}
const moduleEntryGuardDiagnostic=captureGuardDiagnostic('module-entry-before-archived-leaf-import');
const json=JSON.stringify,apply=Reflect.apply,define=Object.defineProperty,descriptor=Object.getOwnPropertyDescriptor;
const encode=value=>json(value,(_key,item)=>typeof item==='bigint'?{$integer:item.toString()}:item);
const hash=value=>createHash('sha256').update(value).digest('hex');
const base=new URL('../extensions/',import.meta.url),fixture=new URL('../fixtures/flat-token-validation/',import.meta.url),manifest=JSON.parse(readFileSync(new URL('manifest.json',fixture),'utf8'));
const archived=readFileSync(new URL(manifest.storedPath,fixture)),oldText=archived.toString('utf8'),currentText=readFileSync(new URL('../extensions/source-links.mjs',import.meta.url),'utf8');
assert.equal(archived.length,manifest.bytes);assert.equal(hash(archived),manifest.sha256);
const folder=mkdtempSync(join(tmpdir(),'router-native-metadata-')),imports=[];
const oldRelocated=oldText.replace(/\bfrom (['"])(\.\.?\/[^'"]+)\1/g,(_whole,quote,path)=>{const url=new URL(path,base).href;imports.push({path,url});return 'from '+quote+url+quote;});
const oldPath=join(folder,'complete-old-source-links.mjs');writeFileSync(oldPath,oldRelocated);const old=await import(pathToFileURL(oldPath).href);after(()=>rmSync(folder,{recursive:true,force:true}));
const test=(name,run)=>testCase(name,{timeout:60000},async t=>{
 const vectors=[{kind:'module-entry-guard-diagnostic',value:moduleEntryGuardDiagnostic},{kind:'case-entry-guard-diagnostic',value:captureGuardDiagnostic('case-entry:'+name)}];try{await run(t,(kind,value)=>{vectors.push({kind,value});return value;});}
 finally{vectors.push({kind:'case-finally-guard-diagnostic',value:captureGuardDiagnostic('case-finally:'+name)});const directory=process.env.ROUTER_NATIVE_METADATA_VECTOR_DIR;if(directory){mkdirSync(directory,{recursive:true});writeJsonGzip(join(directory,Buffer.from(name).toString('hex')+'.json.gz'),{name,vectors},(_key,item)=>typeof item==='bigint'?{$integer:item.toString()}:item);}}
});
function outcome(run){try{return {value:run()};}catch(error){return {error:{name:error.name,message:error.message}};}}
function graph(value){
 if(value===null||typeof value!=='object')return {scalar:typeof value,value};
 const fields=Object.getOwnPropertyDescriptors(value),keys=Reflect.ownKeys(fields);
 return {array:Array.isArray(value),prototype:Object.getPrototypeOf(value)===null?'null':Object.getPrototypeOf(value)===Array.prototype?'Array':'other',fields:keys.map(key=>({key,...fields[key],value:graph(fields[key].value)}))};
}
function compare(value){const before=outcome(()=>old.metadataDigest(value)),after=outcome(()=>metadataDigest(value));return {before,after};}
function same(pair){assert.deepEqual(pair.after,pair.before);return pair.after;}
function trial(value){const copied=tryCopyDigestMetadata(value);if(originalFlatTokenIntrinsicsUnchanged()){assert.notEqual(copied,null);return copied.value;}assert.equal(copied,null);return copyMetadata(value);}
function depth(level){let value=0;for(let index=0;index<level;index++)value={child:value};return value;}

test('canonical records retain complete property descriptors and nested signed key order',(_t,retain)=>{
 const currentCopy=currentText.slice(currentText.indexOf('export function copyMetadata('),currentText.indexOf('export function metadataDigest(')),oldCopy=oldText.slice(oldText.indexOf('export function copyMetadata('),oldText.indexOf('export function metadataDigest('));
 retain('complete-source-oracle',{manifest,oldText,currentText,oldRelocated,imports});assert.equal(currentCopy,oldCopy);
 assert.equal(oldRelocated.replace(/\bfrom (['"])(file:[^'"]+)\1/g,(whole,quote,url)=>{const row=imports.find(row=>row.url===url);return row?'from '+quote+row.path+quote:whole;}),oldText);
 const eligibility=originalFlatTokenIntrinsicsUnchanged();assert.equal(eligibility,!!process.versions.bun);
 const nullRecord=Object.create(null);define(nullRecord,'__proto__',{value:{z:3,a:1},enumerable:true});nullRecord[10]='ten';nullRecord[2]='two';
 const value={z:[undefined,null,4n],a:nullRecord,copyCertificate:{z:2,a:{z:3,a:4},nested:[{z:5,a:6}]},other:Object.create(Array.prototype)};
 define(value,'fixed',{value:{z:1,a:2},enumerable:true});Object.freeze(value.z);
 const expected=old.copyMetadata(value),actual=trial(value),pair=compare(value);retain('whole-copy',{eligibility,value,expected:graph(expected),actual:graph(actual),pair});
 assert.deepEqual(graph(actual),graph(expected));same(pair);assert.deepEqual(Object.keys(actual),['a','copyCertificate','fixed','other','z']);
 assert.deepEqual(Object.keys(actual.a),['2','10','__proto__']);assert.equal(Object.getPrototypeOf(actual.a),null);assert.deepEqual(Object.keys(actual.copyCertificate),['z','a','nested']);assert.deepEqual(Object.keys(actual.copyCertificate.a),['z','a']);assert.deepEqual(Object.keys(actual.copyCertificate.nested[0]),['z','a']);
 for(const key of Object.keys(actual))assert.deepEqual(descriptor(actual,key),{value:actual[key],enumerable:true,writable:true,configurable:true});
 assert.equal(pair.after.value,hash(encode(expected)));assert.notEqual(actual,value);assert.notEqual(actual.a,value.a);
});

test('primitive classes preserve exact canonical bytes and genuine native eligibility',(_t,retain)=>{
 const values=[undefined,null,false,true,0,-0,Number.MAX_SAFE_INTEGER,Number.MIN_SAFE_INTEGER,0n,1n,-17n,'','λ😀','\ud800','\udfff','\u0000\n\r\t"\\'];
 const rows=values.map(value=>({value,pair:compare(value),copy:trial(value)}));retain('scalars',rows);
 for(const row of rows){same(row.pair);assert.equal(typeof row.copy,typeof row.value);assert.ok(Object.is(row.copy,row.value));}
 assert.ok(rows[0].pair.after.error);assert.equal(metadataDigest(-0),hash('0'));assert.equal(metadataDigest(17n),hash('{"$integer":"17"}'));
 const units=[];for(let code=0;code<65536;code++)units.push(String.fromCharCode(code));
 const pair=compare(units),copied=trial(units);retain('all-utf16-units',{units,copied,pair});same(pair);assert.deepEqual(copied,units);assert.equal(copied.length,65536);
 assert.equal(copied[0xd800],'\ud800');assert.equal(copied[0xffff],'\uffff');assert.equal(Buffer.byteLength('\ud800'),3);assert.equal(Buffer.byteLength('😀'),4);
 const omissions={a:undefined,b:[undefined],c:1n},encoded=encode(trial(omissions));assert.equal(encoded,'{"b":[null],"c":{"$integer":"1"}}');assert.equal(metadataDigest(omissions),hash(encoded));
});

test('aliases cycles and malformed descriptors preserve full old refusals without callbacks',(_t,retain)=>{
 const shared={z:[1,2],a:'é'},input={left:shared,right:shared},copied=trial(input);assert.notEqual(copied.left,copied.right);assert.notEqual(copied.left.z,copied.right.z);copied.left.z[0]=9;assert.equal(shared.z[0],1);assert.equal(copied.right.z[0],1);
 let reads=0;const accessor=Object.create(null);define(accessor,'x',{enumerable:true,get(){reads++;throw Error('getter');}});const hidden={};define(hidden,'x',{value:1});const symbol={[Symbol('x')]:1},cycle={};cycle.self=cycle;
 const proxy=new Proxy({}, {get(){reads++;throw Error('get');},ownKeys(){reads++;throw Error('keys');},getPrototypeOf(){reads++;throw Error('prototype');},getOwnPropertyDescriptor(){reads++;throw Error('descriptor');}});
 const hole=Array(128);for(let index=0;index<127;index++)hole[index]=index;hole.extra=true;const extra=[1];extra.extra=2;const hiddenIndex=[1];define(hiddenIndex,'0',{enumerable:false});
 const stackData={stack:'ordinary data'},stackAccessor={};define(stackAccessor,'stack',{enumerable:true,get(){reads++;}});
 const values=[accessor,hidden,symbol,cycle,proxy,new Map(),new Set(),new Date(),()=>{},Symbol('x'),1.5,NaN,Infinity,-Infinity,Object.create({foreign:true}),hole,extra,hiddenIndex,stackAccessor];
 const rows=values.map(value=>({pair:compare(value),miss:tryCopyDigestMetadata(value)===null}));retain('all-refusals',{rows,reads});for(const row of rows){same(row.pair);assert.ok(row.pair.after.error);assert.equal(row.miss,true);}assert.equal(reads,0);
 assert.equal(tryCopyDigestMetadata(stackData),null);same(compare(stackData));
 const precedence={before:cycle};define(precedence,'later',{enumerable:true,get(){reads++;}});const ordered=compare(precedence);retain('descriptor-before-child',ordered);same(ordered);assert.equal(ordered.after.error.message,'source links: accessor, symbol or hidden metadata');assert.equal(reads,0);
 const original=descriptor(Error,'prepareStackTrace');let calls=0;
 function observe(implementation){const error=new Error('lazy source data');Object.setPrototypeOf(error,null);calls=0;const result=outcome(()=>implementation.metadataDigest(error));return {result,calls};}
 let before,after;try{define(Error,'prepareStackTrace',{configurable:true,value(){calls++;return 'complete lazy stack';}});before=observe(old);after=observe({metadataDigest});}finally{if(original)define(Error,'prepareStackTrace',original);else delete Error.prepareStackTrace;}
 retain('lazy-error',{before,after});assert.deepEqual(after,before);
});

test('whole default quotas and partial ancestor failures retain old precedence',(_t,retain)=>{
 const fitCells=Array(199999).fill(null),overCells=Array(200000).fill(null),fitText='é'.repeat(2097152),overText=fitText+'x';
 const subjects=[['cell-fit',fitCells,true],['cell-over',overCells,false],['byte-fit',fitText,true],['byte-over',overText,false],['depth-fit',depth(160),true],['depth-over',depth(161),false],['alias-cell-over',{left:fitCells,right:fitCells},false],['alias-byte-over',{left:fitText,right:fitText},false],['partial-late',{a:{ok:[1,2]},z:depth(161)},false]];
 for(const [label,value,accept]of subjects){const pair=compare(value),attempt=tryCopyDigestMetadata(value);retain('complete-boundary-'+label,{label,value,pair,trialSuccess:attempt!==null});same(pair);assert.equal(!pair.after.error,accept);if(originalFlatTokenIntrinsicsUnchanged())assert.equal(attempt!==null,accept);else assert.equal(attempt,null);if(attempt)assert.deepEqual(graph(attempt.value),graph(old.copyMetadata(value)));}
 let calls=0;const cells={valueOf(){calls++;return 4;}},custom={a:[1,2]};calls=0;const before=outcome(()=>old.copyMetadata(custom,{cells})),beforeCalls=calls;calls=0;const after=outcome(()=>copyMetadata(custom,{cells})),afterCalls=calls;
 retain('public-custom-state',{before,after,beforeCalls,afterCalls});assert.deepEqual(after,before);assert.equal(afterCalls,beforeCalls);
 for(const preserveKeyOrder of [false,true])assert.deepEqual(graph(copyMetadata({z:1,a:2},{preserveKeyOrder})),graph(old.copyMetadata({z:1,a:2},{preserveKeyOrder})));
 const budget={cells:4,bytes:5},active=new Set();assert.deepEqual(copyMetadata({a:1},undefined,0,active,budget),old.copyMetadata({a:1},undefined,0,new Set(),{cells:4,bytes:5}));assert.deepEqual(budget,{cells:2,bytes:5});
});

function observerRun(implementation,owner,key){
 const previous=descriptor(owner,key),original=previous.value;let tape='';
 const value={z:['λ😀',undefined,4n],a:{z:2,a:1},copyCertificate:{z:2,a:1}};
 define(owner,key,{...previous,value:function(...args){tape+=key.toString()+':'+json(args,(_key,item)=>typeof item==='bigint'?{$integer:item.toString()}:typeof item==='function'?'function':item)+';';return apply(original,this,args);}});
 let result;try{result=outcome(()=>implementation.metadataDigest(value));}finally{define(owner,key,previous);}
 return {result,tape};
}
test('altered intrinsic and inherited hooks keep complete legacy observation tapes',(_t,retain)=>{
 const targets=[[Object,'getOwnPropertyDescriptors'],[Object,'getOwnPropertyDescriptor'],[Object,'getPrototypeOf'],[Object,'defineProperty'],[Object,'create'],[Object,'hasOwn'],[Reflect,'ownKeys'],[Array,'isArray'],[Array.prototype,'sort'],[Array.prototype,'push'],[Array.prototype,Symbol.iterator],[Set.prototype,'has'],[Set.prototype,'add'],[Set.prototype,'delete'],[Buffer,'byteLength'],[globalThis,'String'],[globalThis,'Number'],[globalThis,'Set'],[Number,'isSafeInteger'],[types,'isProxy']];
 for(let index=0;index<targets.length;index++){const [owner,key]=targets[index],before=observerRun(old,owner,key),after=observerRun({metadataDigest},owner,key);retain('intrinsic-tape-'+index,{key:String(key),before,after});assert.deepEqual(after,before);}
 const inherited=[];
 for(const [owner,key]of [[Object.prototype,'cells'],[Object.prototype,'bytes'],[Object.prototype,'preserveKeyOrder'],[Object.prototype,'get'],[Object.prototype,'set'],[Object.prototype,'127'],[Array.prototype,'127'],[Object.prototype,'toJSON'],[Array.prototype,'toJSON']]){
  const previous=descriptor(owner,key);let tape='';
  const run=implementation=>{tape='';const value={items:Array.from({length:128},(_,index)=>index),child:{value:'é'}};const result=outcome(()=>implementation.metadataDigest(value));return {result,tape};};
  const field={__proto__:null,configurable:true};if(key==='toJSON')field.value=function(){tape+='toJSON;';return this;};else if(key==='127')field.set=function(value){tape+='set127;';define(this,key,{__proto__:null,value,writable:true,enumerable:true,configurable:true});};else field.get=function(){tape+=key+';';return key==='cells'?200000:key==='bytes'?4194304:key==='preserveKeyOrder'?false:undefined;};
  let before,after;try{define(owner,key,field);before=run(old);after=run({metadataDigest});}finally{if(previous)define(owner,key,previous);else delete owner[key];}const row={key,before,after};inherited.push(row);retain('inherited-tape-'+inherited.length,row);assert.deepEqual(after,before);
 }
 retain('inherited-tapes',inherited);
 const globalBuffer=descriptor(globalThis,'Buffer'),buffer=Buffer;let tape='';const run=implementation=>{tape='';const result=outcome(()=>implementation.metadataDigest({a:'é',b:'😀'}));return {result,tape};};let before,after;
 try{define(globalThis,'Buffer',{configurable:true,enumerable:globalBuffer.enumerable,get(){tape+='Buffer;';return buffer;}});before=run(old);after=run({metadataDigest});}finally{define(globalThis,'Buffer',globalBuffer);}retain('buffer-accessor',{before,after});assert.deepEqual(after,before);
 const byteLength=descriptor(buffer,'byteLength');function mutate(implementation){const value={a:'first',z:1};let calls=0;define(buffer,'byteLength',{...byteLength,value(...args){calls++;value.z=9;define(buffer,'byteLength',byteLength);return apply(byteLength.value,this,args);}});try{return {result:implementation.metadataDigest(value),calls,value};}finally{define(buffer,'byteLength',byteLength);}}
 const mutation={before:mutate(old),after:mutate({metadataDigest})};retain('transient-mutate-restore',mutation);assert.deepEqual(mutation.after,mutation.before);
 const string=descriptor(globalThis,'String');let keys='';function keyObjects(implementation){keys='';define(globalThis,'String',{...string,value(index){keys+='String;';const key=apply(string.value,undefined,[index]);return {[Symbol.toPrimitive](){keys+='key;';return key;}};}});try{const result=outcome(()=>implementation.metadataDigest([1,2]));return {result,keys};}finally{define(globalThis,'String',string);}}
 const coercion={before:keyObjects(old),after:keyObjects({metadataDigest})};retain('string-key-coercion',coercion);assert.deepEqual(coercion.after,coercion.before);assert.equal(coercion.after.keys,'String;key;String;key;');
 const script=`import assert from'node:assert/strict';await import(${json(new URL('../original-json-intrinsics.mjs',import.meta.url).href)});const define=Object.defineProperty,apply=Reflect.apply;let calls=0;Object.defineProperty=function(...args){calls++;return apply(define,this,args);};const old=await import(${json(pathToFileURL(oldPath).href)}),current=await import(${json(new URL('../extensions/source-links.mjs',import.meta.url).href)});const value={z:2,a:{x:'é'}};calls=0;const before=old.metadataDigest(value),expected=calls;calls=0;const after=current.metadataDigest(value),actual=calls;Object.defineProperty=define;assert.equal(after,before);assert.equal(actual,expected);assert.ok(actual>0);console.log(JSON.stringify({before,after,expected,actual}));`;
 const stdout=execFileSync(process.execPath,['--input-type=module','-'],{input:script,encoding:'utf8',timeout:10000,maxBuffer:1048576});retain('cold-leaf-raw',{script,stdout});assert.equal(JSON.parse(stdout).before,JSON.parse(stdout).after);
});

function hashTape(implementation,mode){
 const update=descriptor(Hash.prototype,'update'),digest=descriptor(Hash.prototype,'digest'),stringify=descriptor(JSON,'stringify'),big=descriptor(BigInt.prototype,'toString');let tape=[],receiver=null,next=0;
 const push=Array.prototype.push,record=value=>apply(push,tape,[value]),value={z:[1n,'λ😀'],a:{z:2,a:1}};
 try{
  define(Hash.prototype,'update',{...update,value(...args){if(receiver===null)receiver=this;record({operation:'update',sameReceiver:this===receiver,args:args.map(item=>({type:typeof item,value:item}))});if(mode==='mutate'){value.a.z=9;next++;}if(mode==='update-throw')throw new TypeError('actual update observer refusal');return apply(update.value,this,args);}});
  define(Hash.prototype,'digest',{...digest,value(...args){record({operation:'digest',sameReceiver:this===receiver,args});if(mode==='digest-throw')throw new TypeError('actual digest observer refusal');return apply(digest.value,this,args);}});
  if(mode==='json')define(JSON,'stringify',{...stringify,value(...args){record({operation:'stringify',args:[encode(args[0]),typeof args[1]]});return apply(stringify.value,this,args);}});
  if(mode==='bigint')define(BigInt.prototype,'toString',{...big,value(...args){record({operation:'bigint',value:apply(big.value,this,[]),args});return apply(big.value,this,args);}});
  const first=outcome(()=>implementation.metadataDigest(value));receiver=null;const second=outcome(()=>implementation.metadataDigest(value));return {first,second,tape,next,value};
 }finally{define(Hash.prototype,'update',update);define(Hash.prototype,'digest',digest);define(JSON,'stringify',stringify);define(BigInt.prototype,'toString',big);}
}
test('fresh native hashes retain exact bytes arguments receivers and order',(_t,retain)=>{
 for(const mode of ['native','json','bigint','mutate','update-throw','digest-throw']){const before=hashTape(old,mode),after=hashTape({metadataDigest},mode);retain('full-hash-'+mode,{before,after});assert.deepEqual(after,before);assert.equal(after.tape.filter(row=>row.operation==='update').length,2);assert.equal(after.tape.filter(row=>row.operation==='digest').length,mode==='update-throw'?0:2);assert.ok(after.tape.filter(row=>row.operation==='digest').every(row=>row.sameReceiver));if(mode==='mutate')assert.notEqual(after.first.value,after.second.value);if(mode.endsWith('throw'))assert.equal(after.first.error.name,'TypeError');}
});

test('genuine source and method issuers keep fresh private authority',async(_t,retain)=>{
 const source='// λ 😀\n#[derive(Clone,Copy)]pub enum Kind{Ready,Waiting}pub struct Holder{value:Kind}impl Holder{pub fn read(&self)->Kind{self.value}}pub fn make()->Holder{Holder{value:Kind::Ready}}pub fn get(v:&Holder)->Kind{v.read()}pub const LIMIT:u8=7u8;pub fn limit()->u8{LIMIT}';
 const concrete=transportConcreteSyntaxSource(source,{language:'Rust'});assert.equal(concrete.source,source);
 const result=translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>concrete.source}),facade=result.checkedMethodDeclarations.find(row=>row.displayName==='Holder.read');retain('whole-source-project',{source,concrete,resultMeta:result.meta,facade});assert.ok(facade);
 const origin=originalProjectMethodFieldEvidence(facade),field=origin.fields.find(row=>row.field==='value');assert.equal(validCopyCertificate(field.copyCertificate,field.copyCertificate.type),true);
 const parsed=parseOriginalMethodTransform(origin.transform),semantic=originalMethodSemantic(parsed,{fieldEvidence:origin.token}),facts=originalMethodSemanticFacts(semantic),pair=compare(origin.transform);
 retain('genuine-method',{source,concrete,resultMeta:result.meta,transform:origin.transform,field,facts,pair});same(pair);assert.ok(pair.after.value);
 const checked=parseProgram(serializeProgram(parseProgram(JSON.stringify(result.meta.checkedSemanticProgram))));assert.equal(serializeProgram(parseProgram(serializeProgram(checked))),serializeProgram(checked));
 assert.throws(()=>originalProjectMethodFieldEvidence({...facade}),/unissued|facade/);assert.throws(()=>originalProjectMethodFieldEvidence(structuredClone(origin.token),origin.transform),/unissued|fabricated/);assert.throws(()=>originalMethodSemantic(parsed,{fieldEvidence:structuredClone(origin.token)}),/unissued|fabricated/);
 const constant='pub const VALUE:u8=7u8;fn main(){}',parser=new HostRustParser(tokenizeRust(constant)),surface=parser.file();linkParsedFile(parser,surface,constant);const program=checkProgram(surface),context=linkedSourceContext(surface);assert.equal(program.declarations.get('VALUE').constantEvaluationProof.sourceLinksVerified,true);assert.throws(()=>bindCheckedSourceLinks(program,{...context},{}),/private parser source context/);
 const changed=parseRust(constant);changed.items[0].body.value='8';assert.throws(()=>checkProgram(changed),/changed after source capture/);
 const altered=new HostRustParser(tokenizeRust(constant)),alteredSurface=altered.file();altered.cursor.tokens.find(row=>row.kind==='number').value='8';assert.throws(()=>linkParsedFile(altered,alteredSurface,constant),/token stream differs/);
 await verifyTypedTargets(result,api=>{assert.equal(api.limit(),7n);assert.deepEqual(api.get(api.make()),{$:'Ready'});},{childTimeoutMs:20000});
});

test('fresh calls retain no input or canonical state and actual original receivers remain obligations',(_t,retain)=>{
 const value={a:{value:1},copyCertificate:{z:2,a:1}},before=metadataDigest(value),first=trial(value);value.a.value=2;const changed=compare(value);same(changed);assert.notEqual(changed.after.value,before);assert.equal(first.a.value,1);
 const rows=[];for(const replacement of [undefined,null,0,false,'changed',7n]){value.a=replacement;const pair=compare(value);rows.push({replacement,pair});same(pair);}value.a={value:1};delete value.copyCertificate.z;value.copyCertificate.z=2;const reordered=compare(value);same(reordered);assert.notEqual(reordered.after.value,before);
 retain('fresh-mutations',{before,first,rows,reordered});
 const data=associatedOriginalParentInputs('derive-helper-originals.test.mjs');
 for(const path of ['src/provider_acceptance.rs','src/response_affinity.rs']){
  const source=data.source(path),concrete=transportConcreteSyntaxSource(source,{language:'Rust'}),metadata={path,source,sourceSha256:hash(source),bytes:Buffer.byteLength(source),canonical:concrete.meta},pair=compare(metadata),independent=outcome(()=>hash(encode(old.copyMetadata(metadata))));retain('whole-parent-'+path,{metadata,pair,independent});same(pair);assert.equal(concrete.source,source);assert.deepEqual(pair.after,independent);
 }
 retain('complete-original-parent-data',{paths:['src/provider_acceptance.rs','src/response_affinity.rs'],authority:false,compilerAdmission:false,originalWholeCopyAndDeriveReceivingStillRequired:true});
});
