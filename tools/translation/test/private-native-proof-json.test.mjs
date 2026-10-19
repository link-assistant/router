import {repositorySourceURL} from "./fixtures/repository-paths.mjs";
// Stateless serialization grants no source, owner or executable authority.
import testCase from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';
import {Hash,createHash} from 'node:crypto';
import {types} from 'node:util';
import {writeJsonTextGzip} from '../../evidence/write-json-gzip.mjs';
import {createPrivateFrozenJsonComposer} from '../private-frozen-json.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {createDeriveFootprintContext} from '../derive-footprints.mjs';
import {captureSourceModuleViews} from '../source-module-views.mjs';
import {proveBuiltinDeriveBangFootprint,assertBuiltinDeriveBangFootprint} from '../builtin-derive-bang-footprints.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {translateProject} from '../project.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
const json=JSON.stringify,define=Object.defineProperty,descriptor=Object.getOwnPropertyDescriptor,apply=Reflect.apply,keys=Reflect.ownKeys,prototype=Object.getPrototypeOf;
const sourceURL=new URL('../private-native-proof-json.mjs',import.meta.url),root=new URL('../../../',import.meta.url);
let retainError=null;
function once(source,before,after){assert.equal(source.split(before).length,2);return source.replace(before,after);}
function test(name,run){testCase(name,{timeout:60_000},async t=>{const vectors=[],retain=(kind,value)=>{vectors.push({kind,value});return value;};try{retainError=retain;await run(t,retain);}finally{retainError=null;const folder=process.env.ROUTER_NATIVE_PROOF_JSON_VECTOR_DIR;if(folder){mkdirSync(folder,{recursive:true});writeJsonTextGzip(join(folder,Buffer.from(name).toString('hex')+'.json.gz'),json({name,vectors},(_key,value)=>typeof value==='bigint'?{$integer:String(value)}:value===undefined?{$undefined:true}:typeof value==='number'&&(!Number.isFinite(value)||Object.is(value,-0))?{$number:String(value)}:value));}}});}
function outcome(run){try{return {value:run()};}catch(error){return {caught:error};}}
function materialize(row){if(!row.caught)return {value:row.value};const error=row.caught,fields={name:error.name,message:error.message};if(retainError)retainError('complete-raw-error-after-restoration',{...fields,stack:error.stack});return {error:fields};}
function equal(retain,label,before,current){retain(label,{before,current});assert.deepEqual(current,before);return current;}
async function fixture(t,retain,countCensus=false){
 const folder=mkdtempSync(join(tmpdir(),'router-native-proof-json-'));t.after(()=>rmSync(folder,{recursive:true,force:true}));
 const before=readFileSync(sourceURL,'utf8');let source=before;
 for(const name of ['private-frozen-json.mjs','original-json-intrinsics.mjs','original-lexing-intrinsics.mjs'])source=once(source,"from './"+name+"'","from '"+new URL('../'+name,import.meta.url).href+"'");
 const branch='   if(selected)return apply(stringifyField.value,jsonOwner,[value]);';source=once(source,branch,'   if(selected){nativeCalls++;return apply(stringifyField.value,jsonOwner,[value]);}');
 source=once(source,'  return fallback(value);','  fallbackCalls++;return fallback(value);');
 source+='\nlet nativeCalls=0,fallbackCalls=0;export function receivingFacts(){return {initiallyNative,qualified,ready:nativeReady(),nativeCalls,fallbackCalls};}\n';
 if(countCensus){source=once(source,'  const names=ownKeys(value);','  receivingCensuses++;const names=ownKeys(value);');source+='\nlet receivingCensuses=0;export function receivingCensus(){return receivingCensuses;}\n';}
 const path=join(folder,'receiving.mjs');writeFileSync(path,source);assert.equal(readFileSync(path,'utf8'),source);retain('complete-source-and-instrumentation',{before,source,branch,path});return {module:await import(pathToFileURL(path).href),folder};
}
function pair(retain,label,module,build){const run=factory=>{const {value,tape=[]}=build();return {result:materialize(outcome(()=>factory()(value))),tape};};return equal(retain,label,run(createPrivateFrozenJsonComposer),run(module.createPrivateNativeProofJsonSerializer));}
function chain(depth){let value=1;for(let at=0;at<depth;at++)value={child:value};return value;}
function armed(owner,key,replacement,run){const field=descriptor(owner,key);let row;try{define(owner,key,replacement(field));row=outcome(run);}finally{if(field)define(owner,key,field);else delete owner[key];}return materialize(row);}

