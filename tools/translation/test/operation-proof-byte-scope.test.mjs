import testCase from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash,Hash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import {prepareOperationProofByteSources} from '../prepare-operation-proof-byte-sources.mjs';
import {withOperationProofByteComposition as operation} from '../operation-proof-byte-scope.mjs';
import {createScopedPrivateNativeProofJsonSerializer} from '../private-native-proof-json.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
const nativeJSON=JSON.stringify,get=Object.getOwnPropertyDescriptor,define=Object.defineProperty,apply=Reflect.apply;
const root=new URL('../../../',import.meta.url),hash=value=>createHash('sha256').update(value).digest('hex');
let vectors=[];const retain=(kind,value)=>{vectors.push({kind,value});return value;};
const test=(name,run)=>testCase(name,{timeout:60000},async()=>{vectors=[];try{await run();}finally{const directory=process.env.ROUTER_OPERATION_PROOF_BYTE_EVIDENCE_DIR;if(directory){mkdirSync(directory,{recursive:true});const raw=Buffer.from(nativeJSON({name,vectors})+'\n'),packed=gzipSync(raw,{mtime:0});assert.deepEqual(gunzipSync(packed),raw);writeFileSync(join(directory,hash(name)+'.json.gz'),packed);}}});
function freeze(value){if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;}
function shared(){return freeze({source:'// complete source 😀\r\n'.repeat(180),schema:'source-DATA-only',tokens:Array.from({length:128},(_,at)=>({at,text:'token-'+at}))});}
function outcome(run){try{return {value:run()};}catch(error){return {error:{name:error.name,message:error.message}};}}
function jsonObserver(subject,run){const before=get(JSON,'stringify'),tape=[];try{define(JSON,'stringify',{...before,value:function(...args){tape.push({sameReceiver:this===JSON,arguments:args.map(value=>value===subject?{originalSubject:true}:{kind:typeof value,primitive:value===null||typeof value!=='object'&&typeof value!=='function'?value:undefined})});return apply(before.value,this,args);}});return {result:outcome(run),tape};}finally{define(JSON,'stringify',before);}}
function hashObserver(run){const update=get(Hash.prototype,'update'),digest=get(Hash.prototype,'digest'),tape=[];try{define(Hash.prototype,'update',{...update,value:function(...args){tape.push({operation:'update',payloads:args.map(value=>typeof value==='string'?value:{base64:Buffer.from(value).toString('base64')})});return apply(update.value,this,args);}});define(Hash.prototype,'digest',{...digest,value:function(...args){const value=apply(digest.value,this,args);tape.push({operation:'digest',args,value});return value;}});return {value:run(),tape};}finally{define(Hash.prototype,'update',update);define(Hash.prototype,'digest',digest);}}
test('complete original native declarations retain both source phases full inverses original budgets and unchanged defaults',()=>{
 const plan=retain('complete-native-source-plan',prepareOperationProofByteSources()),row=plan.files[0];assert.equal(plan.typescriptVersion,'5.9.3');assert.equal(plan.existingDefaultsUnchanged,true);assert.equal(plan.arithmeticScopeUnchanged,true);assert.equal(plan.newAcrossInvocationEncodedCache,false);assert.equal(plan.performanceQualified,false);assert.equal(row.current,row.after);assert.equal(row.before,readFileSync(new URL(plan.input.path,root),'utf8'));assert.equal(row.inverse,row.before);assert.equal(hash(row.before),row.beforeSha256);assert.equal(hash(row.after),row.afterSha256);assert.equal(row.fallbackEdits.length,5);assert.deepEqual(row.nativeBindings.unboundIdentifiers,[]);
 assert.equal(transportConcreteSyntaxMeta(row.beforeMeta).source,row.before);assert.equal(transportConcreteSyntaxMeta(row.afterMeta).source,row.after);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);for(const stage of row.stages){assert.equal(stage.completeInverse,true);assert.equal(transportConcreteSyntaxMeta(stage.beforeMeta).source,stage.before);assert.equal(transportConcreteSyntaxMeta(stage.afterMeta).source,stage.after);}assert.ok(row.after.includes('ENTRY_BYTES=4194304,TOTAL_BYTES=8388608,ENTRIES=16,CELLS=200000,DEPTH=160'));for(const edit of row.fallbackEdits)assert.equal(row.language.slice(...edit.span),edit.expected);
});
test('one synchronous operation composes repeated complete immutable DATA fields and every exact native hash payload',()=>{
 const common=shared(),inputs=Array.from({length:12},(_,at)=>({compilerMeta:common,recipes:[common],sequence:at,unicode:'\u0000\r\n😀\ud800',negativeZero:-0}));retain('complete-inputs',inputs);
 const expected=hashObserver(()=>inputs.map(value=>{const text=nativeJSON(value);return {text,digest:createHash('sha256').update(text).digest('hex')};}));
 const actual=hashObserver(()=>operation(serialize=>inputs.map(value=>{const text=serialize(value);return {text,digest:createHash('sha256').update(text).digest('hex')};})));retain('complete-old-and-new-Hash-payload-tapes',{expected,actual});assert.deepEqual(actual,expected);
 assert.deepEqual(operation(serialize=>[undefined,null,true,1,'😀'].map(value=>serialize(value))),[undefined,'null','true','1','"😀"']);
});
test('changed JSON hooks accessors proxies and cycles retain the complete original serializer fallback and errors',()=>{
 const values=[{get value(){return 'accessor';}},new Proxy({value:'proxy'},{}),{value:1,toJSON(){return {replacement:true};}},(()=>{const value={};value.self=value;return value;})()];
 for(const value of values){const old=createScopedPrivateNativeProofJsonSerializer(),expected=jsonObserver(value,()=>old(value)),actual=jsonObserver(value,()=>operation(serialize=>serialize(value)));retain('complete-hook-fallback',{expected,actual});assert.deepEqual(actual,expected);}
 const marker=new RangeError('original getter marker'),value={get value(){throw marker;}};assert.throws(()=>operation(serialize=>serialize(value)),error=>error===marker);
});
test('late native and inherited JSON changes clear operation bytes before original hooks and restored positives stay fresh',()=>{
 const common=shared(),value={compilerMeta:common},old=createScopedPrivateNativeProofJsonSerializer(),expected=nativeJSON(value);let hooks=0;
 operation(serialize=>{assert.equal(serialize(value),expected);const prior=get(Object.prototype,'toJSON');try{define(Object.prototype,'toJSON',{configurable:true,value(){hooks++;return 'late-hook';}});const a=old(value),aHooks=hooks;hooks=0;const b=serialize(value);assert.equal(b,a);assert.equal(hooks,aHooks);retain('complete-late-hook',{a,b,aHooks,hooks});}finally{if(prior)define(Object.prototype,'toJSON',prior);else delete Object.prototype.toJSON;}assert.equal(serialize(value),expected);});
 for(const [owner,key,replacement]of [[Object,'isFrozen',()=>false],[Object,'getOwnPropertyDescriptor',()=>{throw Error('changed descriptor');}],[Reflect,'ownKeys',()=>{throw Error('changed keys');}]]){const prior=get(owner,key);try{define(owner,key,{...prior,value:replacement});const expectedResult=outcome(()=>old(value)),actual=outcome(()=>operation(serialize=>serialize(value)));retain('complete-changed-native-'+key,{expectedResult,actual});assert.deepEqual(actual,expectedResult);}finally{define(owner,key,prior);}}
});
test('nested frames restore the outer serializer and every return or exception closes escaped serializers',()=>{
 const value={compilerMeta:shared()},expected=nativeJSON(value);let escaped,innerEscaped;
 const result=operation(outer=>{escaped=outer;assert.equal(outer(value),expected);const innerResult=operation(inner=>{innerEscaped=inner;assert.throws(()=>outer(value),/suspended/u);return inner(value);});assert.equal(innerResult,expected);assert.throws(()=>innerEscaped(value),/closed/u);assert.equal(outer(value),expected);return 'done';});assert.equal(result,'done');assert.throws(()=>escaped(value),/closed/u);
 const marker={identity:'original throw'};assert.throws(()=>operation(serialize=>{escaped=serialize;serialize(value);throw marker;}),error=>error===marker);assert.throws(()=>escaped(value),/closed/u);assert.equal(operation(serialize=>serialize(value)),expected);
});
test('Promise own and inherited thenables proxy returns and async continuations cannot keep a byte frame alive',async()=>{
 let getters=0,escaped;const own=Object.defineProperty({},'then',{get(){getters++;throw Error('must not invoke own then');}}),inherited=Object.create(Object.defineProperty({},'then',{get(){getters++;throw Error('must not invoke inherited then');}})),revoked=Proxy.revocable({},{});revoked.revoke();
 for(const value of [Promise.resolve(1),own,inherited,{then(){}},revoked.proxy]){assert.throws(()=>operation(serialize=>{escaped=serialize;return value;}),/synchronous|thenable/u);assert.throws(()=>escaped({}),/closed/u);}assert.equal(getters,0);
 let continuation;assert.throws(()=>operation(serialize=>{escaped=serialize;continuation=Promise.resolve().then(()=>outcome(()=>serialize({})));return continuation;}),/thenable/u);const observed=await continuation;retain('complete-closed-async-continuation',observed);assert.match(observed.error.message,/closed/u);assert.throws(()=>operation(new Proxy(()=>1,{})),/qualified/u);
});
test('original cell depth and byte refusals fall back without new limits and immutable inputs remain unmodified',()=>{
 const deep={};let tail=deep;for(let at=0;at<165;at++)tail=tail.next={};
 const wide=Array.from({length:200001},()=>0),large={compilerMeta:freeze({source:'x'.repeat(8388609)})},surrogates={compilerMeta:freeze({source:'😀\ud800\u0000'.repeat(256)})};
 for(const value of [deep,wide,large,surrogates]){const old=createScopedPrivateNativeProofJsonSerializer(),expected=old(value),actual=operation(serialize=>serialize(value));retain('complete-budget-case',{value,expected,actual});assert.equal(actual,expected);}assert.equal(wide.length,200001);assert.equal(large.compilerMeta.source.length,8388609);
});
