import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync,writeFileSync,mkdtempSync,rmSync,mkdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {analyzeJavaScript,parseMeta,emitRust,emitTypeScript} from '../translator.mjs';
import {toLino,check,lowerSourceClosure} from '../vendor/ir.mjs';
import {createCapturedPrimitiveIssuer,issueCapturedPrimitivesFrom,readCapturedPrimitives,reissueCapturedPrimitives} from '../vendor/captured-primitives.mjs';
import {lexicalClosureName} from '../vendor/lexical-environments.mjs';
import {evaluate} from '../interpreter.mjs';
import {sourceModules,loadTypeScript} from '../native-typescript.mjs';
import {ownershipSyntax} from '../vendor/module-syntax.mjs';

const ROOT=process.env.ROUTER_NATIVE_TS_SOURCE_ROOT??resolve(dirname(fileURLToPath(import.meta.url)),'../../../..');
const hash=value=>createHash('sha256').update(value).digest('hex'),copy=value=>JSON.parse(JSON.stringify(value));
const vectors={schema:'original-captured-primitive-membership-v1',host:process.versions.bun?'Bun '+process.versions.bun:'Node '+process.version,rustCompiled:false,parentsAdmitted:false,positive:[],negative:[],census:[]};
function retain(label,value){if(!process.env.ROUTER_CAPTURED_PRIMITIVE_VECTORS)return;mkdirSync(process.env.ROUTER_CAPTURED_PRIMITIVE_VECTORS,{recursive:true});writeFileSync(join(process.env.ROUTER_CAPTURED_PRIMITIVE_VECTORS,label+'.json.gz'),gzipSync(JSON.stringify(value)));}
function issue(source,body,path='fixture.mjs') {const start=source.indexOf(body);assert.ok(start>=0);return issueCapturedPrimitivesFrom(createCapturedPrimitiveIssuer(source,path),start,start+body.length);}
function lower(source,body,path){const handle=issue(source,body,path);return lowerSourceClosure(handle,lexicalClosureName(handle));}
async function compile(fn,directory,label){
  const program=parseMeta(toLino(fn));assert.deepEqual(program,[fn]);
  const name=fn.name.replace(/_([a-z])/gu,(_,letter)=>letter.toUpperCase()),typescript=emitTypeScript(program)+'\nexport { '+name+' as factory };\n',rust=emitRust(program),ts=loadTypeScript(ROOT),path=join(directory,label+'.ts'),runtime=join(directory,label+'.mjs');
  writeFileSync(path,typescript);const compilation=ts.createProgram([path],{strict:true,noEmit:true,skipLibCheck:true,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext});assert.deepEqual(ts.getPreEmitDiagnostics(compilation).map(row=>ts.flattenDiagnosticMessageText(row.messageText,'\n')),[]);
  writeFileSync(runtime,ts.transpileModule(typescript,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText);
  assert.match(rust,/pub struct JsClosureEnvironment0 \{\}/u);assert.doesNotMatch(rust,/'env/u);assert.match(rust,/pub fn call<'a>\(&self/u);assert.match(rust,/Conditional private body draft/u);assert.doesNotMatch(typescript,/\.includes\(/u);
  return {program,typescript,rust,typed:(await import(pathToFileURL(runtime).href)).factory};
}
function unknowns(){let hooks=0;const opaque={get toString(){hooks++;throw Error('coercion');},get [Symbol.toPrimitive](){hooks++;throw Error('primitive');}},revoked=Proxy.revocable({},{});revoked.revoke();return {values:[undefined,null,true,false,0,-0,NaN,Infinity,-Infinity,1,2n**4096n,Symbol('symbol'),()=>{},opaque,revoked.proxy,new String('name'),new Number(0),{},[],['name'],'\ud800','\udfff','😀',''],hooks:()=>hooks};}

test('three unchanged original native bodies retain closed data and explicit conditional intrinsic obligations',{timeout:60000},async()=>{
  const directory=mkdtempSync(join(tmpdir(),'router-captured-primitives-')),unknown=unknowns();
  const fixtures=[
    {file:'config.mjs',body:'client => !canonical.has(client)',keys:['codex','claude','gemini','qwen','grok','opencode','agent','cursor-agent'],negate:true},
    {file:'provider-manifest.mjs',body:'([key])=>fields.has(key)',keys:['name','kind','base_url','default_model','models','supported_clients','api_key','api_key_env','encrypted_api_key','enabled','subscriber_id','acknowledge_intermediary_risk','acknowledge_unsupported_clients','if_absent'],entry:true},
    {file:'client-status.mjs',body:'key=>!modelKeys.includes(key)',keys:['ANTHROPIC_MODEL','ANTHROPIC_DEFAULT_OPUS_MODEL','ANTHROPIC_DEFAULT_SONNET_MODEL','ANTHROPIC_DEFAULT_HAIKU_MODEL','CLAUDE_CODE_SUBAGENT_MODEL'],negate:true},
  ];
  try{for(const fixture of fixtures){
    const path='js/src/'+fixture.file,source=readFileSync(join(ROOT,path),'utf8'),fn=lower(source,fixture.body,path),analysis=analyzeJavaScript(source,{sourcePath:path}),row=analysis.scopedFunctions.items.find(row=>row.start===fn.environment.start);
    assert.equal(row.status,'translated');assert.equal(row.coverageContract,'conditional-private-body-draft');assert.equal(row.owner.status,'unsupported');assert.deepEqual(analysis.scopedFunctions.program.find(row=>row.name===fn.name),fn);assert.deepEqual(fn.captures,[]);assert.equal(fn.conditionalCaptures,true);assert.equal(fn.environment.originalSignatureFullDomainPreserved,false);assert.equal(fn.environment.collectionLookupStabilityProved,false);
    const runtime=await compile(fn,directory,fixture.file),ir=evaluate(runtime.program,fn.name,[]),target=runtime.typed();assert.equal(runtime.typed.length,0);assert.notEqual(target,runtime.typed());assert.notEqual(ir,evaluate(runtime.program,fn.name,[]));
    const data=fn.environment.collections.map(row=>Function('return ('+row.initializerSource+');')()),original=Function(...fn.environment.collections.map(row=>row.name),'return ('+source.slice(row.start,row.end)+');')(...data),observations=[];
    assert.equal(original.length,target.length);assert.equal(fn.params.length,1);
    for(const key of [...fixture.keys,'unknown',...unknown.values]){
      const want=fixture.negate?!fixture.keys.some(value=>value===key):fixture.keys.some(value=>value===key),argument=fixture.entry?[key,unknown.values[13]]:key;
      for(const invoke of [original,target,ir])assert.equal(invoke(argument),want);
      observations.push({category:typeof key,key:typeof key==='string'?key:null,negativeZero:Object.is(key,-0),outsideProjectedEntryKeyContract:!!fixture.entry&&typeof key!=='string',expected:want});
    }
    if(fixture.entry){assert.equal(fn.conditionalInputs,true);assert.equal(fn.params[0].type,'entry-value');assert.equal(fn.environment.conditionalInputs.producer.kind,'genuine-Object.entries');for(const value of unknown.values)for(const invoke of [original,target,ir])assert.equal(invoke(['name',value]),true);let reads=0;const tuple=['name'];Object.defineProperty(tuple,1,{get(){reads++;throw Error('unused value slot');}});for(const invoke of [original,target,ir])assert.equal(invoke(tuple),true);assert.equal(reads,0);for(const invoke of [original,target,ir])assert.throws(()=>invoke(null));}
    vectors.positive.push({path,sourceSha256:hash(source),body:fixture.body,row,fn,meta:toLino(fn),typescript:runtime.typescript,rust:runtime.rust,observations});retain('native-original-bodies',vectors.positive);
  }assert.equal(unknown.hooks(),0);}finally{rmSync(directory,{recursive:true,force:true});}
});

test('finite SameValueZero literals preserve duplicates signed zero and single argument evaluation',{timeout:60000},async()=>{
  const directory=mkdtempSync(join(tmpdir(),'router-captured-primitive-literals-')),unknown=unknowns();
  try{for(const constructor of ['[-0,0,1,true,false,"Ω","name","name"]','new Set([-0,0,1,true,false,"Ω","name","name"])']){
    const set=constructor.startsWith('new'),source='function owner(){const owned='+constructor+';return value=>owned.'+(set?'has':'includes')+'(value);}',body='value=>owned.'+(set?'has':'includes')+'(value)',fn=lower(source,body),runtime=await compile(fn,directory,set?'set':'array'),original=Function(source+';return owner();')(),target=runtime.typed(),ir=evaluate(runtime.program,fn.name,[]),observations=[];
    assert.equal(fn.environment.collections[0].values.length,8);
    for(const value of [...unknown.values,'Ω','name','NaN',false,true,1]){const want=value===0||value===1||value===true||value===false||value==='Ω'||value==='name';for(const invoke of [original,target,ir])assert.equal(invoke(value),want);observations.push({category:typeof value,negativeZero:Object.is(value,-0),want});}
    // A source-local immutable argument binding is evaluated inside the IIFE's
    // argument, avoiding both duplicated reads and a generated TDZ collision.
    const shadow=lower('function owner(){const owned=[1];return observed=>owned.includes(observed);}','observed=>owned.includes(observed)'),shadowRuntime=await compile(shadow,directory,(set?'set':'array')+'-shadow');assert.equal(shadowRuntime.typed()(1),true);
    retain(set?'set-literal-goldens':'array-literal-goldens',{source,fn,...runtime,observations});
  }assert.equal(unknown.hooks(),0);}finally{rmSync(directory,{recursive:true,force:true});}
});

test('writes aliases escapes shadows dynamic initializers and foreign source authority remain refused',()=>{
  const base='function owner(){const owned=["name"];return key=>owned.includes(key);}',body='key=>owned.includes(key)';
  const sources=[
    base.replace('const owned','let owned'),base.replace('["name"]','other'),base.replace('["name"]','[effect()]'),base.replace('["name"]','[NaN]'),base.replace('["name"]','[undefined]'),base.replace('["name"]','[null]'),base.replace('["name"]','[1n]'),base.replace('["name"]','[...other]'),base.replace('["name"]','[,]'),base.replace('["name"]','["\\ud800"]'),base.replace('["name"]','[1e309]'),
    base.replace('return','owned.push("x");return'),base.replace('return','owned[0]="x";return'),base.replace('return','[owned]=other;return'),base.replace('return','({owned}=other);return'),base.replace('return','for(owned of other){}return'),base.replace('return','const alias=owned;return'),base.replace('return','consume(owned);return'),base.replace('return','const leak={owned};return'),base.replace('return','const read=owned.includes;return'),base.replace('return','const nested=()=>owned;return'),base.replace('return','owned.sort();return'),base.replace('return','owned.map((x,index,array)=>array.push(x));return'),base.replace('return','owned.every(callback);return'),
    'export const owned=["name"];function owner(){return '+body+';}', 'const owned=["name"];export {owned};function owner(){return '+body+';}',
    base.replace('const owned=["name"];','const owned=new Set(["name"]);').replace('includes','has').replace('function owner(){','function owner(Set){'),
    base.replace('return','Array.prototype.includes=evil;return'),base.replace('return','Array["proto"+"type"].includes=evil;return'),base.replace('return','Array[property]=evil;return'),base.replace('return','const alias=Array;return'),base.replace('return','Reflect.set(owned,"0","x");return'),base.replace('return','Object.defineProperty(owned,"0",{});return'),base.replace('return','owned[Symbol.iterator]=evil;return'),base.replace('return','owned[property]=evil;return'),base.replace('return','eval("owned.push(1)");return'),base.replace('return','globalThis.Array=evil;return'),
    base.replace('return key=>','return async key=>'),base.replace('return key=>','return (key=effect())=>'),base.replace(body,'key=>{const owned=[1];return owned.includes(key);}'),base.replace('function owner(){','async function owner(){'),
    'function owner(){return '+body+';const owned=["name"];}','function owner(){if(yes){const owned=["name"];}return '+body+';}','import owned from "foreign";function owner(){return '+body+';}','function owner(){const [owned]=[["name"]];return '+body+';}',
    'const owned=new Set(["name"]);function owner(Object,input){return Object.entries(input).filter(([key])=>owned.has(key));}',
    'const owned=new Set(["name"]);function owner(input){return input.filter(([key])=>owned.has(key));}',
    'const owned=new Set(["name"]);function owner(input){return Object.entries(input).filter(([key=effect()])=>owned.has(key));}',
    'const owned=new Set(["name"]);function owner(input){return Object.entries(input).filter(([...key])=>owned.has(key));}',
  ];
  for(const source of sources){const census=analyzeJavaScript(source).scopedFunctions;assert.equal(census.program.filter(fn=>fn.environment?.schema==='original-lexical-primitive-collection-environment-v1').length,0,source);vectors.negative.push({source,census});}retain('complete-source-negatives',vectors.negative);
  const handle=issue(base,body),proof=readCapturedPrimitives(handle).proof,fn=lowerSourceClosure(handle,lexicalClosureName(handle));let hooks=0;
  for(const foreign of [{},Object.freeze({}),copy(handle),new Proxy(handle,{get(){hooks++;},getOwnPropertyDescriptor(){hooks++;}})])assert.throws(()=>readCapturedPrimitives(foreign));assert.equal(hooks,0);
  for(const changed of [value=>value.sourceUtf16+=' ',value=>value.sourceUtf16Sha256='0'.repeat(64),value=>value.start++,value=>value.collections[0].values[0].value='other',value=>value.collections[0].references[0].start++,value=>value.collections[0].initializerSource='["other"]',value=>value.sourceScope[0].end--,value=>value.standardCollectionIntrinsicsRequired=false,value=>value.collectionLookupStabilityProved=true,value=>value.originalSignatureFullDomainPreserved=true,value=>value.parentCreationLowered=true,value=>value.extra=true]){const wrong=copy(proof);changed(wrong);assert.throws(()=>reissueCapturedPrimitives(wrong));}
  const getter={...copy(proof)};Object.defineProperty(getter,'sourceUtf16',{enumerable:true,get(){hooks++;return base;}});assert.throws(()=>reissueCapturedPrimitives(getter));assert.throws(()=>reissueCapturedPrimitives(new Proxy(proof,{get(){hooks++;}})));assert.equal(hooks,0);
  const missing=copy(proof);delete missing.sourceUtf16;const prior=Object.getOwnPropertyDescriptor(Object.prototype,'sourceUtf16');try{Object.defineProperty(Object.prototype,'sourceUtf16',{configurable:true,get(){hooks++;return base;}});assert.throws(()=>reissueCapturedPrimitives(missing));}finally{if(prior)Object.defineProperty(Object.prototype,'sourceUtf16',prior);else delete Object.prototype.sourceUtf16;}assert.equal(hooks,0);
  const cached=ownershipSyntax(base),oldTs=Object.getOwnPropertyDescriptor(cached,'ts'),oldFile=cached.file;try{cached.file={statements:[]};Object.defineProperty(cached,'ts',{configurable:true,get(){hooks++;throw Error('foreign cached compiler');}});assert.deepEqual(readCapturedPrimitives(issue(base,body)).proof,proof);}finally{Object.defineProperty(cached,'ts',oldTs);cached.file=oldFile;}assert.equal(hooks,0);
  for(const mutate of [value=>value.captures=[{name:'owned',type:'value'}],value=>value.conditionalCaptures=false,value=>value.params=[],value=>value.returns='value',value=>value.body[0].value.values[0].value='other',value=>value.environment.collections[0].values[0].value='other']){const wrong=copy(fn);mutate(wrong);assert.throws(()=>check(wrong,new Map()));assert.throws(()=>parseMeta(toLino(wrong)));}
  retain('private-environment-negatives',{source:base,proof,fn,hooks});
});

test('effectful producer and parent hooks remain explicit counterexamples to unconditional execution',()=>{
  let gets=0;const original=Function('const owned=new Set(["name"]);return ([key])=>owned.has(key);')(),setHas=Set.prototype.has;
  try{const input={get name(){gets++;Set.prototype.has=()=>false;return Symbol('payload');}};const entries=Object.entries(input);assert.equal(gets,1);assert.equal(original(entries[0]),false);assert.equal(entries[0][0]==='name',true);}finally{Set.prototype.has=setHas;}
  const includes=Array.prototype.includes;let coercions=0;
  try{const input={[Symbol.toPrimitive](){coercions++;Array.prototype.includes=()=>false;return 'name';}},callback=Function('const owned=["name"];return key=>owned.includes(key);')();String(input);assert.equal(coercions,1);assert.equal(callback('name'),false);}finally{Array.prototype.includes=includes;}
  retain('intrinsic-lookup-counterexamples',{getters:gets,coercions,conditionalOriginalLookupRequired:true,parentEffectsTranslated:false});
});

const oldModules=new Map(),oracleDirectory=new URL('../../fixtures/captured-primitives/',import.meta.url);
async function oldModule(name){
  if(oldModules.has(name))return oldModules.get(name);
  const pins=JSON.parse(readFileSync(new URL('manifest.json',oracleDirectory))),row=pins.members.find(row=>row.sourceFile===name+'.source.txt'),bytes=readFileSync(new URL(row.sourceFile,oracleDirectory));
  assert.equal(pins.sourceCommit,'53c7a52432bf8e0f3131b65d1c0996cdeb86b67b');assert.equal(bytes.length,row.bytes);assert.equal(hash(bytes),row.sha256);assert.equal(createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex'),row.gitBlob);
  const parent=pathToFileURL(join(ROOT,row.originalPath)),dependencies=new Map();
  if(name==='scoped-helpers'||name==='ir')dependencies.set('./lexical-environments.mjs',(await oldModule('lexical-environments')).url);
  if(name==='scoped-helpers')dependencies.set('./ir.mjs',(await oldModule('ir')).url);
  const relocated=bytes.toString().replace(/(from\s+)(['"])(\.[^'"]+)\2/gu,(_,prefix,quote,path)=>prefix+quote+(dependencies.get(path)??new URL(path,parent).href)+quote),url='data:text/javascript;base64,'+Buffer.from(relocated).toString('base64'),result={url,module:await import(url)};
  oldModules.set(name,result);return result;
}
test('every old 136 definition and 301 capture origin survives within the complete unchanged source censuses',{timeout:60000},async()=>{
  const old=(await oldModule('scoped-helpers')).module,totals={modules:0,top:0,scoped:0,topDefinitions:0,oldScoped:0,oldFull:0,oldConditional:0,captureRefusals:0,newFull:0,newConditional:0},changes=[];
  const originalPins=JSON.parse(readFileSync(join(ROOT,'tools/translation/fixtures/sequence-patterns/native-program-baseline.json'))).modules;
  const intended=new Map([['js/src/config.mjs','client => !canonical.has(client)'],['js/src/provider-manifest.mjs','([key])=>fields.has(key)'],['js/src/client-status.mjs','key=>!modelKeys.includes(key)']]);
  for(const path of sourceModules(ROOT).filter(path=>path.startsWith('js/src/')&&path.endsWith('.mjs'))){
    const source=readFileSync(join(ROOT,path),'utf8'),current=analyzeJavaScript(source,{sourcePath:path}),previous=old.discoverScopedHelpers(source,current.items,analyzeJavaScript,path),sourceSha256=hash(source),oldCaptureOrigins=previous.items.filter(row=>row.diagnostic?.message==='a scoped lexical capture');
    const originalPin=originalPins.find(row=>row.path===path);assert.ok(originalPin);assert.equal(Buffer.byteLength(source),originalPin.originalSourceBytes);assert.equal(sourceSha256,originalPin.sourceSha256);assert.deepEqual(current.program,originalPin.topLevelProgram);
    assert.equal(current.scopedFunctions.sourceItems,previous.sourceItems);
    for(const fn of previous.program)assert.deepEqual(current.scopedFunctions.program.find(row=>row.name===fn.name),fn,path+':'+fn.name);
    for(const row of previous.items){const after=current.scopedFunctions.items.find(value=>value.start===row.start);assert.ok(after);if(intended.has(path)&&source.slice(row.start,row.end)===intended.get(path)){assert.equal(row.status,'unsupported');assert.equal(after.status,'translated');assert.equal(after.coverageContract,'conditional-private-body-draft');assert.equal(after.end,row.end);assert.deepEqual(after.sourceScope,row.sourceScope);assert.deepEqual(after.captures,row.captures);changes.push({path,before:row,after});}else assert.deepEqual(after,row,path+':'+row.start);}
    totals.modules++;totals.top+=current.items.length;totals.scoped+=previous.sourceItems;totals.topDefinitions+=current.program.length;totals.oldScoped+=previous.translatedItems;totals.oldFull+=previous.fullDomainTranslatedItems;totals.oldConditional+=previous.conditionalPrivateBodyDraftItems;totals.captureRefusals+=oldCaptureOrigins.length;totals.newFull+=current.scopedFunctions.fullDomainTranslatedItems;totals.newConditional+=current.scopedFunctions.conditionalPrivateBodyDraftItems;
    const vector={path,originalSourceBytes:Buffer.byteLength(source),sourceSha256,topLevelItems:current.items,topLevelProgram:current.program,previous,current:current.scopedFunctions,oldCaptureOrigins};vectors.census.push(vector);retain('complete-module-'+path.split('/').at(-1),vector);
  }
  assert.deepEqual(totals,{modules:52,top:788,scoped:705,topDefinitions:73,oldScoped:63,oldFull:54,oldConditional:9,captureRefusals:301,newFull:54,newConditional:12});assert.equal(changes.length,3);assert.equal(totals.topDefinitions+totals.oldScoped,136);retain('complete-census-and-origin-receipt',{totals,changes});
});