test('stateless native selection preserves complete ordinary fresh frozen alias and ordered JSON bytes',async(t,retain)=>{
 const {module}=await fixture(t,retain),start=module.receivingFacts();retain('stock-qualification',start);assert.equal(start.initiallyNative,true);assert.equal(start.qualified,true);assert.equal(start.ready,true);
 for(const frozen of [false,true]){const leaf={value:'λ😀\ud800',number:-0},input={10:'ten',2:'two',recipes:{left:leaf,right:leaf},list:[null,true,3]};if(frozen){Object.freeze(leaf);Object.freeze(input.recipes);Object.freeze(input.list);Object.freeze(input);}const old=createPrivateFrozenJsonComposer()(input),current=module.createPrivateNativeProofJsonSerializer()(input);equal(retain,'complete-bytes-'+frozen,old,current);assert.equal(current,json(input));assert.equal(createHash('sha256').update(current).digest('hex'),createHash('sha256').update(old).digest('hex'));}
 const nullOwner=Object.create(null);nullOwner.__proto__='ordinary own data';assert.equal(module.createPrivateNativeProofJsonSerializer()(nullOwner),json(nullOwner));const final=retain('actual-private-native-counters',module.receivingFacts());if(start.ready){assert.equal(final.nativeCalls-start.nativeCalls,3);assert.equal(final.fallbackCalls,start.fallbackCalls);}else{assert.equal(final.nativeCalls,start.nativeCalls);assert.equal(final.fallbackCalls-start.fallbackCalls,3);}assert.equal(module.createPrivateNativeProofJsonSerializer()({fresh:1}),json({fresh:1}));
});

test('full scalar escapes surrogates numbers integer keys and null prototypes match independent native serialization',async(t,retain)=>{
 const {module}=await fixture(t,retain),strings=Array.from({length:128},(_,at)=>String.fromCharCode(at));strings.push('λ中😀','\ud800','\udc00','\ud800x\udc00','"\\/\b\f\n\r\t','');
 for(const value of [null,true,false,-0,NaN,Infinity,-Infinity,Number.MIN_VALUE,Number.MAX_VALUE,...strings,{strings,numbers:[-0,NaN,Infinity,-Infinity,1e-7,1e21]}]){const old=createPrivateFrozenJsonComposer()(value),current=module.createPrivateNativeProofJsonSerializer()(value);equal(retain,'full-scalar-bytes',old,current);assert.equal(current,json(value));}
 const serial=module.createPrivateNativeProofJsonSerializer(),input={value:1};assert.equal(serial(input),'{"value":1}');input.value=2;assert.equal(serial(input),'{"value":2}');retain('fresh-mutation-observed',{first:'{"value":1}',second:serial(input),facts:module.receivingFacts()});
});

test('whole occurrence cell depth conservative output boundaries and unknown values preserve legacy fallback results',async(t,retain)=>{
 const {module}=await fixture(t,retain);for(const [label,value,eligible]of [['depth160',chain(160),true],['depth161',chain(161),false],['cells200000',Array.from({length:199999},()=>null),true],['cells200001',Array.from({length:200000},()=>null),false],['worst-case-units', 'x'.repeat(1398101),true],['worst-case-units-plus-one','x'.repeat(1398102),true]]){const start=module.receivingFacts(),old=createPrivateFrozenJsonComposer()(value),current=module.createPrivateNativeProofJsonSerializer()(value),end=module.receivingFacts();equal(retain,label,old,current);assert.equal(current,json(value));assert.equal(end.nativeCalls-start.nativeCalls,start.ready&&eligible?1:0);retain('bounded-selection-'+label,{start,end,eligible});}
 const hidden={visible:1};define(hidden,'hidden',{value:undefined});for(const [label,value,eligible]of [['optional-own-data',{missing:undefined,last:1},true],['optional-dense-array',[undefined,1],true],['hidden-optional',hidden,false],['array-hole',[,1],false]]){const start=module.receivingFacts(),old=createPrivateFrozenJsonComposer()(value),current=module.createPrivateNativeProofJsonSerializer()(value),final=module.receivingFacts();equal(retain,label,old,current);assert.equal(current,json(value));assert.equal(final.nativeCalls-start.nativeCalls,start.ready&&eligible?1:0);retain('complete-optional-selection-'+label,{start,final,eligible});}
 for(const value of [undefined,1n,()=>1,Symbol('value'),{missing:undefined},[,1],new Date(0),new Map([['x',1]])]){equal(retain,'unknown-native-tail',materialize(outcome(()=>createPrivateFrozenJsonComposer()(value))),materialize(outcome(()=>module.createPrivateNativeProofJsonSerializer()(value))));}
 const cycle={};cycle.self=cycle;const old=materialize(outcome(()=>createPrivateFrozenJsonComposer()(cycle))),current=materialize(outcome(()=>module.createPrivateNativeProofJsonSerializer()(cycle)));assert.equal(old.error.name,'TypeError');equal(retain,'cyclic-complete-native-error',old,current);
});

