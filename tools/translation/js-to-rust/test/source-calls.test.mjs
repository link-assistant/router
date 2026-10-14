import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync,writeFileSync,mkdtempSync,rmSync,mkdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {gzipSync} from 'node:zlib';
import {analyzeJavaScript,translateJavaScript,parseMeta,emitRust,emitTypeScript} from '../translator.mjs';
import {toLino,check} from '../vendor/ir.mjs';
import {issueSourceCalls,readSourceCalls,reissueSourceCalls,lowerSourceCalls,createSourceCallIssuer,issueSourceCallsFrom,issueTopLevelSourceCallsFrom} from '../vendor/source-calls.mjs';
import {ownershipSyntax} from '../vendor/module-syntax.mjs';
import {evaluate} from '../interpreter.mjs';
import {sourceModules} from '../native-typescript.mjs';
const ROOT=process.env.ROUTER_NATIVE_TS_SOURCE_ROOT??resolve(dirname(fileURLToPath(import.meta.url)),'../../../..');
const hash=value=>createHash('sha256').update(value).digest('hex'),copy=value=>JSON.parse(JSON.stringify(value));
function retain(name,value){if(!process.env.ROUTER_REVERSE_VECTORS)return;mkdirSync(process.env.ROUTER_REVERSE_VECTORS,{recursive:true});writeFileSync(join(process.env.ROUTER_REVERSE_VECTORS,'source-calls-'+name+'.json.gz'),gzipSync(JSON.stringify(value)+'\n'));}
function values(){let hooks=0;const revoked=Proxy.revocable({},{});revoked.revoke();return {values:[undefined,null,false,true,0,-0,NaN,Infinity,-Infinity,7,'','\ud800','\udc00',' \ud800x\udc00\t','ok',0n,2n**4096n,Symbol('opaque'),()=>{},new String('box'),new Number(1),{},[],revoked.proxy,{get field(){hooks++;throw Error('getter');},[Symbol.toPrimitive](){hooks++;throw Error('coercion');}}],hooks:()=>hooks};}
function same(actual,expected){if(Object.is(actual,expected))return;if(Array.isArray(expected)){assert.ok(Array.isArray(actual));assert.equal(actual.length,expected.length);expected.forEach((value,index)=>assert.ok(Object.is(actual[index],value)));}else assert.ok(Object.is(actual,expected));}
async function runtimes(source,program,directory,label){
  const meta=program.map(toLino).join('\n'),decoded=parseMeta(meta);assert.deepEqual(decoded,program);
  const typescript=emitTypeScript(decoded),rust=emitRust(decoded),original=join(directory,label+'-original.mjs'),typed=join(directory,label+'.ts'),out=join(directory,label+'-compiled');
  writeFileSync(original,source);writeFileSync(typed,typescript);
  const compiler=process.env.ROUTER_TRANSLATION_TSC??join(ROOT,'packages/javascript/node_modules/typescript/bin/tsc');
  const result=spawnSync(process.execPath,[compiler,'--strict','--target','ES2022','--module','ESNext','--skipLibCheck','--outDir',out,typed],{encoding:'utf8',timeout:20000,maxBuffer:1024*1024});
  retain(label+'-strict-typescript',{engine:process.execPath,compiler,args:result.spawnargs,status:result.status,signal:result.signal,stdout:result.stdout,stderr:result.stderr,error:result.error?String(result.error):null,source,typescript,rust,program,meta});assert.equal(result.status,0,result.stderr||result.stdout||String(result.error));
  const runtime=join(directory,label+'-target.mjs');writeFileSync(runtime,readFileSync(join(out,label+'.js')));
  return {original:await import(pathToFileURL(original).href),typed:await import(pathToFileURL(runtime).href),meta,typescript,rust,program};
}

