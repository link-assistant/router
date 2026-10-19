import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync,realpathSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve,join,dirname} from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {analyzeJavaScript,parseMeta,emitRust,emitTypeScript} from '../translator.mjs';
import {evaluate,evaluateWithOriginalConstructors} from '../interpreter.mjs';
import {prepareOriginalConstructorRuntime,constructOriginalError} from '../original-constructor-runtime.mjs';
import {createConstructorSourceGraph,reissueImportedErrorConstructor,observeOriginalImportedErrorConstructorClass} from '../vendor/source-constructors.mjs';
import {toLino} from '../vendor/ir.mjs';
import {terminatesCompletion} from '../vendor/completions.mjs';
import {parseJavaScriptItem} from '../vendor/frontends.mjs';
import {lex} from '../vendor/lexer.mjs';

const root=fileURLToPath(new URL('../../../../',import.meta.url)),require=createRequire(join(root,'js/package.json'));
const hash=value=>createHash('sha256').update(value).digest('hex');
const put=(root,path,source)=>{mkdirSync(dirname(join(root,path)),{recursive:true});writeFileSync(join(root,path),source);};
const result=run=>{try{return {normal:true,value:run()};}catch(error){return {normal:false,error};}};
const asyncResult=async run=>{try{return {normal:true,value:await run()};}catch(error){return {normal:false,error};}};
function retain(name,value) {
  const directory=process.env.ROUTER_CONSTRUCTOR_VECTOR_DIR;
  if(directory){mkdirSync(directory,{recursive:true});writeFileSync(join(directory,name+'.json.gz'),gzipSync(JSON.stringify(value,(_,item)=>typeof item==='bigint'?{$integer:String(item)}:item),{mtime:0}),{flag:'wx'});}
}
function fixture(t,source,errorSource="export class Mistake extends Error {constructor(message,status=400){super(message);this.status=status;this.code='bounded';}}") {
  const directory=realpathSync(mkdtempSync(join(tmpdir(),'router-constructor-completion-')));t.after(()=>rmSync(directory,{recursive:true,force:true}));
  const sources=[{path:'fixture/errors.mjs',source:errorSource},{path:'fixture/owner.mjs',source}];
  put(directory,'package.json','{"type":"module"}');for(const row of sources)put(directory,row.path,row.source);
  const graph=createConstructorSourceGraph(sources),analysis=analyzeJavaScript(source,{sourcePath:'fixture/owner.mjs',constructorGraph:graph});
  const meta=analysis.program.map(toLino).join('\n')+'\n',program=parseMeta(meta,{constructorGraph:graph});return {directory,sources,graph,analysis,meta,program};
}
function strict(directory,entry) {
  assert.equal(require('typescript/package.json').version,'5.9.3');
  const args=[require.resolve('typescript/bin/tsc'),'--strict','--allowJs','--types','node','--typeRoots',dirname(dirname(require.resolve('@types/node/package.json'))),'--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext','--rootDir',directory,'--outDir',join(directory,'out'),join(directory,entry)];
  const run=spawnSync(process.execPath,args,{encoding:'utf8',timeout:20000});
  retain('strict-'+hash(directory+'/'+entry).slice(0,24),{command:[process.execPath,...args],exitCode:run.status,signal:run.signal,stdout:run.stdout,stderr:run.stderr,error:run.error?.message});
  assert.equal(run.status,0,JSON.stringify({stdout:run.stdout,stderr:run.stderr,error:run.error?.message}));
}
function errorFacts(error) {
  const descriptors=Object.getOwnPropertyDescriptors(error),fields={};
  for(const [key,field]of Object.entries(descriptors))fields[key]={writable:field.writable,enumerable:field.enumerable,configurable:field.configurable,value:field.value};
  return {name:error.name,message:error.message,status:error.status,code:error.code,ownKeys:Reflect.ownKeys(error),fields};
}
// Raw vectors above retain every host diagnostic value. Only these explicitly
// unpreserved callsite locations/stack values are outside the checked contract;
// their own-key order, descriptor flags and value types still compare exactly.
const hostDiagnostics=new Set(['stack','line','column','originalLine','originalColumn','sourceURL']);
function errorContract(error) {
  const facts=errorFacts(error),fields={};
  for(const [key,field]of Object.entries(facts.fields))fields[key]=hostDiagnostics.has(key)?{writable:field.writable,enumerable:field.enumerable,configurable:field.configurable,hostDiagnosticType:typeof field.value}:field;
  return {...facts,fields};
}