test('accessors proxies hooks lazy stacks boxed slots and typed array views retain complete fallback callbacks',async(t,retain)=>{
 const {module}=await fixture(t,retain);
 for(const mode of ['getter','proxy','toJSON','hidden','symbol','boxed','typed','shared-view'])pair(retain,mode,module,()=>{const tape=[];let value={first:1};if(mode==='getter')define(value,'last',{enumerable:true,get(){tape.push('get');return 2;}});if(mode==='proxy')value=new Proxy(value,{ownKeys(target){tape.push('keys');return Reflect.ownKeys(target);},get(target,key,receiver){tape.push('get:'+String(key));return Reflect.get(target,key,receiver);}});if(mode==='toJSON')value.toJSON=function(key){tape.push('toJSON:'+key);return {kept:2};};if(mode==='hidden')define(value,'hidden',{value:2});if(mode==='symbol')value[Symbol('own')]=2;if(mode==='boxed'){value=new Number(3);Object.setPrototypeOf(value,Object.prototype);}if(mode==='typed'){value=new Uint8Array([1,2]);Object.setPrototypeOf(value,Object.prototype);}if(mode==='shared-view'){value=new Uint8Array(typeof SharedArrayBuffer==='function'?new SharedArrayBuffer(2):new ArrayBuffer(2));value[0]=3;Object.setPrototypeOf(value,Object.prototype);}return {value,tape};});
 if(typeof Error.captureStackTrace==='function'){const run=factory=>{const value={ordinary:1},prior=descriptor(Error,'prepareStackTrace'),tape=[];Error.captureStackTrace(value);let row;try{define(Error,'prepareStackTrace',{configurable:true,writable:true,value(){tape.push('format');return 'complete retained stack';}});row=outcome(()=>factory()(value));}finally{if(prior)define(Error,'prepareStackTrace',prior);else delete Error.prepareStackTrace;}return {result:materialize(row),tape};};equal(retain,'native-lazy-descriptor-refusal',run(createPrivateFrozenJsonComposer),run(module.createPrivateNativeProofJsonSerializer));}
});

test('late global owners native predicates inherited hooks and descriptor drift fall back before any new callback',async(t,retain)=>{
 const {module}=await fixture(t,retain),globalRoot=globalThis;
 for(const mode of ['global-getter','global-proxy','object-getter','json-getter','json-hook','prototype-toJSON']){const run=factory=>{const tape=[],owner=mode==='prototype-toJSON'?Object.prototype:mode==='json-hook'?JSON:globalRoot,key=mode==='prototype-toJSON'?'toJSON':mode==='json-hook'?'stringify':mode.startsWith('global')?'globalThis':mode==='object-getter'?'Object':'JSON',original=descriptor(owner,key);const replacement=field=>mode==='global-proxy'?{...field,value:new Proxy(globalRoot,{getOwnPropertyDescriptor(target,key){tape.push('global-descriptor:'+String(key));return descriptor(target,key);}})}:mode==='prototype-toJSON'?{configurable:true,value:function(){tape.push('inherited-toJSON');return 4;}}:mode==='json-hook'?{...field,value:function(...args){tape.push('json');return apply(field.value,this,args);}}:{configurable:field.configurable,enumerable:field.enumerable,get(){tape.push(key+' getter');return field.value;}};const result=armed(owner,key,replacement,()=>factory()({value:'x'}));assert.deepEqual(descriptor(owner,key),original);return {result,tape};};const before=run(createPrivateFrozenJsonComposer),current=run(module.createPrivateNativeProofJsonSerializer);retain('complete-altered-owner-'+mode,{before,current});assert.deepEqual(current.result,before.result);if(mode==='json-hook'||mode==='prototype-toJSON')assert.deepEqual(current.tape,before.tape);else if(module.receivingFacts().ready)assert.deepEqual(current.tape,[]);}
 const run=factory=>{const field=descriptor(ArrayBuffer,'isView'),tape=[];return {result:armed(ArrayBuffer,'isView',()=>({...field,value:function(value){tape.push('isView');return apply(field.value,this,[value]);}}),()=>factory()({value:1})),tape};};equal(retain,'optional-predicate-does-not-run',run(createPrivateFrozenJsonComposer),run(module.createPrivateNativeProofJsonSerializer));
 const boxed=factory=>{const field=descriptor(types,'isBoxedPrimitive'),tape=[];return {result:armed(types,'isBoxedPrimitive',()=>({enumerable:field.enumerable,configurable:field.configurable,get(){tape.push('boxed-getter');return field.value;}}),()=>factory()({value:1})),tape};};equal(retain,'optional-boxed-accessor-is-not-invoked',boxed(createPrivateFrozenJsonComposer),boxed(module.createPrivateNativeProofJsonSerializer));
});

