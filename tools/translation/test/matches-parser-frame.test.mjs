import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {PRODUCTION_PROFILE,compilationProfile} from '../cfg-profile.mjs';
import {captureSourceModuleViews} from '../source-module-views.mjs';
import {HostRustParser} from '../extensions/host-contracts.mjs';
import {tokenizeRust} from '../extensions/lexical.mjs';
import {createMatchesMacroContext,configureMatchesMacroParser,configureMatchesMethodParser,matchesParserFacts,sourceMatchesCandidate,originalMatchesImport,proveOriginalMatchesCall,originalMatchesCallFacts} from '../matches-macro-context.mjs';
import {extractImplDeclarations,lowerSharedMethodTokens} from '../impl-resolver.mjs';
import {createOriginalMethodTokenTransform,originalMethodParserTokens} from '../source-method-transforms.mjs';
import {metadataDigest} from '../extensions/source-links.mjs';
import {translateProject} from '../project.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
const ordinary='pub fn probe(v:u8)->bool{matches!(v,1 | 2)}';
const member='pub enum Mode{On,Off}impl Mode{pub fn is_on(&self)->bool{matches!(self,Self::On)}}';
const hash=value=>createHash('sha256').update(value).digest('hex');
function fixture(method=false){
  const source=method?member:ordinary,sourceView=captureSourceModuleViews({source,sourcePath:'src/lib.rs',compilationProfile:PRODUCTION_PROFILE}).views[0];
  const context=createMatchesMacroContext({modules:[{file:'src/lib.rs',path:[],source,sourceView,compilationProfile:PRODUCTION_PROFILE}],compilationProfile:PRODUCTION_PROFILE});
  let parser,originalMethod;
  if(method){
    originalMethod=extractImplDeclarations(source,{sourcePath:'src/lib.rs',sourceView,compilationProfile:PRODUCTION_PROFILE}).implementations[0].methods[0];
    const transform=createOriginalMethodTokenTransform(context,originalMethod,lowerSharedMethodTokens(originalMethod,['crate','Mode']));
    parser=new HostRustParser(originalMethodParserTokens(transform));configureMatchesMethodParser(parser,context,originalMethod);
  }else{
    parser=new HostRustParser(tokenizeRust(source));parser.compilationProfile=PRODUCTION_PROFILE;configureMatchesMacroParser(parser,context,{file:'src/lib.rs'});
  }
  const frame=matchesParserFacts(parser),start=source.indexOf('matches!'),end=source.indexOf(')}',start)+1;
  const request={segments:['matches'],start,end},call=proveOriginalMatchesCall(parser,request);
  return {method,source,context,parser,frame,request,call,originalMethod};
}
const readers=row=>[()=>matchesParserFacts(row.parser),()=>sourceMatchesCandidate(row.parser,['matches']),()=>originalMatchesImport(row.parser,['std','matches']),()=>originalMatchesCallFacts(row.call)];
function changed(object,key,descriptor,operation){
  const previous=Object.getOwnPropertyDescriptor(object,key);Object.defineProperty(object,key,{configurable:true,enumerable:true,...descriptor});
  try{operation();}finally{if(previous)Object.defineProperty(object,key,previous);else delete object[key];}
}
function denied(row,pattern=/private issuance|missing data property/){for(const read of readers(row))assert.throws(read,pattern);}
test('ordinary and genuine transformed frames preserve original rule execution in both targets',{timeout:90000},async()=>{
  for(const row of [fixture(),fixture(true)]){
    assert.equal(matchesParserFacts(row.parser),row.frame);assert.equal(sourceMatchesCandidate(row.parser,['matches']),true);assert.equal(originalMatchesImport(row.parser,['std','matches']),true);
    assert.equal(originalMatchesCallFacts(row.call).state,row.frame);assert.equal(row.call.originalInvocation,row.source.slice(row.request.start,row.request.end));assert.equal(row.call.namespaceAuthority,false);assert.equal(row.call.runtimeParity,false);
  }
  const carriedSource=member+ordinary+'pub fn on(v:&Mode)->bool{v.is_on()}pub fn make_on()->Mode{Mode::On}pub fn make_off()->Mode{Mode::Off}';
  assert.equal(hash(carriedSource),'f9418cd4c97560e8808aef755645b3d92516a3deacc10be21ae2874f45d0d35f');
  // The lossless private-parser-frame-218 history retains the former exact
  // 71..79 refusal. This source-only successor checks that same full source
  // through the separate private discriminant-only receiver profile.
  const carried=translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>carriedSource,compilationProfile:PRODUCTION_PROFILE});
  assert.equal(carried.meta.checkedMethods.some(row=>row.name==='Mode.is_on'&&row.receiver==='shared'),true);
  assert.deepEqual(carried.meta.refused,[]);assert.equal(carriedSource.slice(71,79),'Self::On');assert.equal(carried.meta.executable.some(row=>row.name==='on'),true);
  await verifyTypedTargets(carried,api=>{assert.equal(api.on(api.make_on()),true);assert.equal(api.on(api.make_off()),false);},{childTimeoutMs:30000});
  // Reuse the complete, already checked source fixture without rewriting any
  // member body or manufacturing a target ABI. The original Mode stays above.
  const original=readFileSync(new URL('./source-method-project.test.mjs',import.meta.url),'utf8');
  assert.equal(hash(original),'42e569f50f314bb241fd8a7471a6b56238836dc82d46c25599557f98bbc29279');
  const sources=[...original.matchAll(/const source='(pub struct Counter\{value:u8\}impl Counter\{pub fn make[^']*)';/g)];assert.equal(sources.length,1);
  const counter=sources[0][1];assert.equal(hash(counter),'fb334b2ccd6375e8bca63fee12912403284687d54d4ef41f4edc6bedf9c98780');
  const source=counter+ordinary,result=translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source,compilationProfile:PRODUCTION_PROFILE});
  assert.ok(result.meta.checkedMethods.some(row=>row.name==='Counter.small'&&row.receiver==='shared'));assert.ok(result.meta.executable.some(row=>row.name==='probe'));assert.deepEqual(result.meta.refused,[]);
  await verifyTypedTargets(result,api=>{for(const [v,expected]of [[0n,false],[1n,true],[2n,true],[255n,false]]){assert.equal(api.run(v),expected);assert.equal(api.probe(v),expected);}},{childTimeoutMs:30000});
});
test('warmed ordinary and method frames cannot reseal their digest mode spans or original reference fields',()=>{
  for(const row of [fixture(),fixture(true)]){
    for(const key of ['context','facts','module','captured','tokens'])changed(row.frame,key,{value:structuredClone(row.frame[key]),writable:true},()=>denied(row));
    for(const key of ['offset','sourceLength'])changed(row.frame,key,{value:row.frame[key]+1,writable:true},()=>denied(row));
    changed(row.frame,'namespaceDigest',{value:'recomputed-public-digest',writable:true},()=>denied(row));
    changed(row.frame,'methodTransform',{value:row.method?structuredClone(row.frame.methodTransform):row.call,writable:true},()=>denied(row));
    const map=row.parser.sourceNamespaceAliases.macro.get('');map.set('injected',['std','matches']);
    const digest=metadataDigest(['type','value','macro'].map(namespace=>[namespace,[...row.parser.sourceNamespaceAliases[namespace]].map(([path,map])=>[path,[...map]])]));
    try{changed(row.frame,'namespaceDigest',{value:digest,writable:true},()=>denied(row));}finally{map.delete('injected');}
    matchesParserFacts(row.parser);
  }
});
test('candidate import proof and frame accessors reject every replaced private context root',()=>{
  for(const row of [fixture(),fixture(true)])for(const key of ['modules','evidence','profile','compilationProfile']){
    changed(row.frame.facts,key,{value:structuredClone(row.frame.facts[key]),writable:true},()=>denied(row));
    matchesParserFacts(row.parser);
  }
});
test('warmed frame and context accessors and proxy references reject before any callback or trap',()=>{
  let calls=0;const handler={get(){calls++;throw Error('get');},ownKeys(){calls++;throw Error('keys');},getPrototypeOf(){calls++;throw Error('prototype');},getOwnPropertyDescriptor(){calls++;throw Error('descriptor');}};
  for(const row of [fixture(),fixture(true)]){
    for(const key of Object.keys(row.frame))changed(row.frame,key,{get(){calls++;return null;}},()=>denied(row,/data property|private issuance/));
    for(const key of ['context','facts','module','captured','tokens'])changed(row.frame,key,{value:new Proxy(row.frame[key],handler),writable:true},()=>denied(row));
    for(const key of ['modules','evidence','profile','compilationProfile']){
      const original=row.frame.facts[key];changed(row.frame.facts,key,{get(){calls++;return original;}},()=>denied(row,/data property|private issuance/));
      changed(row.frame.facts,key,{value:new Proxy(original,handler),writable:true},()=>denied(row));
    }
  }
  assert.equal(calls,0);
});
test('frame own shape and actual issuance reject incidental symbols prototypes and public clones',()=>{
  for(const row of [fixture(),fixture(true)]){
    for(const key of ['extra',Symbol('extra')])changed(row.frame,key,{value:true,writable:true},()=>denied(row));
    changed(row.frame,'offset',{value:row.frame.offset,writable:true,enumerable:false},()=>denied(row));
    changed(row.frame,'offset',{value:row.frame.offset,writable:false},()=>denied(row));
    const permanent=fixture(row.method);Object.defineProperty(permanent.frame,'offset',{configurable:false});denied(permanent);
    const original=Object.getPrototypeOf(row.frame);Object.setPrototypeOf(row.frame,null);try{denied(row);}finally{Object.setPrototypeOf(row.frame,original);}
    assert.throws(()=>matchesParserFacts(structuredClone(row.frame)),/private source association/);assert.throws(()=>originalMatchesCallFacts(structuredClone(row.call)),/Unsealed/);
    assert.equal(matchesParserFacts(row.parser),row.frame);
  }
});
test('private frame issuance retains full mutable token alias profile and module path validation',()=>{
  for(const row of [fixture(),fixture(true)]){
    const map=row.parser.sourceNamespaceAliases.macro.get('');map.set('injected',['core','matches']);
    try{assert.equal(sourceMatchesCandidate(row.parser,['matches']),true);assert.equal(originalMatchesImport(row.parser,['std','matches']),true);assert.throws(()=>matchesParserFacts(row.parser),/association/);assert.throws(()=>proveOriginalMatchesCall(row.parser,row.request),/association/);}finally{map.delete('injected');}
    const token=row.parser.cursor.tokens.find(token=>token.value==='matches');changed(token,'value',{value:'forged',writable:true},()=>assert.throws(()=>matchesParserFacts(row.parser),/tokens changed|token stream/));
    changed(row.parser,'modulePath',{value:['other'],writable:true},()=>assert.throws(()=>matchesParserFacts(row.parser),/association/));
    changed(row.parser,'compilationProfile',{value:compilationProfile({flags:{test:true}}),writable:true},()=>assert.throws(()=>matchesParserFacts(row.parser),/association/));
    matchesParserFacts(row.parser);
  }
});
test('fresh call records cannot alter offsets state or descriptors and stale frame consumers are denied',()=>{
  let calls=0;
  for(const row of [fixture(),fixture(true)]){
    const record=originalMatchesCallFacts(row.call);assert.ok(Object.isFrozen(record));assert.equal(Object.isFrozen(row.frame),false);
    for(const key of ['state','start','end']){
      assert.throws(()=>{record[key]=key==='state'?structuredClone(row.frame):record[key]+1;},TypeError);
      assert.throws(()=>Object.defineProperty(record,key,{get(){calls++;return row.frame;}}),TypeError);
    }
    assert.throws(()=>{record.state=new Proxy(row.frame,{get(){calls++;return null;}});},TypeError);
    changed(row.frame,'offset',{value:row.frame.offset+1,writable:true},()=>assert.throws(()=>originalMatchesCallFacts(row.call),/private issuance/));
    if(row.method)configureMatchesMethodParser(row.parser,row.context,row.originalMethod);else configureMatchesMacroParser(row.parser,row.context,{file:'src/lib.rs'});
    assert.throws(()=>originalMatchesCallFacts(row.call),/private issuance/);
    const next=proveOriginalMatchesCall(row.parser,row.request);assert.equal(originalMatchesCallFacts(next).state,matchesParserFacts(row.parser));
  }
  assert.equal(calls,0);
});
