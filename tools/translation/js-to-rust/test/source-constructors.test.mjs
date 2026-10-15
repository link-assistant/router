import test from 'node:test';
import assert from 'node:assert/strict';
import {createConstructorSourceGraph,issueImportedErrorConstructor,originalImportedErrorConstructor,reissueImportedErrorConstructor} from '../vendor/source-constructors.mjs';
import {issueOriginalConstructorBody,lowerOriginalConstructorBody} from '../vendor/constructor-bodies.mjs';
import {analyzeJavaScript,parseMeta,emitRust,emitTypeScript} from '../translator.mjs';
import {toLino,check} from '../vendor/ir.mjs';
import {ownershipCompiler,ownershipSyntax} from '../vendor/module-syntax.mjs';
import {readFileSync,writeFileSync,mkdtempSync,rmSync,mkdirSync} from 'node:fs';
import {resolve,dirname,join} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {brotliCompressSync,createBrotliDecompress,constants as zlibConstants} from 'node:zlib';
import {Readable} from 'node:stream';
import {execFileSync} from 'node:child_process';

// Lossless raw JSON, with a window large enough for repeated full source rows.
// Existing historical gzip containers remain unchanged. Verify the complete
// decoded bytes by streaming before publishing this new capture's receipt.
async function retainRaw(label,vectors) {
  if(!process.env.ROUTER_REVERSE_VECTORS)return;
  mkdirSync(process.env.ROUTER_REVERSE_VECTORS,{recursive:true});
  let raw=Buffer.from(JSON.stringify(vectors)+'\n');
  const receipt={format:'brotli-complete-original-json-v1',quality:4,windowBits:22,decodedBytes:raw.length,decodedSha256:createHash('sha256').update(raw).digest('hex')};
  const encoded=brotliCompressSync(raw,{params:{[zlibConstants.BROTLI_PARAM_QUALITY]:4,[zlibConstants.BROTLI_PARAM_LGWIN]:22}});raw=undefined;
  receipt.bytes=encoded.length;receipt.sha256=createHash('sha256').update(encoded).digest('hex');
  const hash=createHash('sha256');let bytes=0;
  for await(const chunk of Readable.from([encoded]).pipe(createBrotliDecompress())){hash.update(chunk);bytes+=chunk.length;}
  assert.equal(bytes,receipt.decodedBytes);assert.equal(hash.digest('hex'),receipt.decodedSha256);
  writeFileSync(join(process.env.ROUTER_REVERSE_VECTORS,label+'.json.br'),encoded,{flag:'wx'});
  writeFileSync(join(process.env.ROUTER_REVERSE_VECTORS,label+'.receipt.json'),JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});
}

const errorSource="export class Mistake extends Error {constructor(message,status=400){super(message);this.status=status;this.code='bounded';}}";
const ownerSource="import {Mistake as Failure} from './errors.mjs';export function selected(value){if(value===null)throw new Failure('bad');return value;}";
const sources=(owner=ownerSource,error=errorSource)=>[{path:'fixture/errors.mjs',source:error},{path:'fixture/owner.mjs',source:owner}];
function constructor(owner=ownerSource,error=errorSource) {
  const graph=createConstructorSourceGraph(sources(owner,error)),start=owner.indexOf('new Failure'),end=owner.indexOf(');',start)+1;
  return {graph,token:issueImportedErrorConstructor(graph,'fixture/owner.mjs',start,end)};
}
function program(owner=ownerSource,error=errorSource) {
  const graph=createConstructorSourceGraph(sources(owner,error)),start=owner.indexOf('export function');
  return {graph,item:lowerOriginalConstructorBody(issueOriginalConstructorBody(graph,'fixture/owner.mjs',start,owner.length))};
}
const clone=value=>structuredClone(value);