test('JSON fallback reentry and unchanged outer Hash fences retain all full input payloads and source receipts',async(t,retain)=>{
 const {module}=await fixture(t,retain),input={source:'fn keep(value:u8)->u8{value}',proof:{recipes:[{value:'λ'}],bytes:[0,1,255]}};
 function hashed(factory){const update=descriptor(Hash.prototype,'update'),digest=descriptor(Hash.prototype,'digest'),tape=[],rawStacks=[];let row;try{define(Hash.prototype,'update',{...update,value:function(...args){tape.push({op:'update',args});rawStacks.push({op:'update',stack:new Error().stack});return apply(update.value,this,args);}});define(Hash.prototype,'digest',{...digest,value:function(...args){const value=apply(digest.value,this,args);tape.push({op:'digest',args,value});rawStacks.push({op:'digest',stack:new Error().stack});return value;}});row=outcome(()=>createHash('sha256').update(factory()(input)).digest('hex'));}finally{define(Hash.prototype,'update',update);define(Hash.prototype,'digest',digest);}return {result:materialize(row),tape,rawStacks};}const oldHashes=hashed(createPrivateFrozenJsonComposer),newHashes=hashed(module.createPrivateNativeProofJsonSerializer);retain('complete-raw-Hash-observations',{before:oldHashes,current:newHashes});equal(retain,'full-unmodified-Hash-fences',{result:oldHashes.result,tape:oldHashes.tape},{result:newHashes.result,tape:newHashes.tape});assert.equal(newHashes.tape.length,2);assert.equal(newHashes.tape[0].args[0],json(input));
 function observed(factory){const field=descriptor(JSON,'stringify'),tape=[];let nested=false,row;try{define(JSON,'stringify',{...field,value:function(...args){tape.push({receiverIsJSON:this===JSON,args});if(!nested){nested=true;factory()({nested:true});}return apply(field.value,this,args);}});row=outcome(()=>factory()(input));}finally{define(JSON,'stringify',field);}return {result:materialize(row),tape};}equal(retain,'full-JSON-reentrant-fallback',observed(createPrivateFrozenJsonComposer),observed(module.createPrivateNativeProofJsonSerializer));
});

test('cold changed optional native qualification keeps the complete old native operation and bounded child evidence',async(t,retain)=>{
 const {folder}=await fixture(t,retain);
 for(const mode of ['boxed-predicate','view-predicate','global-proxy']){const script=`import {types} from 'node:util';\nconst root=globalThis,get=Object.getOwnPropertyDescriptor,define=Object.defineProperty,apply=Reflect.apply,json=JSON.stringify,tape=[];\nconst legacy=await import(${json(new URL('../private-frozen-json.mjs',import.meta.url).href)});\nconst owner=${mode==='boxed-predicate'?'types':mode==='view-predicate'?'ArrayBuffer':'root'},key=${json(mode==='boxed-predicate'?'isBoxedPrimitive':mode==='view-predicate'?'isView':'globalThis')},field=get(owner,key);\nlet candidate;try{define(owner,key,${mode==='global-proxy'?"{...field,value:new Proxy(root,{getOwnPropertyDescriptor(target,key){tape.push(String(key));return get(target,key);}})}":"{...field,value:function(value){tape.push(key);return apply(field.value,this,[value]);}}"});candidate=await import(${json(sourceURL.href)});}finally{define(owner,key,field);}\nconst input={value:'λ'},before=legacy.createPrivateFrozenJsonComposer()(input),current=candidate.createPrivateNativeProofJsonSerializer()(input);\nconsole.log(json({before,current,tape,sourceOnlyAuthority:false}));\n`;const path=join(folder,'cold-'+mode+'.mjs');writeFileSync(path,script);const child=spawnSync(process.execPath,[path],{encoding:'utf8',timeout:20_000,maxBuffer:4*1024*1024});retain('complete-cold-'+mode,{script,path,status:child.status,signal:child.signal,stdout:child.stdout,stderr:child.stderr,error:child.error?{name:child.error.name,message:child.error.message}:null});assert.equal(child.error,undefined);assert.equal(child.status,0);const row=JSON.parse(child.stdout);assert.equal(row.before,row.current);assert.equal(row.sourceOnlyAuthority,false);}
});

test('genuine private Copy source proof bytes reissues forgeries and strict emitted targets remain independently checked',async(t,retain)=>{
 const {module}=await fixture(t,retain),source='#[derive(Copy,Debug)]pub struct Payload{value:u8}pub fn keep(value:u8)->u8{value}',cargo={manifest:readFileSync(repositorySourceURL('Cargo.toml',root),'utf8'),lock:readFileSync(repositorySourceURL('Cargo.lock',root),'utf8')},dependencies=loadDeriveDependencyProof(cargo),views=captureSourceModuleViews({source,sourcePath:'src/lib.rs',compilationProfile:PRODUCTION_PROFILE}),entry={file:'src/lib.rs',path:[],source,sourceView:views.views[0],compilationProfile:PRODUCTION_PROFILE},context=createDeriveFootprintContext({modules:[entry],dependencies,compilationProfile:PRODUCTION_PROFILE}),certificate=context.certificates.find(row=>row.name==='Payload');assert.ok(certificate);const attribute=certificate.attributes.find(row=>row.name==='derive');retain('full-genuine-private-input-and-source',{source,cargo,views,entry,context,certificate});
 for(const name of ['Copy','Debug']){const invocation={path:[name],attributeSpan:attribute.span},proof=proveBuiltinDeriveBangFootprint({context,certificate,invocation});retain('full-genuine-proof-'+name,{invocation,proof});assertBuiltinDeriveBangFootprint(proof,context,certificate,invocation);assert.throws(()=>assertBuiltinDeriveBangFootprint(structuredClone(proof),context,certificate,invocation));const start=module.receivingFacts(),before=createPrivateFrozenJsonComposer()(proof),current=module.createPrivateNativeProofJsonSerializer()(proof),final=module.receivingFacts();equal(retain,'full-genuine-proof-serialization-'+name,before,current);assert.equal(current,json(proof));equal(retain,'full-source-proof-sha-'+name,createHash('sha256').update(before).digest('hex'),createHash('sha256').update(current).digest('hex'));retain('actual-full-proof-selection-'+name,{start,final,nativeSelected:final.nativeCalls===start.nativeCalls+1,scope:'Receiving observations only; no invented fit or gain from metadata.'});}

 const translated=translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source});retain('complete-current-translation',{source,result:translated});await verifyTypedTargets(translated,api=>{assert.deepEqual([api.keep(0n),api.keep(1n),api.keep(255n)],[0n,1n,255n]);assert.throws(()=>api.keep(256n),RangeError);},{childTimeoutMs:20_000});
});