test('normal and throw completions preserve unknown identity and actual imported Error objects',{timeout:60000},async t=>{
  const source="import {Mistake} from './errors.mjs';export function selected(value){if(value===null)throw new Mistake('bad');return value;}",f=fixture(t,source);
  assert.equal(f.program.length,1);assert.equal(f.program[0].returns,'value');assert.equal(f.program[0].conditionalConstructors,true);assert.equal(f.program[0].sourceConstructors.constructors[0].conditions.hostDiagnosticLocationsPreserved,false);
  const original=await import(pathToFileURL(join(f.directory,'fixture/owner.mjs')).href),{Mistake}=await import(pathToFileURL(join(f.directory,'fixture/errors.mjs')).href);
  const values=[undefined,false,true,0,-0,NaN,Infinity,'','\ud800','😀',0n,10n**100n,Symbol('opaque'),()=>1,{},Object('boxed')],rows=[];
  for(const value of values){const observed=await evaluateWithOriginalConstructors(f.program,'selected',[value],{sourceRoot:f.directory,executeOriginalModules:true});assert.ok(Object.is(observed,original.selected(value)));rows.push({kind:typeof value,sameIdentity:true});}
  assert.throws(()=>evaluate(f.program,'selected',[null]),/verified receiving runtime/);
  const left=result(()=>original.selected(null)),right=await asyncResult(()=>evaluateWithOriginalConstructors(f.program,'selected',[null],{sourceRoot:f.directory,executeOriginalModules:true}));
  assert.equal(left.normal,false);assert.equal(right.normal,false);assert.ok(right.error instanceof Mistake);assert.equal(Object.getPrototypeOf(right.error),Mistake.prototype);assert.notEqual(left.error,right.error);assert.deepEqual(errorContract(left.error),errorContract(right.error));
  await assert.rejects(()=>evaluateWithOriginalConstructors(f.program,'selected',[null],{sourceRoot:f.directory}),/opt-in/);
  const ts=emitTypeScript(f.program,{outputPath:'fixture/selected.ts'});put(f.directory,'fixture/selected.ts',ts);put(f.directory,'fixture/errors.js',f.sources[0].source);strict(f.directory,'fixture/selected.ts');
  const target=await import(pathToFileURL(join(f.directory,'out/fixture/selected.js')).href),targetError=await import(pathToFileURL(join(f.directory,'out/fixture/errors.js')).href);
  for(const value of values)assert.ok(Object.is(target.selected(value),value));
  const thrown=result(()=>target.selected(null));assert.ok(thrown.error instanceof targetError.Mistake);assert.equal(thrown.error.constructor,targetError.Mistake);assert.deepEqual(errorContract(left.error),errorContract(thrown.error));
  retain('normal-throw-complete',{sources:f.sources,analysis:f.analysis,meta:f.meta,program:f.program,rust:emitRust(f.program),typescript:ts,rows,originalError:errorFacts(left.error),irError:errorFacts(right.error),targetError:errorFacts(thrown.error)});
});

