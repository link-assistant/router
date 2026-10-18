// Explicit digest sibling controls; these data observations issue no proof.
import testCase from 'node:test';
import assert from 'node:assert/strict';
import {createHash,Hash} from 'node:crypto';
import {mkdirSync,readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {join} from 'node:path';
import {types} from 'node:util';
import {writeJsonGzip} from '../../evidence/write-json-gzip.mjs';
import {copyMetadata,metadataDigest,metadataDigestWithPrivateAssignments as selected,ordinal} from '../extensions/source-links.mjs';
import {copyOriginalDigestMetadata,originalStaticSourceIntrinsicsUnchanged} from '../original-json-intrinsics.mjs';
import {captureOriginalMethodValidation,originalMethodValidationDigest} from '../source-method-validation.mjs';
import {captureSourceModuleViews} from '../source-module-views.mjs';
import {extractImplDeclarations,lowerSharedMethodTokens,originalMethodMember,originalMethodLowering,certifyCopyType,lowerCopyMethodTokens} from '../impl-resolver.mjs';
import {createMatchesMacroContext} from '../matches-macro-context.mjs';
import {createOriginalMethodTokenTransform} from '../source-method-transforms.mjs';
import {parseOriginalMethodTransform,originalMethodParsedFacts} from '../source-method-parser.mjs';
import {originalMethodSemantic,originalMethodSemanticFacts} from '../source-method-admission.mjs';
import {translateProject} from '../project.mjs';
import {parseRust,checkProgram} from '../extensions/host-contracts.mjs';
import {macroProvenance} from '../macro-provenance.mjs';
import {transportConcreteSyntaxSource} from '../concrete-syntax-meta.mjs';
import {parseProgram,serializeProgram} from '../semantic-meta.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
const root=globalThis,define=Object.defineProperty,get=Object.getOwnPropertyDescriptor,all=Object.getOwnPropertyDescriptors,keys=Reflect.ownKeys,proto=Object.getPrototypeOf,apply=Reflect.apply,isProxy=types.isProxy;
const encode=value=>JSON.stringify(value,(_key,item)=>typeof item==='bigint'?{$integer:item.toString()}:item);
const completePublicBefore="export function copyMetadata(value,{cells=200000,bytes=4194304,preserveKeyOrder=false}={},depth=0,active=new Set(),budget=null) {\n  budget??={cells,bytes};if(--budget.cells<0||depth>160)fail('metadata budget exhausted');\n  if(value===null||value===undefined||typeof value==='boolean'||typeof value==='bigint')return value;\n  if(typeof value==='number'){if(!Number.isSafeInteger(value))fail('non-integer metadata number');return value;}\n  if(typeof value==='string'){budget.bytes-=Buffer.byteLength(value);if(budget.bytes<0)fail('metadata byte budget exhausted');return value;}\n  if(!value||typeof value!=='object'||types.isProxy(value)||active.has(value))fail('metadata must be acyclic data');\n  const prototype=Object.getPrototypeOf(value);\n  if(prototype!==Object.prototype&&prototype!==null&&prototype!==Array.prototype)fail('unexpected metadata prototype');\n  // Reuse this enumeration without adding reflection or coercing a caller's\n  // rebound String result twice; the membership lookup uses the numeric index.\n  const descriptors=Object.getOwnPropertyDescriptors(value),keys=Reflect.ownKeys(descriptors),array=Array.isArray(value),ownIndexes=array?{__proto__:null}:null;\n  for(const key of keys){const descriptor=descriptors[key];if(typeof key!=='string'||!Object.hasOwn(descriptor,'value')||(!descriptor.enumerable&&!(array&&key==='length')))fail('accessor, symbol or hidden metadata');if(array)ownIndexes[key]=true;}\n  active.add(value);let result;\n  if(array){\n    const length=descriptors.length.value;if(!Number.isSafeInteger(length)||length<0||length>budget.cells)fail('array metadata budget exhausted');\n    if(keys.length!==length+1)fail('array metadata holes or extra properties');\n    result=[];for(let index=0;index<length;index++){const key=String(index);if(ownIndexes[index]!==true)fail('array metadata hole');const descriptor=descriptors[key];if(!descriptor)fail('array metadata hole');result.push(copyMetadata(descriptor.value,{preserveKeyOrder},depth+1,active,budget));}\n  }else {\n    // Copy certificates hash their original JSON property order. Canonical\n    // metadata cloning must retain every signed byte inside those envelopes.\n    result=Object.create(null);for(const key of preserveKeyOrder?keys:keys.sort(ordinal))Object.defineProperty(result,key,{value:copyMetadata(descriptors[key].value,{preserveKeyOrder:preserveKeyOrder||key==='copyCertificate'},depth+1,active,budget),enumerable:true,writable:true,configurable:true});\n  }\n  active.delete(value);return result;\n}\nexport function metadataDigest(value) {\n  return hash(JSON.stringify(copyMetadata(value),(_,item)=>typeof item==='bigint'?{$integer:item.toString()}:item));\n}";
const test=(name,run)=>testCase(name,{timeout:60000},async t=>{
 const rows=[];const retain=(kind,value)=>{rows.push({kind,value});return value;};
 try{await run(t,retain);}finally{const folder=process.env.ROUTER_DIGEST_ASSIGNMENT_VECTOR_DIR;if(folder){mkdirSync(folder,{recursive:true});writeJsonGzip(join(folder,Buffer.from(name).toString('hex')+'.json.gz'),{name,rows,authority:false},(_key,item)=>typeof item==='bigint'?{$integer:item.toString()}:item);}}
});
function append(array,value){define(array,array.length,{__proto__:null,value,enumerable:true,writable:true,configurable:true});}
function outcome(action){try{return {value:action()};}catch(error){return {error:{name:error?.name,message:error?.message,thrownType:typeof error}};}}
function pair(value){return {old:outcome(()=>metadataDigest(value)),current:outcome(()=>selected(value))};}
function same(row){assert.deepEqual(row.current,row.old);return row.current;}
function copy(value){return copyOriginalDigestMetadata(value,copyMetadata,ordinal);}
function descriptorTree(value){
 if(value===null||typeof value!=='object')return {type:typeof value,value};
 if(isProxy(value))return {proxy:true};
 return {array:Array.isArray(value),prototype:proto(value)===null?'null':proto(value)===Array.prototype?'Array':proto(value)===Object.prototype?'Object':'foreign',fields:keys(value).map(key=>{const field=get(value,key);return {key:typeof key==='symbol'?String(key):key,enumerable:field.enumerable,configurable:field.configurable,...(Object.hasOwn(field,'value')?{writable:field.writable,child:descriptorTree(field.value)}:{get:typeof field.get,set:typeof field.set})};})};
}
function depth(count){let value=0;for(let index=0;index<count;index++)value={child:value};return value;}
function hook(owner,key,value){const before=get(owner,key);define(owner,key,{__proto__:null,...before,configurable:true,value});return ()=>{if(before)define(owner,key,{__proto__:null,...before});else delete owner[key];};}
function trial(implementation,configure,valueFactory){
 const tape=[],record=value=>append(tape,value);const restore=[];let value,result;
 try{configure({record,restore,hook:(owner,key,value)=>append(restore,hook(owner,key,value))});value=valueFactory();result=outcome(()=>implementation(value));}
 finally{for(let index=restore.length-1;index>=0;index--)restore[index]();}
 return {result,tape};
}
function oldAndNew(configure,valueFactory=()=>({a:'switch',z:2})){
 return {old:trial(metadataDigest,configure,valueFactory),current:trial(selected,configure,valueFactory)};
}
function methodFixture(){
 const source='pub struct Counter{value:u8}impl Counter{pub fn read(&self)->u8{self.value}}',sourceView=captureSourceModuleViews({source,sourcePath:'src/lib.rs'}).views[0],context=createMatchesMacroContext({modules:[{file:'src/lib.rs',path:[],source,sourceView}]}),method=extractImplDeclarations(source,{sourcePath:'src/lib.rs',sourceView}).implementations[0].methods[0],lowered=lowerSharedMethodTokens(method,['crate',...method.typePath]),transform=createOriginalMethodTokenTransform(context,method,lowered),parsed=parseOriginalMethodTransform(transform),semantic=originalMethodSemantic(parsed);
 return {source,method,lowered,transform,parsed,semantic};
}

test('canonical sibling data retains exact old bytes flags Unicode aliases and signed certificate ordering',(_t,retain)=>{
 const text=readFileSync(new URL('../extensions/source-links.mjs',import.meta.url),'utf8'),start=text.indexOf('export function copyMetadata('),end=text.indexOf('\n// Explicit sibling;',start);
 retain('public-source-equation',{completePublicBefore,actual:text.slice(start,end)});assert.equal(text.slice(start,end),completePublicBefore);
 const certificate={z:1,a:{z:2,a:3},numbers:{10:'ten',2:'two'}},shared={z:'λ😀\ud800',a:-0},unusual=Object.create(null);define(unusual,'__proto__',{__proto__:null,value:{z:1,a:2},enumerable:true});unusual[10]=10;unusual[2]=2;
 const value={z:[null,undefined,true,false,123n,shared,shared],a:unusual,copyCertificate:certificate},before=copyMetadata(value),after=copy(value),digests=pair(value);let fallbacks=0;const direct=copyOriginalDigestMetadata(value,v=>{fallbacks++;return copyMetadata(v);},ordinal);
 retain('complete-data',{value,before,after,direct,beforeTree:descriptorTree(before),afterTree:descriptorTree(after),digests,fallbacks,stockStaticEligible:originalStaticSourceIntrinsicsUnchanged()});
 same(digests);assert.deepEqual(descriptorTree(after),descriptorTree(before));assert.equal(encode(after),encode(before));assert.equal(encode(direct),encode(before));if(originalStaticSourceIntrinsicsUnchanged())assert.equal(fallbacks,0);
 assert.deepEqual(Object.keys(after.copyCertificate),['z','a','numbers']);assert.deepEqual(Object.keys(after.copyCertificate.a),['z','a']);assert.notEqual(after.z[5],after.z[6]);shared.z='changed';assert.equal(after.z[5].z,'λ😀\ud800');assert.equal(proto(after),null);
});

test('complete unsupported shapes retain exact refusal priority without proxy traps or accessor reads',(_t,retain)=>{
 let reads=0;const accessor={};define(accessor,'bad',{__proto__:null,enumerable:true,get(){reads++;throw Error('must not read');}});const hidden={};define(hidden,'bad',{__proto__:null,value:1});const symbol={[Symbol('hidden')]:1},cycle={};cycle.self=cycle;
 const hole=Array(2),extra=[1],hiddenIndex=[1],sameCount=Array(2);extra.extra=2;define(hiddenIndex,'0',{__proto__:null,value:1,enumerable:false});sameCount[0]=1;sameCount.extra=2;
 const values=[new Proxy({},{get(){reads++;throw Error('proxy');},ownKeys(){reads++;throw Error('proxy');}}),accessor,hidden,symbol,cycle,new Map(),new Set(),new Date(),()=>{},Symbol('bad'),1.5,NaN,Infinity,Number.MAX_SAFE_INTEGER+1,Object.create({foreign:true}),hole,extra,hiddenIndex,sameCount],rows=[];
 for(let index=0;index<values.length;index++)append(rows,{index,pair:pair(values[index])});
 const priority={before:cycle};define(priority,'later',{__proto__:null,enumerable:true,get(){reads++;}});append(rows,{priority:true,pair:pair(priority)});retain('all-refusals',{rows,reads});
 for(const row of rows){same(row.pair);assert.ok(row.pair.current.error);}assert.equal(reads,0);assert.match(rows.at(-1).pair.current.error.message,/accessor, symbol or hidden/);
});

test('whole default budgets alias occurrences depth and inherited option callbacks remain exact',(_t,retain)=>{
 const shared=Object.freeze(Array.from({length:100000},()=>null)),rows=[];
 for(const [label,value]of [['cells-at',Array.from({length:199999},()=>null)],['cells-over',Array.from({length:200000},()=>null)],['alias-over',{a:shared,b:shared}],['bytes-at','λ'.repeat(2097152)],['bytes-over','λ'.repeat(2097152)+'x'],['depth-at',depth(160)],['depth-over',depth(161)]])append(rows,{label,pair:pair(value)});
 const defaults=oldAndNew(({record,restore})=>{for(const [key,value]of [['cells',200000],['bytes',4194304],['preserveKeyOrder',false]]){const before=get(Object.prototype,key);define(Object.prototype,key,{__proto__:null,configurable:true,get(){record(key);return value;}});append(restore,()=>{if(before)define(Object.prototype,key,{__proto__:null,...before});else delete Object.prototype[key];});}},()=>({b:[1,'λ'],a:{x:2}}));
 retain('complete-boundaries',{rows,defaults});for(const row of rows)same(row.pair);assert.equal(rows[0].pair.current.error,undefined);assert.ok(rows[1].pair.current.error);assert.ok(rows[2].pair.current.error);assert.equal(rows[3].pair.current.error,undefined);assert.ok(rows[4].pair.current.error);assert.equal(rows[5].pair.current.error,undefined);assert.ok(rows[6].pair.current.error);assert.deepEqual(defaults.current,defaults.old);assert.ok(defaults.current.tape.includes('cells'));
});

test('create define getter nonfunction and pre-import drift retain the exact legacy fallback',(_t,retain)=>{
 const rows=[];
 for(const operation of ['create','defineProperty'])append(rows,{operation,pair:oldAndNew(({record,hook})=>{const fn=Object[operation];hook(Object,operation,function(...args){record({operation,receiver:this===Object,count:args.length});return apply(fn,this,args);});})});
 for(const mode of ['getter','nonfunction','singular-getter'])append(rows,{mode,pair:oldAndNew(({record,restore})=>{
  const key=mode==='singular-getter'?'getOwnPropertyDescriptor':'defineProperty',before=get(Object,key);define(Object,key,{__proto__:null,configurable:true,...(mode==='nonfunction'?{value:3}:{get(){record(key);return before.value;}})});append(restore,()=>define(Object,key,{__proto__:null,...before}));
 })});
 for(const mode of ['foreign-object','global-getter'])append(rows,{mode,pair:oldAndNew(({record,restore})=>{const before=get(globalThis,'Object'),original=before.value;let replacement;if(mode==='foreign-object'){replacement={prototype:original.prototype};for(const key of ['getPrototypeOf','getOwnPropertyDescriptors','hasOwn','create','defineProperty'])replacement[key]=function(...args){record({operation:key,foreignReceiver:this===replacement});return apply(original[key],original,args);};}define(globalThis,'Object',{__proto__:null,configurable:true,...(mode==='global-getter'?{get(){record('global-Object');return original;}}:{value:replacement,writable:true})});append(restore,()=>define(globalThis,'Object',{__proto__:null,...before}));})});
 for(const mode of ['object-proxy','object-nonfunction','getter-mutates-create','getter-mutates-define'])append(rows,{mode,pair:oldAndNew(({record,restore})=>{
  const before=get(root,'Object'),original=before.value,create=get(original,'create'),definition=get(original,'defineProperty');let changed=false;
  append(restore,()=>{define(root,'Object',{__proto__:null,...before});define(original,'create',{__proto__:null,...create});define(original,'defineProperty',{__proto__:null,...definition});});
  const value=mode==='object-proxy'?new Proxy(original,{get(target,key,receiver){record({operation:'Object-proxy-get',key});return Reflect.get(target,key,receiver);},getOwnPropertyDescriptor(target,key){record({operation:'Object-proxy-descriptor',key});return get(target,key);}}):3;
  define(root,'Object',{__proto__:null,configurable:true,...(mode.startsWith('getter-')?{get(){record('mutating-Object-get');if(!changed){changed=true;const key=mode==='getter-mutates-create'?'create':'defineProperty',field=key==='create'?create:definition;define(original,key,{__proto__:null,...field,value(...args){record({operation:'getter-installed-'+key,receiver:this===original});return apply(field.value,this,args);}});}return original;}}:{value,writable:true})});
 })});
 for(const mode of ['root-getter','root-proxy'])append(rows,{mode,pair:oldAndNew(({record,restore})=>{const before=get(root,'globalThis');define(root,'globalThis',{__proto__:null,configurable:true,...(mode==='root-getter'?{get(){record('globalThis-get');return root;}}:{value:new Proxy(root,{getOwnPropertyDescriptor(target,key){record({operation:'root-proxy-descriptor',key});return get(target,key);}}),writable:true})});append(restore,()=>define(root,'globalThis',{__proto__:null,...before}));})});
 const legacyURL=new URL('../extensions/source-links.mjs',import.meta.url).href,childRows=[];
 for(const mode of ['create','defineProperty']){
  const script=`import assert from 'node:assert/strict';const operation=${JSON.stringify(mode)},native=Object[operation],apply=Reflect.apply,define=Object.defineProperty;let count=0;Object[operation]=function(...args){count++;return apply(native,this,args);};try{const {metadataDigest,metadataDigestWithPrivateAssignments:current}=await import(${JSON.stringify(legacyURL)});const value={b:'λ',a:{x:1}};count=0;const old=metadataDigest(value),oldCount=count;count=0;const actual=current(value),actualCount=count;assert.equal(actual,old);assert.equal(actualCount,oldCount);console.log(JSON.stringify({operation,old,actual,oldCount,actualCount,authority:false}));}finally{define(Object,operation,{value:native,writable:true,enumerable:false,configurable:true});}`;
  const output=execFileSync(process.execPath,['--input-type=module','-',],{input:script,encoding:'utf8',timeout:20000,maxBuffer:1048576});append(childRows,{mode,script,output,parsed:JSON.parse(output)});
 }
 for(const mode of ['root-getter','root-proxy']){
  const primitiveURL=new URL('../original-json-intrinsics.mjs',import.meta.url).href;
  const script=`import assert from 'node:assert/strict';const root=globalThis,mode=${JSON.stringify(mode)},get=Object.getOwnPropertyDescriptor,define=Object.defineProperty,before=get(root,'globalThis');let calls=0;const tape=[],record=value=>define(tape,tape.length,{value,enumerable:true,writable:true,configurable:true});define(root,'globalThis',{configurable:true,...(mode==='root-getter'?{get(){calls++;record({operation:'globalThis-get'});return root;}}:{value:new Proxy(root,{getOwnPropertyDescriptor(target,key){calls++;record({operation:'root-descriptor',key});return get(target,key);}}),writable:true})});try{const {copyMetadata,ordinal,metadataDigest,metadataDigestWithPrivateAssignments:current}=await import(${JSON.stringify(legacyURL)}),{copyOriginalDigestMetadata}=await import(${JSON.stringify(primitiveURL)});const importObservations=calls,importTape=tape.slice();let fallbacks=0;calls=0;tape.length=0;const value={a:'λ',b:1},old=metadataDigest(value),oldCalls=calls,oldTape=tape.slice();calls=0;tape.length=0;const actual=current(value),actualCalls=calls,actualTape=tape.slice();tape.length=0;const copy=copyOriginalDigestMetadata(value,value=>{fallbacks++;return copyMetadata(value);},ordinal),copyTape=tape.slice();tape.length=0;const oldCopy=copyMetadata(value),oldCopyTape=tape.slice();assert.equal(actual,old);assert.equal(actualCalls,oldCalls);assert.deepEqual(actualTape,oldTape);assert.deepEqual(copy,oldCopy);assert.deepEqual(copyTape,oldCopyTape);console.log(JSON.stringify({mode,importObservations,importTape,oldCalls,actualCalls,oldTape,actualTape,fallbacks,copy,oldCopy,copyTape,oldCopyTape,authority:false}));}finally{define(root,'globalThis',{...before});}`;
  const output=execFileSync(process.execPath,['--input-type=module','-'],{input:script,encoding:'utf8',timeout:20000,maxBuffer:1048576});append(childRows,{mode,script,output,parsed:JSON.parse(output)});
 }
 retain('complete-intrinsic-drift',{rows,childRows});for(const row of rows)assert.deepEqual(row.pair.current,row.pair.old);for(const row of childRows){if(row.parsed.fallbacks!==undefined){assert.deepEqual(row.parsed.copy,row.parsed.oldCopy);assert.deepEqual(row.parsed.copyTape,row.parsed.oldCopyTape);assert.deepEqual(row.parsed.actualTape,row.parsed.oldTape);assert.equal(row.parsed.actualCalls,row.parsed.oldCalls);}else assert.equal(row.parsed.actualCount,row.parsed.oldCount);}
});

test('native callee selection precedes child callbacks and descriptor conversion follows them without replay',(_t,retain)=>{
 const rows=[];
 for(const mode of ['replace-define','replace-object','descriptor-get','descriptor-set','undefined-get','throw','late-root-getter','late-root-proxy','late-object-proxy','late-object-nonfunction','late-object-getter-mutates']){
  const row=oldAndNew(({record,restore,hook})=>{
   const byteLength=Buffer.byteLength,objectGlobal=get(globalThis,'Object'),definition=get(Object,'defineProperty'),oldGet=get(Object.prototype,'get'),oldSet=get(Object.prototype,'set'),originalObject=Object,rootGlobal=get(root,'globalThis');let changed=false;
   append(restore,()=>{define(root,'globalThis',{__proto__:null,...rootGlobal});define(root,'Object',{__proto__:null,...objectGlobal});define(originalObject,'defineProperty',{__proto__:null,...definition});for(const [key,before]of [['get',oldGet],['set',oldSet]]){if(before)define(originalObject.prototype,key,{__proto__:null,...before});else delete originalObject.prototype[key];}});
   hook(Buffer,'byteLength',function(...args){record({operation:'byteLength',args});if(!changed&&args[0]==='switch'){changed=true;
    if(mode==='replace-define')define(originalObject,'defineProperty',{__proto__:null,...definition,value(...args){record({operation:'late-define',key:args[1],hasA:Object.hasOwn(args[0],'a')});return apply(definition.value,this,args);}});
    if(mode==='replace-object')define(globalThis,'Object',{__proto__:null,...objectGlobal,value:{defineProperty(...args){record({operation:'late-object',key:args[1]});return apply(definition.value,originalObject,args);}}});
    if(mode==='late-object-proxy')define(root,'Object',{__proto__:null,...objectGlobal,value:new Proxy(originalObject,{get(target,key,receiver){record({operation:'late-Object-proxy-get',key});return Reflect.get(target,key,receiver);},getOwnPropertyDescriptor(target,key){record({operation:'late-Object-proxy-descriptor',key});return get(target,key);}})});
    if(mode==='late-object-nonfunction')define(root,'Object',{__proto__:null,...objectGlobal,value:3});
    if(mode==='late-object-getter-mutates')define(root,'Object',{__proto__:null,configurable:true,get(){record('late-Object-get');define(originalObject,'defineProperty',{__proto__:null,...definition,value(...args){record({operation:'getter-late-define',key:args[1]});return apply(definition.value,this,args);}});return originalObject;}});
    if(mode==='descriptor-get'||mode==='descriptor-set')define(originalObject.prototype,mode==='descriptor-get'?'get':'set',{__proto__:null,configurable:true,get(){record({operation:mode,value:this.value});return undefined;}});
    if(mode==='undefined-get')define(originalObject.prototype,'get',{__proto__:null,configurable:true,value:undefined});
    if(mode==='late-root-getter')define(root,'globalThis',{__proto__:null,configurable:true,get(){record('late-globalThis-get');return root;}});
    if(mode==='late-root-proxy')define(root,'globalThis',{__proto__:null,configurable:true,value:new Proxy(root,{getOwnPropertyDescriptor(target,key){record({operation:'late-root-proxy-descriptor',key});return get(target,key);}}),writable:true});
    if(mode==='throw')throw new TypeError('actual Buffer callback refusal');
   }return apply(byteLength,this,args);});
  });append(rows,{mode,pair:row});
 }
 retain('complete-child-mutations',{rows});for(const row of rows)assert.deepEqual(row.pair.current,row.pair.old);for(const row of rows.filter(row=>row.mode.includes('descriptor')||row.mode==='undefined-get'||row.mode==='throw'))assert.equal(row.pair.current.result.error.name,'TypeError');
 const replaced=rows.find(row=>row.mode==='replace-define').pair.current;assert.deepEqual(replaced.tape.filter(row=>row.operation==='late-define').map(row=>row.key),['z']);
});

test('observer-retained outputs never regain privacy and coercible keys array hooks remain legacy operations',(_t,retain)=>{
 const rows=[];
 for(const mode of ['create-proxy','create-freeze','define-freeze'])append(rows,{mode,pair:oldAndNew(({record,restore,hook})=>{
  const create=Object.create,definition=get(Object,'defineProperty'),byteLength=Buffer.byteLength;let retained=null;
  if(mode.startsWith('create'))hook(Object,'create',function(...args){const value=apply(create,this,args);retained=value;record({operation:'create'});return mode==='create-proxy'?new Proxy(value,{defineProperty(target,key,field){record({operation:'proxy-define',key});return Reflect.defineProperty(target,key,field);}}):value;});
  if(mode==='create-freeze')hook(Buffer,'byteLength',function(...args){if(retained)Object.freeze(retained);record({operation:'byteLength'});return apply(byteLength,this,args);});
  if(mode==='define-freeze'){
   hook(Object,'defineProperty',function(...args){record({operation:'define',key:args[1]});const value=apply(definition.value,this,args);retained=args[0];define(Object,'defineProperty',{__proto__:null,...definition});Object.freeze(retained);return value;});
  }
 })});
 const coercion=oldAndNew(({record,restore,hook})=>{
  const ownKeys=Reflect.ownKeys,iterator=Array.prototype[Symbol.iterator];let last=null,passes=0;
  hook(Reflect,'ownKeys',function(...args){const value=apply(ownKeys,this,args);last=value;return value;});
  hook(Array.prototype,Symbol.iterator,function(){if(this!==last)return apply(iterator,this,[]);const owner=this,pass=++passes;let index=0;return {next(){if(index>=owner.length)return {done:true};const key=owner[index++];return {done:false,value:pass===2&&index===1?{[Symbol.toPrimitive](){record('coerce');return key;}}:key};}};});
 });
 const array=oldAndNew(({record,restore,hook})=>{const push=Array.prototype.push;hook(Array.prototype,'push',function(...args){record({operation:'push',length:this.length});return apply(push,this,args);});const length=get(Array.prototype,'length'),old=get(Array.prototype,'127');define(Array.prototype,'127',{__proto__:null,configurable:true,set(value){record({operation:'numeric-set',value});define(this,'127',{__proto__:null,value,enumerable:true,writable:true,configurable:true});}});append(restore,()=>{if(old)define(Array.prototype,'127',{__proto__:null,...old});else delete Array.prototype[127];define(Array.prototype,'length',{__proto__:null,...length});});},()=>Array.from({length:128},(_value,index)=>index));
 retain('complete-output-escape',{rows,coercion,array});for(const row of rows)assert.deepEqual(row.pair.current,row.pair.old);assert.deepEqual(coercion.current,coercion.old);assert.equal(coercion.current.tape.filter(row=>row==='coerce').length,2);assert.deepEqual(array.current,array.old);assert.ok(array.current.tape.some(row=>row.operation==='numeric-set'));
});

function hashTrial(implementation,mode){
 const update=get(Hash.prototype,'update'),digest=get(Hash.prototype,'digest'),stringify=get(JSON,'stringify'),big=get(BigInt.prototype,'toString'),byte=get(Buffer,'byteLength'),tape=[];let receiver=null;
 const record=row=>append(tape,row),value={a:{z:1,a:2},b:['λ😀\ud800',7n]},rows=[];
 try{
  define(Hash.prototype,'update',{__proto__:null,...update,value(...args){if(receiver===null)receiver=this;record({operation:'update',args,types:args.map(value=>typeof value),sameReceiver:this===receiver});if(mode==='mutate')value.a.z++;const result=apply(update.value,this,args);record({operation:'update-return',same:result===this});return result;}});
  define(Hash.prototype,'digest',{__proto__:null,...digest,value(...args){record({operation:'digest',args,sameReceiver:this===receiver});const result=apply(digest.value,this,args);record({operation:'digest-return',result});return result;}});
  if(mode==='json')define(JSON,'stringify',{__proto__:null,...stringify,value(...args){record({operation:'JSON',copy:apply(stringify.value,JSON,[args[0],(_key,item)=>typeof item==='bigint'?{$integer:apply(big.value,item,[])}:item]),replacerSource:String(args[1])});return apply(stringify.value,this,args);}});
  if(mode==='bigint')define(BigInt.prototype,'toString',{__proto__:null,...big,value(...args){record({operation:'bigint',args});return apply(big.value,this,args);}});
  define(Buffer,'byteLength',{__proto__:null,...byte,value(...args){record({operation:'byteLength',args});return apply(byte.value,this,args);}});
  append(rows,outcome(()=>implementation(value)));receiver=null;append(rows,outcome(()=>implementation(value)));
 }finally{define(Hash.prototype,'update',{__proto__:null,...update});define(Hash.prototype,'digest',{__proto__:null,...digest});define(JSON,'stringify',{__proto__:null,...stringify});define(BigInt.prototype,'toString',{__proto__:null,...big});define(Buffer,'byteLength',{__proto__:null,...byte});}
 return {rows,tape,value};
}
test('complete JSON bigint Buffer and native hash observations remain fresh exact and ordered',(_t,retain)=>{
 const rows=[];for(const mode of ['native','json','bigint','mutate'])append(rows,{mode,old:hashTrial(metadataDigest,mode),current:hashTrial(selected,mode)});
 const dynamic=oldAndNew(({record,hook})=>{for(const [owner,key]of [[Object,'getOwnPropertyDescriptors'],[Reflect,'ownKeys'],[Object,'hasOwn'],[Object,'defineProperty'],[Set.prototype,'has'],[Set.prototype,'add'],[Set.prototype,'delete'],[types,'isProxy'],[Number,'isSafeInteger']]){const fn=owner[key];hook(owner,key,function(...args){record({operation:key});return apply(fn,this,args);});}const sort=Array.prototype.sort;hook(Array.prototype,'sort',function(compare){record({operation:'sort',sameComparator:compare===ordinal});return apply(sort,this,[compare]);});},()=>({b:['λ',1],a:{x:2}}));
 const stringKeys=oldAndNew(({record,hook})=>{const string=String;hook(globalThis,'String',function(...args){record('String');const key=apply(string,undefined,args);return {[Symbol.toPrimitive](){record('coerce-string-index');return key;}};});},()=>[1,2]);
 const toJSON=[];for(const prototype of [Object.prototype,Array.prototype])append(toJSON,{prototype:prototype===Array.prototype?'Array':'Object',pair:oldAndNew(({record,hook})=>{hook(prototype,'toJSON',function(){record({operation:'toJSON',array:Array.isArray(this)});return this;});},()=>({items:[{value:'λ'},3n]}))});
 const mutations={a:{x:1},copyCertificate:{z:2,a:1}},first=selected(mutations);mutations.a.x=2;const second=pair(mutations);delete mutations.copyCertificate.z;mutations.copyCertificate.z=2;const ordered=pair(mutations);
 retain('complete-serialization-hashes',{rows,dynamic,stringKeys,toJSON,first,second,ordered});for(const row of rows)assert.deepEqual(row.current,row.old);assert.deepEqual(dynamic.current,dynamic.old);assert.deepEqual(stringKeys.current,stringKeys.old);for(const row of toJSON)assert.deepEqual(row.pair.current,row.pair.old);same(second);same(ordered);assert.notEqual(first,second.current.value);assert.notEqual(second.current.value,ordered.current.value);assert.equal(rows[0].current.tape.filter(row=>row.operation==='update').length,2);
});

test('real method sources CST semantics and private mutation refusals retain independent fresh validation',async(_t,retain)=>{
 const row=methodFixture(),captured=captureOriginalMethodValidation(row.method),before=metadataDigest(row.method),current=originalMethodValidationDigest(row.method,captured.capture),pairs=[pair(row.method),pair(row.lowered),pair(row.transform)],mutations=[];
 for(const label of ['member','lowering','parsed','semantic']){const subject=methodFixture();let result;if(label==='member'){subject.method.receiver='value';result=outcome(()=>originalMethodMember(subject.method));}if(label==='lowering'){subject.lowered.receiverName='changed';result=outcome(()=>originalMethodLowering(subject.lowered));}if(label==='parsed'){subject.parsed.entry.body=false;result=outcome(()=>originalMethodParsedFacts(subject.parsed));}if(label==='semantic'){subject.semantic.body=false;result=outcome(()=>originalMethodSemanticFacts(subject.semantic));}append(mutations,{label,source:subject.source,result});}
 const declaration='#[derive(Clone,Copy)] enum Kind{A}',copySource=declaration+'impl Kind{fn read(self)->u8{1}}',view=captureSourceModuleViews({source:copySource,sourcePath:'src/lib.rs'}).views[0],extracted=extractImplDeclarations(copySource,{sourcePath:'src/lib.rs',sourceView:view}),copyMethod=extracted.implementations[0].methods[0],checked=checkProgram(parseRust(declaration+'fn main(){}')),type={kind:'data',name:'Kind'},certificate=certifyCopyType(type,{declarations:checked.declarations,implementations:extracted.implementations,macroProvenance:macroProvenance(copySource)}),copyLowered=lowerCopyMethodTokens(copyMethod,type,certificate),copyFacts=originalMethodLowering(copyLowered);copyLowered.copyCertificate={...certificate,verified:false};const certificateRefusal=outcome(()=>originalMethodLowering(copyLowered));
 const forged=outcome(()=>originalMethodMember(structuredClone(row.method))),clone=outcome(()=>originalMethodSemantic(structuredClone(row.parsed))),source='pub struct Counter{value:u8}impl Counter{pub fn good(v:u8)->u8{v+2}}pub fn run(v:u8)->u8{Counter::good(v)}',concrete=transportConcreteSyntaxSource(source,{language:'Rust'}),result=translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>concrete.source}),roundTrips=[];
 for(const program of [result.meta.checkedSemanticProgram,result.meta.targetSemanticProgram]){const text=serializeProgram(parseProgram(JSON.stringify(program)));append(roundTrips,{text,again:serializeProgram(parseProgram(text))});}
 retain('complete-private-source',{source,concrete,result,capturedDigest:captured.digest,before,current,pairs,mutations,forged,clone,roundTrips,copySource,certificate,copyFacts,certificateRefusal});assert.equal(certificate.verified,true);assert.equal(certificateRefusal.error.name,'TypeError');assert.equal(current,before);assert.equal(captured.digest,before);for(const p of pairs)same(p);for(const row of mutations)assert.equal(row.result.error.name,'TypeError');assert.equal(forged.error.name,'TypeError');assert.equal(clone.error.name,'TypeError');assert.equal(concrete.source,source);for(const row of roundTrips)assert.equal(row.again,row.text);
 await verifyTypedTargets(result,api=>{assert.equal(api.run(4n),6n);assert.equal(api.run(5n),7n);assert.throws(()=>api.run(255n),RangeError);},{childTimeoutMs:20000});
});