// The explicit native format now measures complete DAG nodes once PER CALL,
// recharging logical occurrences, and uses actual JSON quotation units. This
// intentionally changes eligibility at the old conservative bound, not bytes.
test('precise string and key quotation stays within the same eight MiB limit with exact native bytes',async(t,retain)=>{
 const {module}=await fixture(t,retain),limit=8388608;
 for(const [label,value,eligible]of [['ASCII-exact-units','x'.repeat(limit-2),true],['ASCII-over-units','x'.repeat(limit-1),false],['key-exact-units',{['x'.repeat(limit-9)]:null},true],['key-over-units',{['x'.repeat(limit-8)]:null},false]]){
  const start=module.receivingFacts(),before=createPrivateFrozenJsonComposer()(value),current=module.createPrivateNativeProofJsonSerializer()(value),final=module.receivingFacts();
  equal(retain,label,{value,before},{value,before:current});assert.equal(current,json(value));assert.equal(final.nativeCalls-start.nativeCalls,start.ready&&eligible?1:0);retain(label+'-actual-selection',{start,final,eligible,nativeUnits:current.length});
 }
 for(const value of ['"','\\','\b\t\n\f\r\x00\x1f','\ud800','\udc00','\ud800x\udc00','😀','\ud800\udc00','\ud800\ud800\udc00\udc00',{['"'+'\\'+'\x00\ud800😀']:'\n\udc00'}]){
  const before=createPrivateFrozenJsonComposer()(value),current=module.createPrivateNativeProofJsonSerializer()(value);equal(retain,'complete-escape-and-surrogate-cost',{value,before},{value,before:current});assert.equal(current,json(value));
 }
});

test('invocation-local DAG measurements avoid repeated censuses but recharge every occurrence depth and cycle',async(t,retain)=>{
 const {module}=await fixture(t,retain,true),serialize=module.createPrivateNativeProofJsonSerializer();
 for(const [label,length,eligible]of [['shared-cells-within',99999,true],['shared-cells-exceed',100000,false]]){
  const leaf={value:null},value=Array.from({length},()=>leaf),start=module.receivingFacts(),censuses=module.receivingCensus(),before=createPrivateFrozenJsonComposer()(value),current=serialize(value),final=module.receivingFacts();
  equal(retain,label,{value,before},{value,before:current});assert.equal(current,json(value));assert.equal(final.nativeCalls-start.nativeCalls,start.ready&&eligible?1:0);assert.equal(module.receivingCensus()-censuses,start.ready?2:0);retain(label+'-complete-cost-observation',{start,final,logicalCells:1+length*2,censuses:module.receivingCensus()-censuses});
 }
 const leaf={value:null};for(const [label,levels,eligible]of [['alias-depth160',158,true],['alias-depth161',159,false]]){
  let deeper=leaf;for(let at=0;at<levels;at++)deeper={child:deeper};const value={first:leaf,deeper},start=module.receivingFacts(),before=createPrivateFrozenJsonComposer()(value),current=serialize(value),final=module.receivingFacts();equal(retain,label,{value,before},{value,before:current});assert.equal(final.nativeCalls-start.nativeCalls,start.ready&&eligible?1:0);
 }
 const first={value:1},value={left:first,right:first};assert.equal(serialize(value),json(value));first.value=2;assert.equal(serialize(value),json(value));retain('mutable-next-call-is-fresh',{value,result:serialize(value)});
 const cycle={};cycle.back=cycle;equal(retain,'DAG-table-never-closes-active-cycle',materialize(outcome(()=>createPrivateFrozenJsonComposer()(cycle))),materialize(outcome(()=>serialize(cycle))));
 const poisonous={shared:leaf};define(poisonous,'late',{enumerable:true,get(){throw new Error('actual fallback getter');}});equal(retain,'failed-partial-scan-never-warms-next-call',materialize(outcome(()=>createPrivateFrozenJsonComposer()(poisonous))),materialize(outcome(()=>serialize(poisonous))));delete poisonous.shared;assert.equal(serialize(value),json(value));
});