test('UTF16 messages defaults and argument order are source proved; throw ASI never recovers invalid code',{timeout:60000},async t=>{
  const source="import {Mistake} from './errors.mjs';export function selected(value){if(value===null)throw new Mistake('bad\\ud800',401);return value;}",f=fixture(t,source);
  const observed=await asyncResult(()=>evaluateWithOriginalConstructors(f.program,'selected',[null],{sourceRoot:f.directory,executeOriginalModules:true}));
  assert.equal(observed.error.message,'bad\ud800');assert.equal(observed.error.status,401);
  const rust=emitRust(f.program);assert.match(rust,/55296/);assert.match(rust,/Number\(401\.0\)/);
  const asiRows=[];
  for(const separator of ['\n','\r','\u2028','\u2029','/*\n*/','/*\r\n*/',' /*a*/\n/*b*/ ','//a\n','/*\u2028*/','/*\u2029*/','\r\n','/*\r*/']) {
    const changed=source.replace('throw new','throw'+separator+'new'),sources=f.sources.map(row=>({...row,source:row.path.endsWith('owner.mjs')?changed:row.source}));
    const graphResult=result(()=>createConstructorSourceGraph(sources));assert.equal(graphResult.normal,false,JSON.stringify({separator,sources}));
    const tokens=lex(changed,'JavaScript').filter(token=>token.start>=changed.indexOf('export function'));
    assert.throws(()=>parseJavaScriptItem(tokens,'',{source:changed}),/line terminator after throw/);
    asiRows.push({separator,sources,graphRefusal:graphResult.error.message,independentParentRefusal:'line terminator after throw'});
  }
  for(const separator of [' ','/**/',' /*inline*/ ']) {
    const changed=source.replace('throw new','throw'+separator+'new'),sources=f.sources.map(row=>({...row,source:row.path.endsWith('owner.mjs')?changed:row.source})),graph=createConstructorSourceGraph(sources);
    const analysis=analyzeJavaScript(changed,{sourcePath:'fixture/owner.mjs',constructorGraph:graph});assert.equal(analysis.program.length,1);
    asiRows.push({separator,sources,program:analysis.program});
  }
  for(const args of ['undefined',"'bad',sideEffect()","sideEffect(),'bad'",'...args']) {
    const changed=source.replace("'bad\\ud800',401",args),graph=createConstructorSourceGraph(f.sources.map(row=>({...row,source:row.path.endsWith('owner.mjs')?changed:row.source})));
    assert.equal(analyzeJavaScript(changed,{sourcePath:'fixture/owner.mjs',constructorGraph:graph}).program.length,0);
  }
  assert.equal(terminatesCompletion([{kind:'throw',value:{}}]),true);
  retain('utf16-defaults-asi',{sources:f.sources,meta:f.meta,rust,observed:errorFacts(observed.error),asiRows,hostDiagnosticLocationsPreserved:false,originalCaseAndChildCapsUnchanged:true});
});

test('receiving source bytes and observed ESM cache versions are immutable and never silently reloaded',{timeout:60000},async t=>{
  const source="import {Mistake} from './errors.mjs';export function selected(value){if(value===null)throw new Mistake('bad');return value;}",f=fixture(t,source);
  const options={sourceRoot:f.directory,executeOriginalModules:true};assert.equal(await evaluateWithOriginalConstructors(f.program,'selected',[3],options),3);
  put(f.directory,'fixture/errors.mjs',f.sources[0].source+'\n');
  await assert.rejects(()=>evaluateWithOriginalConstructors(f.program,'selected',[3],options),/differs from its checked graph/);
  const sources=f.sources.map(row=>({...row,source:row.path.endsWith('errors.mjs')?row.source+'\n':row.source})),graph=createConstructorSourceGraph(sources),analysis=analyzeJavaScript(source,{sourcePath:'fixture/owner.mjs',constructorGraph:graph});
  await assert.rejects(()=>evaluateWithOriginalConstructors(analysis.program,'selected',[3],options),/module cache source changed/);
  retain('runtime-source-cache-refusal',{oldSources:f.sources,changedSources:sources,oldProgram:f.program,changedProgram:analysis.program,noReloadConvergenceClaim:true});
});