test('source-issued lexical creation and direct calls preserve full unknown input identity and allocation',{timeout:60000},async()=>{
  const fixtures=[
    ['identity','export function identity(value,other){const take=()=>value;return take();}'],
    ['pair','export function pair(value,other){const make=item=>[value,item,value,null,undefined];return make(other);}'],
    ['branch','export function branch(value,choice){const choose=flag=>flag===true?value:undefined;return choose(choice);}'],
    ['observe','export function observe(value){const describe=()=>typeof value===\'string\'?value.trim():value;return describe();}'],
    ['empty','export function empty(value){const ignore=()=>{const unused=value;};return ignore();}'],
    ['zero','export function zero(value){const ignored=()=>undefined;return ignored();}'],
  ];
  const directory=mkdtempSync(join(tmpdir(),'router-source-calls-')),unknown=values();
  try{for(const [name,source]of fixtures){const analysis=analyzeJavaScript(source,{sourcePath:'fixtures/'+name+'.mjs'});assert.deepEqual(analysis.diagnostics,[]);assert.equal(analysis.program.length,1);const fn=analysis.program[0];assert.ok(fn.sourceCalls);assert.equal(fn.conditionalCalls,undefined);const runtime=await runtimes(source,analysis.program,directory,name),observations=[];
    for(const value of unknown.values)for(const other of [undefined,null,true,false,Symbol('second'),'\ud800',2n**4096n]){
      const expected=name==='pair'?[value,other,value,null,undefined]:name==='branch'?(other===true?value:undefined):['empty','zero'].includes(name)?undefined:name==='observe'&&typeof value==='string'?(value===' \ud800x\udc00\t'?'\ud800x\udc00':value):value;
      for(const invoke of [runtime.original[name],runtime.typed[name],(...args)=>evaluate(runtime.program,name,args)]){const actual=invoke(value,other);same(actual,expected);if(name==='pair')assert.notEqual(actual,invoke(value,other));}
      observations.push({category:typeof value,other:typeof other,negativeZero:Object.is(value,-0),expectedType:typeof expected});
    }
    const iterator=Array.prototype[Symbol.iterator];let originalNoIterator,targetNoIterator,irNoIterator,iteratorCalls=0;
    try{Array.prototype[Symbol.iterator]=function(){iteratorCalls++;throw Error('unproved Array iterator');};originalNoIterator=runtime.original[name](7,false);targetNoIterator=runtime.typed[name](7,false);irNoIterator=evaluate(runtime.program,name,[7,false]);}finally{Array.prototype[Symbol.iterator]=iterator;}
    same(targetNoIterator,originalNoIterator);same(irNoIterator,originalNoIterator);assert.equal(iteratorCalls,0);
    assert.equal(runtime.original[name].length,runtime.typed[name].length);assert.match(runtime.rust,/\.call\(/u);assert.match(runtime.rust,/pub struct JsClosureEnvironment/u);assert.doesNotMatch(runtime.rust,/dyn Fn|unsafe/u);retain(name,{source,...runtime,observations,rustCompiled:false,iteratorCounterexample:{iteratorCalls,originalNoIterator,targetNoIterator,irNoIterator}});
  }assert.equal(unknown.hooks(),0);}finally{rmSync(directory,{recursive:true,force:true});}
});

test('owned literal some has explicit ordered short circuit and qualified standard intrinsic semantics',{timeout:60000},async()=>{
  const fixtures=[
    ['classify','export function classify(value){return ["ok",7,false].some(item=>typeof item===typeof value);}'],
    ['none','export function none(value){return [].some(item=>typeof item===typeof value);}'],
    ['markers','export function markers(value){return ["message_stop","[DONE]","response.completed","finishReason"].some(marker=>typeof value===\'string\'&&typeof marker===\'string\'&&value.includes(marker));}'],
  ];
  const directory=mkdtempSync(join(tmpdir(),'router-source-some-')),unknown=values();
  try{for(const [name,source]of fixtures){const translated=translateJavaScript(source),fn=translated.program[0];assert.equal(fn.conditionalCalls,true);assert.equal(fn.sourceCalls.iterations.length,1);assert.equal(fn.sourceCalls.iterations[0].lookupStabilityProved,false);const runtime=await runtimes(source,translated.program,directory,name),observations=[];
    for(const value of [...unknown.values,'prefix[DONE]suffix','message_stop','\ud800response.completed\udc00','finishReason','other']){const expected=name==='none'?false:name==='classify'?['string','number','boolean'].includes(typeof value):typeof value==='string'&&['message_stop','[DONE]','response.completed','finishReason'].some(marker=>value.indexOf(marker)!==-1);for(const invoke of [runtime.original[name],runtime.typed[name],arg=>evaluate(runtime.program,name,[arg])])assert.equal(invoke(value),expected);observations.push({category:typeof value,expected});}
    assert.match(runtime.typescript,/for \(let index = 0; index < values.length; index\+\+\)/u);assert.doesNotMatch(runtime.typescript,/for \(const value of values\)/u);assert.match(runtime.rust,/into_iter\(\)\.any/u);
    const iterator=Array.prototype[Symbol.iterator],some=Array.prototype.some;let native,target,ir,iteratorCalls=0;
    try{Array.prototype[Symbol.iterator]=function(){iteratorCalls++;throw Error('unproved Array iterator');};native=runtime.original[name](7);target=runtime.typed[name](7);ir=evaluate(runtime.program,name,[7]);}finally{Array.prototype[Symbol.iterator]=iterator;}
    assert.equal(Array.prototype.some,some);assert.equal(native,name==='classify');assert.equal(target,native);assert.equal(ir,native);assert.equal(iteratorCalls,0);retain(name,{source,...runtime,observations,conditionalCalls:true,rustCompiled:false,iteratorCounterexample:{standardSomeUnchanged:true,native,target,ir,iteratorCalls}});
  }assert.equal(unknown.hooks(),0);}finally{rmSync(directory,{recursive:true,force:true});}
  const some=Array.prototype.some,source=fixtures[0][1],original=Function(source.replace('export ','')+';return classify;')();try{Array.prototype.some=function(){return 'changed lookup';};assert.equal(original('ok'),'changed lookup');}finally{Array.prototype.some=some;}
  assert.equal(analyzeJavaScript(fixtures[0][1]+'export function unqualified(value){return classify(value);}').items.find(item=>item.name==='unqualified').status,'unsupported');
});

test('private complete parent proof rejects copied foreign mirrored body and callable graph forgeries',()=>{
  const source='export function owner(value){const take=()=>value;return take();}',fn=translateJavaScript(source).program[0],proof=fn.sourceCalls,handle=reissueSourceCalls(proof),issuer=createSourceCallIssuer(source,'fixtures.mjs');let hooks=0;
  assert.deepEqual(lowerSourceCalls(handle),fn);assert.equal(Object.isFrozen(readSourceCalls(handle)),true);
  const missingProof=copy(fn);delete missingProof.sourceCalls;assert.throws(()=>check(missingProof,new Map()));assert.throws(()=>emitTypeScript([missingProof]),/unissued original caller/u);assert.throws(()=>emitRust([missingProof]),/unissued original caller/u);
  for(const proof of [null,false,{},copy(fn.sourceCalls)]){const wrong=copy(fn);wrong.sourceCalls=proof;if(proof&&proof.schema)proof.parentBodyCheckRequired=false;assert.throws(()=>emitTypeScript([wrong]));assert.throws(()=>emitRust([wrong]));}
  const child=fn.body[0].value.closure;assert.throws(()=>emitTypeScript([child]),/standalone internal/u);assert.throws(()=>emitRust([child]),/standalone internal/u);
  const collision=check({kind:'function',name:child.name,exported:false,params:[],returns:'undefined',body:[{kind:'return',value:{kind:'undefined'}}]},new Map());assert.throws(()=>emitTypeScript([fn,collision]),/collides/u);assert.throws(()=>emitRust([fn,collision]),/collides/u);
  for(const foreign of [{},copy(handle),new Proxy(handle,{get(){hooks++;},getOwnPropertyDescriptor(){hooks++;}})])assert.throws(()=>readSourceCalls(foreign));
  assert.throws(()=>issueSourceCallsFrom(copy(issuer),0,source.length));
  for(const suffix of [';export function next(){return 1;}',';sideEffect();',';const extra=1;',';(()=>effect())();']){const extended=source+suffix;assert.throws(()=>issueTopLevelSourceCallsFrom(createSourceCallIssuer(extended),0,extended.length),/active original suffix/u);}
  const trivia=source+'; // retained empty statement\n;/* retained comment */;';assert.equal(lowerSourceCalls(issueTopLevelSourceCallsFrom(createSourceCallIssuer(trivia),0,trivia.length)).name,'owner');
  const changes=[x=>x.sourceCalls.sourceUtf16+=' ',x=>x.sourceCalls.sourceUtf16Sha256='0'.repeat(64),x=>x.sourceCalls.start++,x=>x.sourceCalls.bindings[0].calls[0].end--,x=>x.sourceCalls.children[0].environment.captures[0].binding.start++,x=>x.sourceCalls.children[0].mode='some',x=>x.sourceCalls.iterations.push({start:0}),x=>x.body[0].value.captures[0].name='other',x=>x.body[1].value.name='other',x=>x.body[1].value.type='undefined',x=>x.body[0].value.type='value',x=>x.params=[],x=>x.returns='undefined',x=>x.lossless=false,x=>x.conditionalCalls=true,x=>x.sourceCalls.parentBodyCheckRequired=false,x=>{x.body[0].value.environment.sourceUtf16=x.body[0].value.environment.sourceUtf16.replace('()=>value','()=>undefined');x.sourceCalls.sourceUtf16=x.sourceCalls.sourceUtf16.replace('()=>value','()=>undefined');}];
  for(const mutate of changes){const wrong=copy(fn);mutate(wrong);assert.throws(()=>check(wrong,new Map()));if(![9,10].includes(changes.indexOf(mutate)))assert.throws(()=>parseMeta(toLino(wrong)));assert.throws(()=>emitTypeScript([wrong]));assert.throws(()=>emitRust([wrong]));retain('forgery-'+changes.indexOf(mutate),{original:fn,changed:wrong,typedFieldsSerialized:![9,10].includes(changes.indexOf(mutate))});}
  for(const key of ['sourceUtf16','children']){const wrong=copy(proof);Object.defineProperty(wrong,key,{enumerable:true,get(){hooks++;throw Error('getter');}});assert.throws(()=>reissueSourceCalls(wrong));}
  const getter=copy(fn);Object.defineProperty(getter,'sourceCalls',{enumerable:true,get(){hooks++;return proof;}});assert.throws(()=>check(getter,new Map()));assert.throws(()=>emitTypeScript([getter]));assert.throws(()=>reissueSourceCalls(new Proxy(proof,{get(){hooks++;}})));assert.equal(hooks,0);
  for(const key of ['schema','sourcePath','sourceUtf16','start','end','children']){const wrong=copy(proof);delete wrong[key];const previous=Object.getOwnPropertyDescriptor(Object.prototype,key);try{Object.defineProperty(Object.prototype,key,{configurable:true,get(){hooks++;throw Error('inherited source proof getter');}});assert.throws(()=>reissueSourceCalls(wrong));}finally{if(previous)Object.defineProperty(Object.prototype,key,previous);else delete Object.prototype[key];}}
  for(const key of ['__proto__','prototype','constructor']){const wrong=JSON.parse(JSON.stringify(proof).slice(0,-1)+','+JSON.stringify(key)+':{"foreign":true}}');assert.equal(Object.hasOwn(wrong,key),true);assert.equal(Object.getPrototypeOf(wrong),Object.prototype);assert.throws(()=>reissueSourceCalls(wrong));assert.equal(Object.getPrototypeOf(wrong),Object.prototype);retain('extra-proof-key-'+key,{proof,changed:wrong});}
  const accessor=copy(proof);Object.defineProperty(accessor,'sourceUtf16',{enumerable:true,get(){hooks++;throw Error('own getter');}});const inheritedValue=Object.getOwnPropertyDescriptor(Object.prototype,'value');try{Object.defineProperty(Object.prototype,'value',{configurable:true,get(){hooks++;throw Error('inherited descriptor value');}});assert.throws(()=>reissueSourceCalls(accessor));}finally{if(inheritedValue)Object.defineProperty(Object.prototype,'value',inheritedValue);else delete Object.prototype.value;}
  assert.equal(hooks,0);
  const cached=ownershipSyntax(source),descriptor=Object.getOwnPropertyDescriptor(cached,'ts'),oldFile=cached.file;try{cached.file={statements:[]};Object.defineProperty(cached,'ts',{configurable:true,get(){hooks++;throw Error('foreign graph');}});assert.deepEqual(lowerSourceCalls(reissueSourceCalls(proof)),fn);}finally{cached.file=oldFile;Object.defineProperty(cached,'ts',descriptor);}assert.equal(hooks,0);retain('private-issuance',{source,fn,proof,hooks});
});

test('effects escaping callable references mutable environments unsupported calls and false source contracts stay refused',()=>{
  const sources=[
    'export function owner(value){const take=()=>value;return take;}','export function owner(value){const take=()=>value;return [take];}','export function owner(value){const take=()=>value;return {take};}',
    'export function owner(value){const take=()=>value;return take===take;}','export function owner(value){const take=()=>value;const alias=take;return alias();}','export function owner(value){const take=()=>value;return take.call(null);}',
    'export function owner(value){let take=()=>value;return take();}','export function owner(value){return take();const take=()=>value;}','export function owner(value){const take=()=>value;take=other;return take();}',
    'export function owner(value){value=1;const take=()=>value;return take();}','export function owner(value){const take=()=>value;value=1;return take();}','export function owner(value){const local=1;const take=()=>local;return take();}',
    'export function owner(value){const take=()=>value.field;return take();}','export function owner(value){const take=()=>String(value);return take();}','export function owner(value){const take=()=>value();return take();}',
    'export function owner(value){const take=()=>this;return take();}','export function owner(value){const take=()=>arguments;return take();}','export function owner(value){const take=()=>new.target;return take();}',
    'export function owner(value){const take=async()=>value;return take();}','export async function owner(value){const take=()=>value;return take();}','export function owner(value){const take=(x=effect())=>value;return take();}',
    'export function owner(value){const take=(...x)=>value;return take();}','export function owner(value){const take=function(){return value;};return take();}','export function owner(value){function take(){return value;}return take();}',
    'export function owner(value){const take=(x)=>value;return take();}','export function owner(value){const take=()=>value;return take(1);}',
    'export function owner(value){return input.some(item=>typeof item===typeof value);}','export function owner(value){return [...input].some(item=>typeof item===typeof value);}','export function owner(value){return [,].some(item=>true);}','export function owner(value){return [effect()].some(item=>true);}',
    'export function owner(value){return ["x"].some((item,index)=>true);}','export function owner(value){return ["x"].some(item=>item.field);}','export function owner(value){return ["x"].some(item=>value.includes(item));}',
    '/** @returns {number} */ export function owner(value){const take=()=>undefined;return take();}',
    '/** @param {number} value */ export function owner(value){const take=()=>value;return take();}',
    'class Refused { method(){const take=()=>undefined;return take();} }','export function parent(value){effect();const take=()=>value;return take();}',
  ];
  for(const source of sources){const result=analyzeJavaScript(source);assert.equal(result.program.length,0,source);assert.ok(result.diagnostics.length);retain('negative-'+sources.indexOf(source),{source,result});}
});

test('complete original native corpus remains pinned and unknown terminates callers are not narrowed',{timeout:60000},()=>{
  const baseline=JSON.parse(readFileSync(join(ROOT,'tools/translation/fixtures/sequence-patterns/native-program-baseline.json'))),totals={modules:0,top:0,topDefinitions:0,scoped:0,scopedDefinitions:0,full:0,conditional:0};
  for(const path of sourceModules(ROOT).filter(path=>path.startsWith('packages/javascript/native/')&&path.endsWith('.mjs'))){const source=readFileSync(join(ROOT,path),'utf8'),pin=baseline.modules.find(row=>row.path===path),current=analyzeJavaScript(source,{sourcePath:path});assert.ok(pin);assert.equal(hash(source),pin.sourceSha256);assert.equal(Buffer.byteLength(source),pin.originalSourceBytes);assert.deepEqual(current.program,pin.topLevelProgram);for(const fn of pin.scopedProgram)assert.deepEqual(current.scopedFunctions.program.find(row=>row.name===fn.name),fn);totals.modules++;totals.top+=current.items.length;totals.topDefinitions+=current.program.length;totals.scoped+=current.scopedFunctions.sourceItems;totals.scopedDefinitions+=current.scopedFunctions.translatedItems;totals.full+=current.scopedFunctions.fullDomainTranslatedItems;totals.conditional+=current.scopedFunctions.conditionalPrivateBodyDraftItems;retain('native-'+path.split('/').at(-1),{path,sourceSha256:hash(source),sourceBytes:Buffer.byteLength(source),current});}
  assert.deepEqual(totals,{modules:52,top:788,topDefinitions:73,scoped:705,scopedDefinitions:66,full:54,conditional:12});
  const path='packages/javascript/native/resources.mjs',source=readFileSync(join(ROOT,path),'utf8'),text="text => ['message_stop','[DONE]','response.completed','finishReason'].some(marker => text.includes(marker))",start=source.indexOf(text);assert.ok(start>=0);const proof=issueSourceCalls(source,start,start+text.length,path);assert.throws(()=>lowerSourceCalls(proof));
  const terminates=Function('return ('+text+');')();let calls=0,gets=0;const custom={includes(marker){calls++;return marker==='[DONE]';}},proxy=new Proxy(custom,{get(target,key){gets++;return target[key];}});assert.equal(terminates(proxy),true);assert.equal(calls,2);assert.equal(gets,2);assert.throws(()=>terminates(undefined),TypeError);assert.throws(()=>terminates(Symbol('opaque')),TypeError);
  assert.match(source,/terminates\(typeof record\.body === 'string' \? record\.body : JSON\.stringify\(record\.body\)\)/u);assert.match(source,/const decoded = decompress\(Buffer\.concat\(x\.encoded\),x\.kind\)/u);assert.match(source,/terminates\(decoded\)/u);
  retain('native-complete',{totals,originalHistoricalDefinitions:136,originalHistoricalCaptureOrigins:301,unchangedCurrentDefinitions:139,sourcePath:path,source,originalSpan:{start,end:start+text.length},proof:readSourceCalls(proof),normalReturnStringProducerProved:false,parentAdmitted:false,customIncludesCalls:calls,proxyGets:gets});
});