test('new measurement operations retain late and cold native refusal without exposing private tables',async(t,retain)=>{
 const {module,folder}=await fixture(t,retain);
 for(const [owner,key]of [[WeakMap.prototype,'get'],[WeakMap.prototype,'set'],[String.prototype,'charCodeAt'],[RegExp.prototype,'exec']]){
  const run=factory=>{const field=descriptor(owner,key),tape=[];return {result:armed(owner,key,()=>({...field,value:function(...args){tape.push({key,args});return apply(field.value,this,args);}}),()=>factory()({first:'"\ud800',second:{value:1}})),tape};};
  equal(retain,'complete-late-measurement-operation-'+key,run(createPrivateFrozenJsonComposer),run(module.createPrivateNativeProofJsonSerializer));
 }
 for(const mode of ['weak-get','weak-set','char-code','regexp-exec']){
  const script=`const get=Object.getOwnPropertyDescriptor,define=Object.defineProperty,apply=Reflect.apply,json=JSON.stringify,tape=[];\nconst legacy=await import(${json(new URL('../private-frozen-json.mjs',import.meta.url).href)});\nconst owner=${mode==='char-code'?'String.prototype':mode==='regexp-exec'?'RegExp.prototype':'WeakMap.prototype'},key=${json(mode==='weak-get'?'get':mode==='weak-set'?'set':mode==='regexp-exec'?'exec':'charCodeAt')},field=get(owner,key);let candidate;try{define(owner,key,{...field,value:function(...args){tape.push(key);return apply(field.value,this,args);}});candidate=await import(${json(sourceURL.href)});}finally{define(owner,key,field);}\nconst value={left:{value:'😀'},right:'\\ud800'},before=legacy.createPrivateFrozenJsonComposer()(value),current=candidate.createPrivateNativeProofJsonSerializer()(value);console.log(json({before,current,tape,sourceAuthority:false}));\n`;
  const path=join(folder,'cold-measurement-'+mode+'.mjs');writeFileSync(path,script);const child=spawnSync(process.execPath,[path],{encoding:'utf8',timeout:20_000,maxBuffer:4*1024*1024});retain('complete-cold-measurement-'+mode,{script,path,status:child.status,signal:child.signal,stdout:child.stdout,stderr:child.stderr,error:child.error?{name:child.error.name,message:child.error.message}:null});assert.equal(child.error,undefined);assert.equal(child.status,0);const row=JSON.parse(child.stdout);assert.equal(row.before,row.current);assert.equal(row.sourceAuthority,false);
 }
});


test('native regex matches and own result slots cannot expose measurements through prototype hooks',async(t,retain)=>{
 const {module}=await fixture(t,retain),value={['"'+'\\'+'\ud800']:'\x00\udc00😀'},expected=json(value);
 for(const [owner,key]of [[RegExp.prototype,Symbol.match],[RegExp.prototype,'lastIndex'],[Array.prototype,'index'],[Array.prototype,'0']]){
  const field=descriptor(owner,key),lengthField=owner===Array.prototype&&key==='0'?descriptor(Array.prototype,'length'):null,events={first:null,last:null};let captured;
  const note=(operation,value)=>{const row={operation,key:String(key),value,next:null};if(events.last)events.last.next=row;else events.first=row;events.last=row;};
  try{define(owner,key,{configurable:true,enumerable:false,get(){note('get',undefined);return undefined;},set(value){note('set',value);}});captured=outcome(()=>module.createPrivateNativeProofJsonSerializer()(value));}
  finally{if(field)define(owner,key,field);else delete owner[key];if(lengthField)define(Array.prototype,'length',lengthField);}
  const current=materialize(captured),tape=[];for(let row=events.first;row;row=row.next)tape.push({operation:row.operation,key:row.key,value:row.value});retain('complete-private-native-match-hook-control',{owner:owner===RegExp.prototype?'RegExp.prototype':'Array.prototype',key:String(key),value,current,tape});assert.deepEqual(current,{value:expected});assert.deepEqual(tape,[]);
 }
});

// Receiving-only counters on the complete current source; never proof authority.
async function shortStringFixture(t,retain){
 const folder=mkdtempSync(join(tmpdir(),'router-native-proof-short-string-'));t.after(()=>rmSync(folder,{recursive:true,force:true}));
 const before=readFileSync(sourceURL,'utf8'),steps=[];let source=before;
 const step=(old,next)=>{assert.equal(source.split(old).length,2);const previous=source;source=source.replace(old,()=>next);assert.equal(source.replace(next,()=>old),previous);steps.push({before:old,after:next});};
 for(const name of ['private-frozen-json.mjs','original-json-intrinsics.mjs','original-lexing-intrinsics.mjs'])step("from './"+name+"'","from '"+new URL('../'+name,import.meta.url).href+"'");
 step('  const special=','  receivingScans++;const special=');
 step("(binaryArgs[0]=value,binaryArgs[1]=count,apply(mapSet,quotedCosts,binaryArgs));quotedEntries++;","(binaryArgs[0]=value,binaryArgs[1]=count,apply(mapSet,quotedCosts,binaryArgs));quotedEntries++;receivingWrites++;");
 step('   if(selected)return apply(stringifyField.value,jsonOwner,[value]);','   if(selected){receivingNative++;return apply(stringifyField.value,jsonOwner,[value]);}');
 step('  return fallback(value);','  receivingFallback++;return fallback(value);');
 source+='\nlet receivingScans=0,receivingWrites=0,receivingNative=0,receivingFallback=0;export function shortStringFacts(){return {scans:receivingScans,writes:receivingWrites,native:receivingNative,fallback:receivingFallback,ready:nativeReady()};}\n';
 const path=join(folder,'short-string.mjs');writeFileSync(path,source);assert.equal(readFileSync(path,'utf8'),source);retain('complete-short-string-counter-source',{before,source,steps,path});return {module:await import(pathToFileURL(path).href),folder};
}