test('unchanged external preloads preserve exact imported class identity and original class token bytes',{timeout:60000},async t=>{
  const source="import {Mistake} from './errors.mjs';export function selected(value){if(value===null)throw new Mistake('bad');return value;}",rows=[];
  for(const classPrefix of ['export class Mistake','export /* misleading class Other {} */\nclass Mistake','export class M\\u0069stake']) {
    const errorSource=classPrefix+" extends Error {constructor(message,status=400){super(message);this.status=status;this.code='bounded';}}",f=fixture(t,source,errorSource);
    const url=pathToFileURL(join(f.directory,'fixture/errors.mjs')).href,preloaded=await import(url),options={sourceRoot:f.directory,executeOriginalModules:true};
    const runtime=await prepareOriginalConstructorRuntime(f.program,options),proof=f.program[0].sourceConstructors.constructors[0];
    const first=constructOriginalError(proof,runtime),second=constructOriginalError(proof,await prepareOriginalConstructorRuntime(f.program,options));
    assert.equal(first.constructor,preloaded.Mistake);assert.equal(Object.getPrototypeOf(first),preloaded.Mistake.prototype);assert.ok(first instanceof preloaded.Mistake);
    assert.notEqual(first,second);assert.deepEqual(errorContract(first),errorContract(second));assert.equal(first.message,'bad');assert.equal(first.status,400);assert.equal(first.code,'bounded');
    const opaque={};assert.equal(evaluate(f.program,'selected',[opaque],runtime),opaque);assert.equal((await import(url)).Mistake,preloaded.Mistake);
    rows.push({sources:f.sources,program:f.program,meta:f.meta,first:errorFacts(first),second:errorFacts(second),constructorIdentityPreserved:true,originalImportUrl:url});
  }
  retain('runtime-unchanged-external-preloads',{rows,queryReloadUsed:false,closedConstructorRecipeOnly:true});
});

test('external preload A followed by source B refuses before first receiving runtime can claim B',{timeout:60000},async t=>{
  const source="import {Mistake} from './errors.mjs';export function selected(value){if(value===null)throw new Mistake('bad');return value;}",rows=[];
  for(const change of ['default','field']) {
    const f=fixture(t,source),url=pathToFileURL(join(f.directory,'fixture/errors.mjs')).href,preloaded=await import(url);
    const changed=f.sources[0].source.replace(change==='default'?'status=400':"'bounded'",change==='default'?'status=402':"'changed'");
    put(f.directory,'fixture/errors.mjs',changed);
    const sources=f.sources.map(row=>({...row,source:row.path.endsWith('errors.mjs')?changed:row.source})),graph=createConstructorSourceGraph(sources),analysis=analyzeJavaScript(source,{sourcePath:'fixture/owner.mjs',constructorGraph:graph});
    assert.equal(analysis.program.length,1);const meta=analysis.program.map(toLino).join('\n')+'\n',program=parseMeta(meta,{constructorGraph:graph}),proof=program[0].sourceConstructors.constructors[0];
    const current=(await import(url)).Mistake;assert.equal(current,preloaded.Mistake);const stale=new current('bad');assert.equal(stale.status,400);assert.equal(stale.code,'bounded');
    if(change==='default')assert.equal(proof.original.params[1].default.value,402);else assert.equal(proof.original.fields[1].value.value,'changed');
    const options={sourceRoot:f.directory,executeOriginalModules:true};
    await assert.rejects(()=>prepareOriginalConstructorRuntime(program,options),/module cache class syntax differs/);
    await assert.rejects(()=>evaluateWithOriginalConstructors(program,'selected',[7],options),/module cache class syntax differs/);
    await assert.rejects(()=>evaluateWithOriginalConstructors(program,'selected',[null],options),/module cache class syntax differs/);
    assert.equal((await import(url)).Mistake,preloaded.Mistake);assert.equal(readFileSync(join(f.directory,'fixture/errors.mjs'),'utf8'),changed);
    rows.push({change,oldSources:f.sources,changedSources:sources,program,meta,staleOriginalError:errorFacts(stale),originalUrlPreserved:url,firstPrepareRejected:true,normalBranchRejected:true,throwBranchRejected:true});
  }
  retain('runtime-foreign-external-preload-source',{rows,noModuleReload:true,constructorSourceAttestationOnly:true,completeModuleCacheProvenanceClaimed:false});
});