test('genuine lexical import aliases issue ordered closed constructor/default evidence',()=>{
  const compiler=ownershipCompiler(),syntax=ownershipSyntax(errorSource);assert.equal(compiler,syntax.ts);assert.equal(ownershipSyntax(errorSource),syntax);
  assert.equal(syntax.file.fileName,'module-ownership.mjs');assert.equal(syntax.file.text,errorSource);
  assert.throws(()=>ownershipSyntax('export class Broken {'),/syntax/u);assert.equal(ownershipSyntax(errorSource),syntax);
  assert.throws(()=>createConstructorSourceGraph([{path:'fixture/broken.mjs',source:'export class Broken {'}]),error=>error.message==='invalid module ownership syntax'&&error.slug===undefined);
  const {token}=constructor(),state=originalImportedErrorConstructor(token),proof=state.proof;
  assert.equal(proof.import.binding,'Failure');assert.equal(proof.import.exported,'Mistake');
  assert.equal(state.message.value,'bad');assert.deepEqual(state.fields,[{name:'status',value:{kind:'number',value:400}},{name:'code',value:{kind:'string',value:'bounded'}}]);
  assert.equal(proof.conditions.outsideModulePrototypeClosureProved,false);assert.equal(proof.conditions.rustErrorIdentityPreserved,false);
  // Genuine repeated proofs and persisted copies reissue complete equal
  // evidence; neither a new token nor shared graph means shared authority.
  const reissued=reissueImportedErrorConstructor(proof);assert.notEqual(reissued,token);assert.deepEqual(originalImportedErrorConstructor(reissued).proof,proof);
  assert.deepEqual(originalImportedErrorConstructor(reissueImportedErrorConstructor(JSON.parse(JSON.stringify(proof)))).proof,proof);
  assert.throws(()=>originalImportedErrorConstructor({...token}),/copied or foreign/);
  assert.throws(()=>issueImportedErrorConstructor({},'fixture/owner.mjs',0,1),/copied or foreign/);
  for(const mutate of [p=>{p.runtimeParity=true;},p=>{p.conditions.unchangedErrorIntrinsicRequired=false;},p=>{p.conditions.hostDiagnosticLocationsPreserved=true;},p=>{p.original.fields.reverse();},p=>{p.original.params[1].default.value=401;},p=>{p.sources[0].source+=' ';},p=>{p.caller.end--;},p=>{p.extra=true;}]) {
    const changed=clone(proof);mutate(changed);assert.throws(()=>reissueImportedErrorConstructor(changed));
  }
});

test('constructor ownership rejects shadowing aliases mutation reflection effects and recovered syntax',()=>{
  const rows=[
    ()=>constructor(ownerSource.replace('new Failure','new Other')),
    ()=>constructor(ownerSource.replace('selected(value)','selected(value,Failure)')),
    ()=>constructor(ownerSource,errorSource+'const alias=Mistake;'),
    ()=>constructor(ownerSource,errorSource+'Mistake.prototype.status=1;'),
    ()=>constructor(ownerSource,errorSource+'Object.setPrototypeOf(Mistake,other);'),
    ()=>constructor(ownerSource,errorSource+'Error.prototype.status=1;'),
    ()=>constructor(ownerSource,errorSource+'Array.prototype.includes=evil;'),
    ()=>constructor(ownerSource,errorSource+'Object.prototype.status=1;'),
    ()=>constructor(ownerSource,errorSource+'Object.defineProperty(Object.prototype,"status",{set(value){sideEffect(value);}});'),
    ()=>constructor(ownerSource,errorSource.replace('export class','const Error=other;export class')),
    ()=>constructor(ownerSource,errorSource.replace("this.code='bounded';","this.code=sideEffect();")),
    ()=>constructor(ownerSource,errorSource.replace('status=400','status=sideEffect()')),
    ()=>constructor(ownerSource,errorSource.replace('constructor(message','get reflected(){return 1;}constructor(message')),
    ()=>constructor(ownerSource,errorSource.replace('export class','export abstract class')),
    ()=>constructor(ownerSource,errorSource+'function invalid('),
    ()=>constructor(ownerSource.replace("new Failure('bad')","new Failure(value)")),
    ()=>constructor(ownerSource.replace("new Failure('bad')","new Failure()")),
    ()=>constructor(ownerSource.replace("new Failure('bad')","new Failure(undefined)")),
    ()=>constructor(ownerSource.replace("new Failure('bad')","new Failure('bad',400,sideEffect())")),
    ()=>constructor(ownerSource.replace("new Failure('bad')","new Failure('bad',1,2,3,4,5,6,7,8)")),
  ];
  for(const run of rows)assert.throws(run);
  // A dynamic argument refuses before any capability can issue; a closed one
  // still runs the complete source effect audit and rejects this same write.
  const mutated=errorSource+'Mistake.prototype.status=1;';
  assert.throws(()=>constructor(ownerSource.replace("new Failure('bad')","new Failure(value)"),mutated),error=>error.slug==='collection'&&/initializer/u.test(error.message));
  assert.throws(()=>constructor(ownerSource,mutated),error=>error.slug==='collection'&&/mutation|reflected/u.test(error.message));
  // Exact historical fixture remains refused with its original classification;
  // importing/declaring an unrelated source class grants no global Error lane.
  const legacy="/** @returns {number} */ export function throwing() { throw new Error('x'); }",graph=createConstructorSourceGraph(sources(legacy));
  for(const options of [{sourcePath:'fixture/owner.mjs'},{sourcePath:'fixture/owner.mjs',constructorGraph:graph}]) {
    const analysis=analyzeJavaScript(legacy,options);assert.equal(analysis.program.length,0);assert.equal(analysis.diagnostics[0].kind,'unsupported');
  }
});