test('short quotation costs are exact per-call scalar measurements with every repeated occurrence charged',async(t,retain)=>{
 const {module}=await shortStringFixture(t,retain),serialize=module.createPrivateNativeProofJsonSerializer(),value=Array.from({length:1000},()=>({repeat:'same',key:'same'}));
 for(let invocation=0;invocation<2;invocation++){
  const start=module.shortStringFacts(),current=serialize(value),final=module.shortStringFacts();assert.equal(start.ready,true);assert.equal(current,json(value));assert.equal(final.scans-start.scans,3);assert.equal(final.writes-start.writes,3);assert.equal(final.native-start.native,1);retain('full-fresh-short-string-call',{invocation,value,current,start,final});
 }
 value[0].repeat='changed';const start=module.shortStringFacts();assert.equal(serialize(value),json(value));assert.equal(module.shortStringFacts().scans-start.scans,4);
 for(const text of ['','"\\\x00\b\t\n\f\r','\ud800','\udc00','\ud800x\udc00','😀','\ufffd']){
  const value=[text,text,text],start=module.shortStringFacts(),current=serialize(value),final=module.shortStringFacts();assert.equal(current,json(value));assert.equal(final.scans-start.scans,1);retain('exact-repeated-UTF16-cost',{value,current,start,final});
 }
 const over=Array.from({length:11000},()=> '\x00'.repeat(128)),before=module.shortStringFacts(),current=serialize(over),after=module.shortStringFacts();assert.equal(current,json(over));assert.equal(after.native,before.native);assert.equal(after.fallback-before.fallback,1);assert.equal(after.scans-before.scans,1);retain('every-memo-hit-still-charges-eight-MiB',{input:over,current,before,after});
});

test('short quotation memo limits retain exact regex fallback for long and over-quota strings',async(t,retain)=>{
 const {module}=await shortStringFixture(t,retain),serialize=module.createPrivateNativeProofJsonSerializer(),value=Array.from({length:5000},(_,at)=>'s'+at);value.push('s0','s4095','s4096','s4096');
 for(let invocation=0;invocation<2;invocation++){
  const start=module.shortStringFacts(),current=serialize(value),final=module.shortStringFacts();assert.equal(current,json(value));assert.equal(final.scans-start.scans,5002);assert.equal(final.writes-start.writes,4096);assert.equal(final.native-start.native,1);retain('complete-saturation-and-fresh-reset',{invocation,value,current,start,final});
 }
 for(const [length,scans,writes]of [[128,1,1],[129,2,0]]){
  const value=['x'.repeat(length),'x'.repeat(length)],start=module.shortStringFacts(),current=serialize(value),final=module.shortStringFacts();assert.equal(current,json(value));assert.equal(final.scans-start.scans,scans);assert.equal(final.writes-start.writes,writes);retain('complete-short-string-cutoff',{length,value,current,start,final});
 }
});

test('short quotation Map qualification refuses late and cold hooks without exposing private strings or tables',async(t,retain)=>{
 const {module,folder}=await shortStringFixture(t,retain);
 for(const key of ['get','set']){
  for(const accessor of [false,true]){
   const run=factory=>{const field=descriptor(Map.prototype,key),tape=[];return {result:armed(Map.prototype,key,()=>accessor?{enumerable:field.enumerable,configurable:field.configurable,get(){tape.push({key,operation:'descriptor-get'});return field.value;}}:{...field,value:function(...args){tape.push({key,args});return apply(field.value,this,args);}},()=>factory()({key:'repeated',another:'repeated'})),tape};};
   equal(retain,'full-late-Map-'+key+'-'+accessor,run(createPrivateFrozenJsonComposer),run(module.createPrivateNativeProofJsonSerializer));
  }
 }
 const field=descriptor(globalThis,'Map'),tape=[];let row;
 try{define(globalThis,'Map',{enumerable:field.enumerable,configurable:field.configurable,get(){tape.push('global-Map');return field.value;}});row=outcome(()=>module.createPrivateNativeProofJsonSerializer()({key:'repeated',another:'repeated'}));}finally{define(globalThis,'Map',field);}
 assert.deepEqual(materialize(row),{value:'{"key":"repeated","another":"repeated"}'});assert.deepEqual(tape,[]);retain('unchanged-fixed-owner-global-binding-contract',{row:materialize(row),tape});
 for(const key of ['get','set']){
  const script=`const get=Object.getOwnPropertyDescriptor,define=Object.defineProperty,apply=Reflect.apply,json=JSON.stringify,tape=[];\nconst legacy=await import(${json(new URL('../private-frozen-json.mjs',import.meta.url).href)});\nconst owner=Map.prototype,key=${json(key)},field=get(owner,key);let candidate;try{define(owner,key,{...field,value:function(...args){tape.push(key);return apply(field.value,this,args);}});candidate=await import(${json(sourceURL.href)});}finally{define(owner,key,field);}\nconst value={first:'\\ud800',second:'\\ud800'},before=legacy.createPrivateFrozenJsonComposer()(value),current=candidate.createPrivateNativeProofJsonSerializer()(value);console.log(json({before,current,tape,sourceAuthority:false}));\n`;
  const path=join(folder,'cold-Map-'+key+'.mjs');writeFileSync(path,script);const child=spawnSync(process.execPath,[path],{encoding:'utf8',timeout:20_000,maxBuffer:4*1024*1024});retain('complete-cold-Map-'+key,{script,path,status:child.status,signal:child.signal,stdout:child.stdout,stderr:child.stderr,error:child.error?{name:child.error.name,message:child.error.message}:null});assert.equal(child.error,undefined);assert.equal(child.status,0);const result=JSON.parse(child.stdout);assert.equal(result.before,result.current);assert.equal(result.sourceAuthority,false);
 }
});