test('closed reflected recipes grant no source authority and cached ancestry rejects proxies and getters without invoking them',{timeout:60000},async t=>{
  const source="import {Mistake} from './errors.mjs';export function selected(value){if(value===null)throw new Mistake('bad');return value;}",rows=[];
  const describe=Function.prototype.toString,apply=Reflect.apply;
  for(const mode of ['unchanged','shadowed-base','prototype-parent','static-parent','prototype-constructor-getter','prototype-field-getter','static-getter']) {
    const f=fixture(t,source),original=f.sources[0].source,url=pathToFileURL(join(f.directory,'fixture/errors.mjs')).href;
    const cachedSource=mode==='shadowed-base'?'const Error=class LocalError extends globalThis.Error {};\n'+original:original;
    put(f.directory,'fixture/errors.mjs',cachedSource);const module=await import(url),constructor=module.Mistake;put(f.directory,'fixture/errors.mjs',original);
    const proof=f.program[0].sourceConstructors.constructors[0],token=reissueImportedErrorConstructor(proof),reflectedSource=apply(describe,constructor,[]),observation=observeOriginalImportedErrorConstructorClass(token,reflectedSource);
    assert.equal(observation.recipesEqual,true);assert.equal(observation.sourceProofIssued,false);assert.equal(observation.semanticAuthority,false);
    assert.deepEqual(observation.originalSemanticRecipe,observation.reflectedSemanticRecipe);
    assert.equal(observation.originalSource,original);assert.equal(observation.reflectedSource,reflectedSource);
    let traps=0;
    const proxied=value=>new Proxy(value,{get(){traps++;throw Error('unexpected proxy get');},getOwnPropertyDescriptor(){traps++;throw Error('unexpected proxy descriptor');},ownKeys(){traps++;throw Error('unexpected proxy keys');},getPrototypeOf(target){traps++;return Object.getPrototypeOf(target);}});
    if(mode==='prototype-parent')Object.setPrototypeOf(constructor.prototype,proxied(Error.prototype));
    if(mode==='static-parent')Object.setPrototypeOf(constructor,proxied(Error));
    if(mode==='prototype-constructor-getter')Object.defineProperty(constructor.prototype,'constructor',{configurable:true,get(){traps++;throw Error('unexpected constructor getter');}});
    if(mode==='prototype-field-getter')Object.defineProperty(constructor.prototype,'status',{configurable:true,get(){traps++;throw Error('unexpected field getter');},set(){traps++;throw Error('unexpected field setter');}});
    if(mode==='static-getter')Object.defineProperty(constructor,'extra',{configurable:true,get(){traps++;throw Error('unexpected static getter');}});
    const setupTraps=traps;traps=0;const options={sourceRoot:f.directory,executeOriginalModules:true};
    if(mode==='unchanged') {
      const runtime=await prepareOriginalConstructorRuntime(f.program,options),error=constructOriginalError(proof,runtime);
      assert.equal(error.constructor,constructor);assert.equal(error.status,400);assert.equal(error.code,'bounded');
    } else {
      if(mode==='shadowed-base')assert.notEqual(Object.getPrototypeOf(constructor),Error,'the identical reflected class has a foreign lexical superclass');
      await assert.rejects(()=>prepareOriginalConstructorRuntime(f.program,options),/runtime ancestry or prototype differs/);
      await assert.rejects(()=>evaluateWithOriginalConstructors(f.program,'selected',[7],options),/runtime ancestry or prototype differs/);
    }
    assert.equal(traps,0);assert.equal(readFileSync(join(f.directory,'fixture/errors.mjs'),'utf8'),original);
    rows.push({mode,cachedSource,currentSources:f.sources,program:f.program,meta:f.meta,observation,setupTraps,guardTraps:traps});
    if(mode==='unchanged') {
      const unsupported=[reflectedSource+';sideEffect();',reflectedSource+'\nclass Other {}',"class Mistake extends Error {constructor(message,status=400){super(message);this.status=status;this.code='bounded';sideEffect();}}","class Mistake extends Error {constructor(message,status=400){super(message);this.status=status;this.code='bounded';}get hidden(){return 1;}}","class Mistake extends Error {constructor(message,status=400){super(message);this.status=sideEffect();this.code='bounded';}}","class Mistake extends Error {constructor(message,status=400){super(message);this.code='bounded';this.status=status;}}"];
      for(const text of unsupported)assert.throws(()=>observeOriginalImportedErrorConstructorClass(token,text));
      assert.throws(()=>observeOriginalImportedErrorConstructorClass({},reflectedSource),/copied or foreign/);
      const proxy=new Proxy(token,{get(){traps++;throw Error('unexpected token getter');}});assert.throws(()=>observeOriginalImportedErrorConstructorClass(proxy,reflectedSource),/copied or foreign/);assert.equal(traps,0);
      rows.at(-1).unsupportedReflections=unsupported;
    }
  }
  retain('runtime-reflected-recipes-and-ancestry',{rows,reflectionIssuesSourceTokens:false,normalizationUsed:false,completeModuleCacheProvenanceClaimed:false});
});