test('source/proof validation bounds work before callbacks and rejects dense-array impostors',()=>{
  let reads=0;
  const accessor={path:'fixture/errors.mjs',get source(){reads++;throw Error('getter');}};
  assert.throws(()=>createConstructorSourceGraph([accessor]));
  assert.throws(()=>createConstructorSourceGraph(new Proxy([],{get(){reads++;throw Error('proxy');},ownKeys(){reads++;throw Error('proxy');}})));
  assert.equal(reads,0);
  const sparse=Array(1),extended=sources();extended.extra=true;
  for(const rows of [sparse,extended,sources().concat(sources()),[{path:'../escape.mjs',source:errorSource}],Array(129)])assert.throws(()=>createConstructorSourceGraph(rows));
  const {token}=constructor(),proof=clone(originalImportedErrorConstructor(token).proof);let deep={};for(let index=0;index<170;index++)deep={child:deep};proof.extra=deep;assert.throws(()=>reissueImportedErrorConstructor(proof),/depth or cell/);
  for(const value of [NaN,Infinity,-Infinity]){const bad=clone(originalImportedErrorConstructor(token).proof);bad.extra=value;assert.throws(()=>reissueImportedErrorConstructor(bad),/nonfinite/);}
  const bad=clone(originalImportedErrorConstructor(token).proof);Object.defineProperty(bad,'extra',{enumerable:true,get(){reads++;throw Error('getter');}});assert.throws(()=>reissueImportedErrorConstructor(bad));assert.equal(reads,0);
});