// All old15 callbacks exercise the current source. These additions mix native
// argument widths and recursion; no copied scanner supplies expected answers.
test('private dense native arguments reset across recursive aliases quotation operations and independent calls',async(t,retain)=>{
 const {module}=await fixture(t,retain,true),serialize=module.createPrivateNativeProofJsonSerializer(),leaf={['"\\\ud800']:'\x00\udc00😀'},value={first:[leaf,{child:leaf}],second:leaf,strings:['\ud800x\udc00','😀','"\\\x00','same','same'],scalars:[true,false,null,-0,NaN,undefined]};
 for(let invocation=0;invocation<3;invocation++){
  const start=module.receivingFacts(),before=createPrivateFrozenJsonComposer()(value),current=serialize(value),final=module.receivingFacts();assert.equal(start.ready,true);assert.equal(current,before);assert.equal(current,json(value));assert.equal(final.nativeCalls-start.nativeCalls,1);retain('complete-recursive-native-argument-reset',{invocation,value,before,current,start,final});leaf['"\\\ud800']=invocation===0?'\ud800😀\udc00':'changed'+invocation;
 }
 const cycle={};cycle.loop=cycle;equal(retain,'argument-state-on-cycle-refusal',materialize(outcome(()=>createPrivateFrozenJsonComposer()(cycle))),materialize(outcome(()=>serialize(cycle))));
 for(const mode of ['getter','proxy','toJSON'])pair(retain,'full-argument-state-refusal-'+mode,module,()=>{const tape=[];let value={first:'\ud800',last:1};if(mode==='getter')define(value,'last',{enumerable:true,get(){tape.push('last-get');return {leaf:'😀'};}});if(mode==='proxy')value=new Proxy(value,{ownKeys(target){tape.push('ownKeys');return keys(target);},get(target,key,receiver){tape.push('get:'+String(key));return Reflect.get(target,key,receiver);}});if(mode==='toJSON')value.toJSON=function(key){tape.push('toJSON:'+key);return {result:'\x00'};};return {value,tape};});
 const next={again:[{value:'\ud800😀'},leaf,leaf]},start=module.receivingFacts(),current=serialize(next),final=module.receivingFacts();assert.equal(current,json(next));assert.equal(final.nativeCalls-start.nativeCalls,1);retain('complete-fresh-call-after-all-refusals',{next,current,start,final});
});

test('private dense native argument own slots avoid numeric inherited accessors and nonwritable prototype cells',async(t,retain)=>{
 const {module}=await fixture(t,retain),serialize=module.createPrivateNativeProofJsonSerializer(),value={first:[{text:'\ud800x\udc00'},true],second:{bytes:'"\\\x00😀',tail:null}},expected=json(value);
 for(const key of ['0','1'])for(const mode of ['accessor','nonwritable']){
  const field=descriptor(Array.prototype,key),lengthField=descriptor(Array.prototype,'length'),events={first:null,last:null},start=module.receivingFacts();let captured;
  const note=(operation,value)=>{const row={operation,value,next:null};if(events.last)events.last.next=row;else events.first=row;events.last=row;};
  try{define(Array.prototype,key,mode==='accessor'?{configurable:true,enumerable:false,get(){note('get',undefined);return undefined;},set(value){note('set',value);}}:{configurable:true,enumerable:false,writable:false,value:'inherited numeric poison'});captured=outcome(()=>serialize(value));}
  finally{if(field)define(Array.prototype,key,field);else delete Array.prototype[key];define(Array.prototype,'length',lengthField);}
  const current=materialize(captured),final=module.receivingFacts(),tape=[];for(let row=events.first;row;row=row.next)tape.push({operation:row.operation,value:row.value});assert.deepEqual(descriptor(Array.prototype,'length'),lengthField);assert.deepEqual(current,{value:expected});assert.deepEqual(tape,[]);assert.equal(final.nativeCalls-start.nativeCalls,1);retain('complete-native-argument-prototype-control',{key,mode,value,current,start,final,tape,lengthField});
 }
});