test('receiving runtime binds every exact callsite and full source graph, never only class path and export',{timeout:60000},async t=>{
  const source="import {Mistake} from './errors.mjs';export function selected(value){if(value===null)throw new Mistake('bad');if(value===undefined)throw new Mistake('missing',401);return value;}",f=fixture(t,source);
  const runtime=await prepareOriginalConstructorRuntime(f.program,{sourceRoot:f.directory,executeOriginalModules:true});
  const proofs=f.program[0].sourceConstructors.constructors;assert.equal(proofs.length,2);
  const first=constructOriginalError(proofs[0],runtime),second=constructOriginalError(proofs[1],runtime);
  assert.equal(first.message,'bad');assert.equal(first.status,400);assert.equal(second.message,'missing');assert.equal(second.status,401);assert.notEqual(first,second);
  const foreign=[];
  for(const change of ['constructor-default','constructor-field','caller']) {
    const sources=f.sources.map(row=>({...row,source:change==='caller'?row.source.replace("'bad'","'other'"):row.source.replace(change==='constructor-default'?'status=400':"'bounded'",change==='constructor-default'?'status=402':"'foreign'")}));
    const graph=createConstructorSourceGraph(sources),owner=sources.find(row=>row.path==='fixture/owner.mjs');
    const analysis=analyzeJavaScript(owner.source,{sourcePath:owner.path,constructorGraph:graph});assert.equal(analysis.program.length,1);
    const meta=analysis.program.map(toLino).join('\n')+'\n',program=parseMeta(meta,{constructorGraph:graph}),proof=program[0].sourceConstructors.constructors[0];
    assert.equal(proof.import.target,proofs[0].import.target);assert.equal(proof.import.exported,proofs[0].import.exported);
    assert.throws(()=>constructOriginalError(proof,runtime),/foreign original constructor runtime/);
    assert.throws(()=>evaluate(program,'selected',[null],runtime),/foreign original constructor runtime/);
    assert.throws(()=>evaluate(program,'selected',[7],runtime),/foreign original constructor runtime/);
    foreign.push({change,sources,program,meta,rejected:true});
  }
  const parentForgeries=[];
  for(const mode of ['missing-proof','hidden-normal-parent','body','name','return-type']) {
    const wrong=structuredClone(f.program);
    if(mode==='missing-proof'||mode==='hidden-normal-parent'){delete wrong[0].sourceConstructors;delete wrong[0].conditionalConstructors;}
    if(mode==='hidden-normal-parent')wrong[0].body=[{kind:'return',value:{kind:'variable',name:'value'}}];
    if(mode==='body')wrong[0].body.at(-1).value={kind:'null'};
    if(mode==='name')wrong[0].name='changed';
    if(mode==='return-type')wrong[0].returns='number';
    assert.throws(()=>evaluate(wrong,mode==='name'?'changed':'selected',[7],runtime));parentForgeries.push({mode,program:wrong,rejectedBeforeNormalReturn:true});
  }
  assert.throws(()=>evaluate(f.program,'selected',[7],{}),/verified receiving runtime/);
  let traps=0;const proxied=new Proxy(f.program[0],{get(){traps++;throw Error('program getter');}});assert.throws(()=>evaluate([proxied],'selected',[7],runtime));assert.equal(traps,0);
  await assert.rejects(()=>prepareOriginalConstructorRuntime([f.program[0],f.program[0]],{sourceRoot:f.directory,executeOriginalModules:true}),/duplicate.*parent/);
  retain('runtime-complete-proof-lineage',{sources:f.sources,program:f.program,meta:f.meta,first:errorFacts(first),second:errorFacts(second),foreign,parentForgeries,proxyTraps:traps});
});