test('the whole original parent and producer graph are mandatory before meta and either target',()=>{
  const {graph,item}=program(),meta=toLino(item)+'\n',decoded=parseMeta(meta,{constructorGraph:graph});
  assert.deepEqual(decoded,[item]);assert.throws(()=>parseMeta(meta),/copied or foreign/);
  const foreign=createConstructorSourceGraph(sources(ownerSource+' '));assert.throws(()=>parseMeta(meta,{constructorGraph:foreign}),/producer graph/);
  const ts=emitTypeScript(decoded,{outputPath:'fixture/owner.ts'}),rust=emitRust(decoded);
  assert.match(ts,/import \{ Mistake as routerOriginalError0 \} from "\.\/errors\.js"/);assert.match(ts,/throw new routerOriginalError0/);
  assert.match(rust,/Result<JsPayload<'a>, SourceErrorProjection>/);assert.match(rust,/return Err\(/);assert.match(rust,/return Ok\(/);
  assert.throws(()=>emitTypeScript(decoded),/exact output module path/);
  const mutations=[p=>{delete p.sourceConstructors;},p=>{p.sourceConstructors=null;},p=>{p.conditionalConstructors=false;},p=>{delete p.conditionalConstructors;},p=>{p.params[0].type='number';},p=>{p.name='foreign';},p=>{p.body.at(-1).value={kind:'number',text:'1'};},p=>{p.sourceConstructors.owner.start++;},p=>{p.sourceConstructors.constructors=[];}];
  for(const mutate of mutations)for(const run of [value=>check(value,new Map()),value=>emitRust([value]),value=>emitTypeScript([value],{outputPath:'fixture/owner.ts'})]) {
    const bad=clone(item);mutate(bad);assert.throws(()=>run(bad));
  }
  // Successful private issuance must never make its mutable parent trusted.
  // These mutate the exact associated object, unlike the cloned cases above.
  for(const mutate of [p=>{p.body.at(-1).value={kind:'null'};},p=>{p.sourceConstructors=clone(p.sourceConstructors);p.sourceConstructors.sources[0].source+=' ';},p=>{p.params[0].type='number';},p=>{delete p.sourceConstructors;}]) {
    const issued=program().item;assert.deepEqual(check(issued,new Map()),issued);mutate(issued);assert.throws(()=>check(issued,new Map()));
  }
  let reads=0;const issued=program().item,proxy=new Proxy(issued,{get(){reads++;throw Error('proxy');}});assert.throws(()=>check(proxy,new Map()));assert.equal(reads,0);
  assert.equal(analyzeJavaScript(ownerSource,{sourcePath:'fixture/owner.mjs',constructorGraph:graph}).program.some(row=>row.name==='selected'),true);
  assert.equal(analyzeJavaScript(ownerSource,{sourcePath:'fixture/owner.mjs'}).program.some(row=>row.name==='selected'),false);
});


test('private syntax occurrences match the complete old leaf across every native new expression and ordered effects',{timeout:60000},async()=>{
  const root=process.env.ROUTER_NATIVE_TS_SOURCE_ROOT??resolve(dirname(fileURLToPath(import.meta.url)),'../../../..'),directory=mkdtempSync(join(tmpdir(),'router-constructor-effect-oracle-'));
  const fixture=join(root,'tools/translation/fixtures/source-constructor-effect-index'),manifest=JSON.parse(readFileSync(join(fixture,'manifest.json'),'utf8')),oldBytes=readFileSync(join(fixture,manifest.fullSourceFixture));
  assert.equal(oldBytes.length,manifest.bytes);assert.equal(createHash('sha256').update(oldBytes).digest('hex'),manifest.sha256);
  // Only import specifiers change in this bounded isolated old ESM leaf. Its
  // complete pinned implementation and private issuer maps remain independent.
  let oldModule=oldBytes.toString('utf8');const imports=[];
  for(const name of ['module-syntax.mjs','completions.mjs']){const from="'./"+name+"'",to=JSON.stringify(new URL('../vendor/'+name,import.meta.url).href);assert.equal(oldModule.split(from).length,2);oldModule=oldModule.replace(from,to);imports.push({from,to});}
  const oldPath=join(directory,'old-source-constructors.mjs');writeFileSync(oldPath,oldModule,{flag:'wx'});
  const vectors={manifest,oldModule,imports,fullOriginalNativeSources:[],nativeExpressions:[],orderedEffects:[],lexicalSpellings:[],runtimeParity:false,rustCompiled:false};
  const retain=()=>retainRaw('source-constructor-effect-index',vectors);
  try {
    const old=await import(pathToFileURL(oldPath).href),current={createConstructorSourceGraph,issueImportedErrorConstructor,originalImportedErrorConstructor};
    const result=(implementation,graph,path,start,end)=>{try{const token=implementation.issueImportedErrorConstructor(graph,path,start,end);return {comparison:{admitted:true,state:implementation.originalImportedErrorConstructor(token)},rawError:null};}catch(error){return {comparison:{admitted:false,error:{name:error.name,message:error.message,slug:error.slug??null}},rawError:{name:error.name,message:error.message,slug:error.slug??null,stack:error.stack}};}};
    const modules=JSON.parse(readFileSync(join(root,'parity/js-native-portable-draft.json'),'utf8')).modules,records=modules.map(module=>({path:module.path,source:readFileSync(join(root,module.path),'utf8')}));
    assert.equal(records.length,52);vectors.fullOriginalNativeSources=records;
    const oldGraph=old.createConstructorSourceGraph(records),newGraph=createConstructorSourceGraph(records);let admitted=0;
    for(const record of records){const {ts,file}=ownershipSyntax(record.source),nodes=[];const visit=node=>{if(ts.isNewExpression(node))nodes.push(node);ts.forEachChild(node,visit);};visit(file);
      for(const node of nodes){const start=node.getStart(file),end=node.end,before=result(old,oldGraph,record.path,start,end),after=result(current,newGraph,record.path,start,end);vectors.nativeExpressions.push({path:record.path,start,end,before,after});assert.deepEqual(after.comparison,before.comparison,record.path+':'+start);if(after.comparison.admitted)admitted++;}
    }
    assert.ok(vectors.nativeExpressions.length>0);assert.ok(admitted>0);
    const owners=[
      ['renamed-import',ownerSource.replaceAll('Failure','Renamed'),true],
      ['escaped-import',ownerSource.replace('as Failure','as F\\u0061ilure'),true],
      ['escaped-reference',ownerSource.replace('new Failure','new F\\u0061ilure'),true],
      ['shadowed-parameter',ownerSource.replace('selected(value)','selected(value,Failure)'),false],
      ['shadowed-local',ownerSource.replace('if(value===null)','const Failure=Object;if(value===null)'),false],
      ['alias-escape',ownerSource+'const extra=Failure;',false],
      ['unrelated-target-spelling',ownerSource+'const Mistake=1;',true],
      ['local-Error-shadow',ownerSource+'const Error={};Error.prototype=1;',true],
      ['local-Function-shadow',ownerSource+'function helper(Function){return Function;}',true],
      ['Error-import-alias',ownerSource.replaceAll('Failure','Error'),true],
    ];
    for(const [label,owner,admitted]of owners){const records=sources(owner),beforeGraph=old.createConstructorSourceGraph(records),afterGraph=createConstructorSourceGraph(records),start=owner.indexOf('new '),end=owner.indexOf(');',start)+1,before=result(old,beforeGraph,'fixture/owner.mjs',start,end),after=result(current,afterGraph,'fixture/owner.mjs',start,end);vectors.lexicalSpellings.push({label,records,before,after});assert.deepEqual(after.comparison,before.comparison,label);assert.equal(after.comparison.admitted,admitted,label);}
    const effects=['','const one=value=>value instanceof Mistake;const two=value=>value instanceof Mistake;',
      'Mistake.prototype.status=1;Error.prototype.code=2;','Error.prototype.code=2;Mistake.prototype.status=1;',
      'function nested(){return Mistake.prototype;}','const nested=()=>Mistake["prototype"];',
      'Mistake?.prototype;','Object.defineProperty(Object.prototype,"status",{set(value){}});',
      'Array.prototype.includes=other;','const nested=()=>eval("1");','const nested=()=>Function("return 1");'];
    for(const effect of effects){const records=sources(ownerSource,errorSource+effect),beforeGraph=old.createConstructorSourceGraph(records),afterGraph=createConstructorSourceGraph(records),start=ownerSource.indexOf('new Failure'),end=ownerSource.indexOf(');',start)+1,before=result(old,beforeGraph,'fixture/owner.mjs',start,end),after=result(current,afterGraph,'fixture/owner.mjs',start,end);vectors.orderedEffects.push({effect,records,before,after});assert.deepEqual(after.comparison,before.comparison,effect);assert.equal(after.comparison.admitted,effect===''||effect.startsWith('const one='));}
  } finally {await retain();rmSync(directory,{recursive:true,force:true});}
});

// Runs in a child so temporary ambient mutations cannot affect other tests.
// The instrumentation counts which branch ran; it adds no public production
// option or trusted encoder/proof state, and its full source is retained.
async function encoderOracle(adapterSource,oldSource,proofText) {
  const {default:assert}=await import('node:assert/strict');
  const originalFrom=Buffer.from,apply=Reflect.apply,define=Object.defineProperty,descriptor=Object.getOwnPropertyDescriptor;
  const originalString=String,originalSymbol=Symbol,typedPrototype=Object.getPrototypeOf(Uint8Array.prototype);
  const iteratorPrototype=Object.getPrototypeOf(new Uint8Array()[originalSymbol.iterator]());
  const nativeTest=RegExp.prototype.test,nativeCompile=RegExp.prototype.compile,nativeCharCode=String.fromCharCode;
  let sequence=0;
  const instrumented=adapterSource.replace('let guard;','let guard;let fastCalls=0,guardCalls=0;export const encodedFastCount=()=>fastCalls;export const encodedGuardCount=()=>guardCalls;')
    .replace('function initializeGuard() {','function initializeGuard() {guardCalls++;')
    .replace('if(count>=0) {','if(count>=0) {fastCalls++;');
  assert.notEqual(instrumented,adapterSource);
  const load=source=>import('data:text/javascript;base64,'+apply(originalFrom,Buffer,[source+'\n// isolated oracle instance '+sequence+++'\n']).toString('base64'));
  const report={adapterSource,instrumented,oldSource,proofText,values:[],tapes:[],privateRegexIdentityIsDistinct:true};
  const pair=async()=>({actual:await load(instrumented),old:await load(oldSource)});
  try {
  const baseline=await pair();assert.equal(baseline.actual.encodedGuardCount(),0);
  const authored=[['','%'],['AZaz09._~*/<>=!&|+-','AZaz09._~*/<>=!&|+-'],[' ?#:%','%20%3F%23%3A%25'],['é','%C3%A9'],['\ud800','%EF%BF%BD'],['\udfff','%EF%BF%BD'],['😀','%F0%9F%98%80']];
  for(const [text,expected]of authored){const actual=baseline.actual.encodeConstructorProofWord(text),old=baseline.old.encodeWord(text);report.values.push({text,expected,actual,old});assert.equal(actual,expected);assert.equal(old,expected);}
  let allUnits='';for(let unit=0;unit<65536;unit++)allUnits+=originalString.fromCharCode(unit);
  for(const text of [allUnits,proofText.repeat(12)]){const actual=baseline.actual.encodeConstructorProofWord(text),old=baseline.old.encodeWord(text);report.values.push({text,actual,old});assert.equal(actual,old);}
  assert.ok(baseline.actual.encodedFastCount()>0,'native defaults must exercise the fast branch on each actual host');
  const compare=async(label,setup,{warm=true,text='A ?é',expectFast=false}={})=>{
    const modules=await pair();if(warm){modules.actual.encodeConstructorProofWord('warm');modules.old.encodeWord('warm');}
    const rows=[];
    for(const [kind,fn]of [['old',modules.old.encodeWord],['actual',modules.actual.encodeConstructorProofWord]]){
      const trace=[],cleanup=setup(trace);let value,error,rawError;
      const before=modules.actual.encodedFastCount();
      try{value=fn(text);}catch(caught){error={name:caught.name,message:caught.message};rawError={...error,stack:caught.stack};}finally{cleanup();}
      rows.push({kind,comparison:{value,error,trace},rawError,fastDelta:modules.actual.encodedFastCount()-before});
    }
    report.tapes.push({label,rows});assert.deepEqual(rows[1].comparison,rows[0].comparison,label);
    assert.equal(rows[1].fastDelta,expectFast?1:0,label+' eligibility');
  };
  const property=(object,key,value)=>{const previous=descriptor(object,key);define(object,key,{value,writable:true,configurable:true});return()=>{if(previous)define(object,key,previous);else delete object[key];};};
  for(const [object,key]of [[String,'fromCharCode'],[String.prototype,'toUpperCase'],[String.prototype,'padStart'],[Number.prototype,'toString'],[RegExp.prototype,'test'],[RegExp.prototype,'exec']]) {
    await compare('late-wrapper-'+key,trace=>{const original=object[key];return property(object,key,function(...args){trace.push([key,args]);return apply(original,this,args);});});
    await compare('late-accessor-'+key,trace=>{const previous=descriptor(object,key);define(object,key,{configurable:true,get(){trace.push(['get',key]);return previous.value;}});return()=>define(object,key,previous);});
  }
  await compare('cold-wrapper',trace=>{const original=String.fromCharCode;return property(String,'fromCharCode',function(...args){trace.push(['fromCharCode',args]);return apply(original,this,args);});},{warm:false});
  for(const [object,key]of [[Object,'getOwnPropertyDescriptor'],[Object,'getPrototypeOf'],[Reflect,'apply'],[Function.prototype,'toString']]) {
    await compare('late-cold-infrastructure-'+key,trace=>{const original=object[key];return property(object,key,function(...args){trace.push(['unexpected-guard-callback',key]);return apply(original,this,args);});},{warm:false});
  }
  await compare('mid-Buffer-global-String',trace=>{
    const restoreString=descriptor(globalThis,'String'),restore=property(Buffer,'from',function(...args){trace.push('Buffer.from');const result=apply(originalFrom,this,args);define(globalThis,'String',{value:{fromCharCode(...values){trace.push(['replacement-String',values]);return apply(nativeCharCode,originalString,values);}},writable:true,configurable:true});return result;});
    return()=>{restore();define(globalThis,'String',restoreString);};
  });
  for(const [object,key]of [[Object,'getOwnPropertyDescriptor'],[Object,'getPrototypeOf'],[Reflect,'apply']]) {
    await compare('mid-Buffer-infrastructure-'+key,trace=>{
      const previous=descriptor(object,key),restore=property(Buffer,'from',function(...args){trace.push('Buffer.from');const result=apply(originalFrom,this,args);define(object,key,{configurable:true,writable:true,value:function(...values){trace.push(['unexpected-guard-callback',key]);return apply(previous.value,this,values);}});return result;});
      return()=>{define(object,key,previous);restore();};
    },{warm:false});
  }
  for(const name of ['Number','Uint8Array','ArrayBuffer','Function','Symbol']) {
    await compare('cold-global-accessor-'+name,trace=>{const previous=descriptor(globalThis,name);define(globalThis,name,{configurable:true,get(){trace.push(['global-get',name]);return previous.value;}});return()=>define(globalThis,name,previous);},{warm:false,expectFast:name==='ArrayBuffer'||name==='Function'});
  }
  await compare('late-global-String-accessor',trace=>{const previous=descriptor(globalThis,'String');define(globalThis,'String',{configurable:true,get(){trace.push('String-get');return originalString;}});return()=>define(globalThis,'String',previous);});
  await compare('custom-iterator-and-next-getter',trace=>property(Buffer,'from',function(){trace.push('Buffer.from');const bytes=new Uint8Array([65,32,255]);define(bytes,originalSymbol.iterator,{get(){trace.push('iterator-get');return function(){trace.push('iterator-call');let index=0;return{get next(){trace.push('next-get');return()=>{trace.push('next');return index<3?{value:bytes[index++],done:false}:{done:true};};},return(){trace.push('return');return{done:true};}};};}});return bytes;}));
  await compare('late-native-iterator-next-wrapper',trace=>{const original=iteratorPrototype.next;return property(iteratorPrototype,'next',function(...args){trace.push('next');return apply(original,this,args);});});
  await compare('late-native-iterator-next-getter',trace=>{const previous=descriptor(iteratorPrototype,'next');define(iteratorPrototype,'next',{configurable:true,get(){trace.push('next-get');return previous.value;}});return()=>define(iteratorPrototype,'next',previous);});
  await compare('IteratorClose-on-byte-coercion-throw',trace=>{
    const first=property(Buffer,'from',()=>({[originalSymbol.iterator](){let count=0;trace.push('iterator');return{next(){trace.push('next');return{value:++count,done:false};},return(){trace.push('return');return{done:true};}};}}));
    const second=property(String,'fromCharCode',()=>{trace.push('fromCharCode-throw');throw Error('expected encoder failure');});return()=>{second();first();};
  });
  await compare('coercive-byte-values',trace=>property(Buffer,'from',()=>[{valueOf(){trace.push('valueOf');return 255;},toString(radix){trace.push(['byte-toString',radix]);return'ff';}}]));
  await compare('proxy-byte-container',trace=>property(Buffer,'from',()=>new Proxy([65,255],{get(target,key){trace.push(['proxy-get',typeof key==='symbol'?'iterator':key]);return Reflect.get(target,key);}})));
  await compare('all-256-real-byte-values',()=>property(Buffer,'from',()=>{const bytes=new Uint8Array(256);for(let index=0;index<256;index++)bytes[index]=index;return bytes;}),{expectFast:true});
  if(typeof SharedArrayBuffer==='function')await compare('shared-byte-view',()=>property(Buffer,'from',()=>new Uint8Array(new SharedArrayBuffer(2))));
  for(const [family,wrong]of [['Object',Object.prototype.toString],['String',String.prototype.toString],['BigInt',BigInt.prototype.toString],['Array',Array.prototype.toString]]) {
    await compare('cold-wrong-native-number-'+family,trace=>{
      const first=property(Number.prototype,'toString',wrong),previous=descriptor(Number.prototype,originalSymbol.toStringTag);
      define(Number.prototype,originalSymbol.toStringTag,{configurable:true,get(){trace.push('Number-tag');return'Observed';}});
      return()=>{first();if(previous)define(Number.prototype,originalSymbol.toStringTag,previous);else delete Number.prototype[originalSymbol.toStringTag];};
    },{warm:false});
  }
  await compare('cold-proxy-typed-prototype-no-descriptor-traps',trace=>{
    const original=Object.getPrototypeOf(Uint8Array.prototype),forward=new Proxy(original,{getOwnPropertyDescriptor(target,key){trace.push(['unexpected-descriptor',typeof key==='symbol'?'symbol':key]);return descriptor(target,key);}});
    Object.setPrototypeOf(Uint8Array.prototype,forward);return()=>Object.setPrototypeOf(Uint8Array.prototype,original);
  },{warm:false});
  await compare('cold-wrong-native-values-family',trace=>{
    const first=property(typedPrototype,originalSymbol.iterator,Array.prototype.values),second=property(Buffer,'from',()=>{const bytes=new Uint8Array([65]);define(bytes,'length',{get(){trace.push('own-length');return 0;}});return bytes;});return()=>{second();first();};
  },{warm:false});
  await compare('cold-wrong-native-next-family',()=>{const mapIterator=new Map().values();return property(iteratorPrototype,'next',Object.getPrototypeOf(mapIterator).next);},{warm:false});
  {
    const modules=await pair(),rows=[];
    for(const [kind,fn]of [['old',modules.old.encodeWord],['actual',modules.actual.encodeConstructorProofWord]]) {
      const flag=descriptor(RegExp.prototype,'global');let leaked;
      delete RegExp.prototype.global;
      try {
        fn('warm');
        const restore=property(RegExp.prototype,'test',function(...args){leaked=this;return apply(nativeTest,this,args);});
        try{fn('A');}finally{restore();}
        assert.ok(leaked);apply(nativeCompile,leaked,['^[A-Za-z0-9._~*/<>=!&|+-]$','gu']);
        const before=modules.actual.encodedFastCount(),value=fn('AA');
        rows.push({kind,value,fastDelta:modules.actual.encodedFastCount()-before});
      } finally {define(RegExp.prototype,'global',flag);}
    }
    report.tapes.push({label:'cold-missing-global-getter-leaked-same-pattern-gu',rows});
    assert.equal(rows[1].value,rows[0].value);assert.equal(rows[1].value,'A%41');assert.equal(rows[1].fastDelta,0);
  }
  for(const mutation of ['compile-pattern','compile-flags','own-exec','coercive-lastIndex']) {
    const modules=await pair(),rows=[];modules.actual.encodeConstructorProofWord('warm');modules.old.encodeWord('warm');
    for(const [kind,fn]of [['old',modules.old.encodeWord],['actual',modules.actual.encodeConstructorProofWord]]) {
      let leaked;const trace=[];
      const restore=property(RegExp.prototype,'test',function(...args){leaked=this;return apply(nativeTest,this,args);});
      try{fn('A');}finally{restore();}assert.ok(leaked);
      if(mutation==='compile-pattern')apply(nativeCompile,leaked,['Z','u']);
      if(mutation==='compile-flags')apply(nativeCompile,leaked,['^[A-Za-z0-9._~*/<>=!&|+-]$','g']);
      if(mutation==='own-exec')define(leaked,'exec',{configurable:true,get(){trace.push('private-exec-get');return function(...args){trace.push('private-exec-call');return apply(RegExp.prototype.exec,this,args);};}});
      if(mutation==='coercive-lastIndex')leaked.lastIndex={valueOf(){trace.push('lastIndex-valueOf');return 0;}};
      const before=modules.actual.encodedFastCount(),value=fn('A ?');rows.push({kind,value,trace,fastDelta:modules.actual.encodedFastCount()-before});
    }
    report.tapes.push({label:'leaked-BARE-'+mutation,rows});assert.equal(rows[1].value,rows[0].value,mutation);assert.deepEqual(rows[1].trace,rows[0].trace,mutation);assert.equal(rows[1].fastDelta,0,mutation);
  }
  report.nativeDiagnosticExpressionTextPreserved=false;report.diagnosticBoundaries=[];
  for(const replacement of [null,1,{}]) {
    const modules=await pair(),rows=[];modules.actual.encodeConstructorProofWord('warm');modules.old.encodeWord('warm');
    for(const [kind,fn]of [['old',modules.old.encodeWord],['actual',modules.actual.encodeConstructorProofWord]]) {
      let calls=0,error;const restore=property(Buffer,'from',()=>{calls++;return replacement;});
      try{fn('input');}catch(caught){error={name:caught.name,message:caught.message,stack:caught.stack};}finally{restore();}
      rows.push({kind,calls,error});
    }
    report.diagnosticBoundaries.push({replacement,rows,nativeDiagnosticExpressionTextPreserved:false});
    for(const row of rows){assert.equal(row.calls,1);assert.equal(row.error?.name,'TypeError');}
  }
  } finally {process.stdout.write(JSON.stringify(report));}
}

test('constructor-only encoding matches complete old byte results and callback error and IteratorClose tapes',{timeout:60000},async()=>{
  const adapterSource=readFileSync(new URL('../vendor/constructor-proof-encoding.mjs',import.meta.url),'utf8'),oldSource=readFileSync(new URL('../vendor/lino.mjs',import.meta.url),'utf8');
  const script='('+encoderOracle.toString()+')('+[adapterSource,oldSource,JSON.stringify(program().item.sourceConstructors)].map(value=>JSON.stringify(value)).join(',')+').catch(error=>{console.error(error);process.exitCode=1;});';
  let stdout='',failure;
  try{stdout=execFileSync(process.execPath,process.versions.bun?['--eval',script]:['--input-type=module','--eval',script],{encoding:'utf8',timeout:20000,maxBuffer:16777216,stdio:['ignore','pipe','pipe']});}
  catch(error){failure=error;stdout=error.stdout?.toString()??'';}
  await retainRaw('constructor-proof-encoding',{script,adapterSource,oldSource,stdout,stderr:failure?.stderr?.toString()??'',failure:failure?{message:failure.message,status:failure.status,signal:failure.signal}:null});
  if(failure)throw failure;
  const result=JSON.parse(stdout);assert.ok(result.values.length>=9);assert.ok(result.tapes.length>=30);
});