test('actual TypeScript class import aliases avoid all legal parameter local and top-level names',{timeout:60000},async t=>{
  const source="import {Mistake} from './errors.mjs';export function selected(value,routerOriginalError0){const routerOriginalError1=true;if(value===null)throw new Mistake('bad');return value;}export function routerOriginalError2(value){return value;}",f=fixture(t,source);
  assert.ok(f.program.some(item=>item.name==='selected'));assert.ok(f.program.some(item=>item.name==='router_original_error2'));
  const typescript=emitTypeScript(f.program,{outputPath:'fixture/selected.ts'});assert.match(typescript,/import \{ Mistake as routerOriginalError3 \}/u);
  put(f.directory,'fixture/selected.ts',typescript);put(f.directory,'fixture/errors.js',f.sources[0].source);strict(f.directory,'fixture/selected.ts');
  const target=await import(pathToFileURL(join(f.directory,'out/fixture/selected.js')).href),{Mistake}=await import(pathToFileURL(join(f.directory,'out/fixture/errors.js')).href);
  const opaque={};assert.equal(target.selected(opaque,Symbol('parameter')),opaque);assert.equal(target.routerOriginalError2(opaque),opaque);
  const thrown=result(()=>target.selected(null,Symbol('not-the-constructor')));assert.ok(thrown.error instanceof Mistake);assert.equal(thrown.error.message,'bad');assert.equal(thrown.error.status,400);
  const refused=[];
  for(const changed of [source.replace('routerOriginalError0','__routerOriginalError0'),source.replace('routerOriginalError1','__routerOriginalError0'),source.replace('function selected','function __routerOriginalError0')]) {
    const sources=f.sources.map(row=>({...row,source:row.path.endsWith('owner.mjs')?changed:row.source})),graph=createConstructorSourceGraph(sources),analysis=analyzeJavaScript(changed,{sourcePath:'fixture/owner.mjs',constructorGraph:graph});
    assert.ok(!analysis.program.some(item=>item.sourceConstructors));refused.push({sources,analysis});
  }
  retain('typescript-import-alias-collisions',{sources:f.sources,program:f.program,meta:f.meta,typescript,thrown:errorFacts(thrown.error),refused,leadingUnderscorePreviouslyRefused:true});
});

test('complete original imageMedia body independently preserves all-input throw/return and actual native class identity',{timeout:60000},async t=>{
  const inventory=spawnSync('git',['ls-files','-z','--','js/src'],{cwd:root,encoding:'utf8',timeout:10000});assert.equal(inventory.status,0);
  const paths=inventory.stdout.split('\0').filter(path=>path.endsWith('.mjs')).sort();assert.equal(paths.length,52);
  const sources=paths.map(path=>({path,source:readFileSync(join(root,path),'utf8')})),graph=createConstructorSourceGraph(sources),path='js/src/gemini-protocol.mjs',source=sources.find(row=>row.path===path).source;
  const analysis=analyzeJavaScript(source,{sourcePath:path,constructorGraph:graph}),item=analysis.program.find(row=>row.name==='image_media');
  assert.ok(item,'unchanged whole original imageMedia must check through its qualified constructor source graph');assert.equal(item.params[0].type,'value');assert.equal(item.returns,'value');assert.equal(item.conditionalConstructors,true);
  const meta=toLino(item)+'\n',program=parseMeta(meta,{constructorGraph:graph}),owner=item.sourceConstructors.owner,originalBody=source.slice(owner.start,owner.end);
  const {ProtocolError}=await import(pathToFileURL(join(root,'js/src/protocols.mjs')).href);
  const original=Function('ProtocolError','return ('+originalBody+');')(ProtocolError);
  let reads=0;const getter={get [Symbol.toPrimitive](){reads++;throw Error('coercion');},get value(){reads++;throw Error('property');}},proxy=new Proxy({}, {get(){reads++;throw Error('proxy');}}),revoked=Proxy.revocable({},{});revoked.revoke();
  const cases=[['jpeg','image/jpeg'],['png','image/png'],['gif','image/gif'],['webp','image/webp'],['undefined',undefined],['null',null],['false',false],['zero',0],['negative-zero',-0],['nan',NaN],['huge-bigint',10n**100n],['symbol',Symbol('opaque')],['function',()=>1],['object',{}],['getter-object',getter],['proxy',proxy],['revoked-proxy',revoked.proxy],['boxed-string',Object('image/png')],['lone-surrogate','\ud800'],['other-media','text/plain']],rows=[];
  for(const [label,value]of cases) {
    const expected=result(()=>original(value)),actual=await asyncResult(()=>evaluateWithOriginalConstructors(program,'image_media',[value],{sourceRoot:root,executeOriginalModules:true}));
    assert.equal(actual.normal,expected.normal,label);
    if(expected.normal)assert.ok(Object.is(actual.value,expected.value),label);
    else {assert.ok(actual.error instanceof ProtocolError,label);assert.equal(actual.error.constructor,ProtocolError,label);assert.notEqual(actual.error,expected.error,label);assert.deepEqual(errorContract(actual.error),errorContract(expected.error),label);}
    rows.push({label,normal:expected.normal,...(expected.normal?{sameValue:true}:{original:errorFacts(expected.error),ir:errorFacts(actual.error)})});
  }
  assert.equal(reads,0);
  const directory=realpathSync(mkdtempSync(join(tmpdir(),'router-original-constructor-ts-')));t.after(()=>rmSync(directory,{recursive:true,force:true}));put(directory,'package.json','{"type":"module"}');
  for(const stem of ['protocols','gemini-protocol'])put(directory,'ts/src/'+stem+'.ts',readFileSync(join(root,'ts/src/'+stem+'.ts'),'utf8'));
  const targetPath='ts/src/portable-draft/top-level/gemini-protocol.ts',typescript=emitTypeScript(program,{outputPath:targetPath});put(directory,targetPath,typescript+'\nexport {imageMedia};\n');strict(directory,targetPath);
  const target=await import(pathToFileURL(join(directory,'out',targetPath.replace(/\.ts$/u,'.js'))).href),targetCtor=(await import(pathToFileURL(join(directory,'out/ts/src/protocols.js')).href)).ProtocolError;
  for(const [label,value]of cases) {
    const expected=result(()=>original(value)),actual=result(()=>target.imageMedia(value));assert.equal(actual.normal,expected.normal,label);
    if(expected.normal)assert.ok(Object.is(actual.value,expected.value));else {assert.equal(actual.error.constructor,targetCtor);assert.equal(Object.getPrototypeOf(actual.error),targetCtor.prototype);assert.deepEqual(errorContract(actual.error),errorContract(expected.error));}
  }
  assert.equal(reads,0);
  retain('whole-original-image-media',{sourceInputs:sources.map(row=>({path:row.path,bytes:Buffer.byteLength(row.source),sha256:hash(row.source)})),completeOriginalOwner:originalBody,analysis,program,meta,typescript,rust:emitRust(program),cases:rows,inputPropertyReads:reads,sourceClassIdentityExactWithinEachReceivingModuleGraph:true,rustCompiled:false,runtimeParity:false});
});
