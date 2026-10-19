import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
import {gzipSync} from 'node:zlib';
import {analyzeJavaScript} from '../translator.mjs';
import {buildNativeTypeScript,loadTypeScript,parseNativeJavaScript,sourceModules} from '../native-typescript.mjs';
import {createLexicalEnvironmentIssuer,issueLexicalEnvironmentFrom,issueLexicalEnvironment,readLexicalEnvironment,reissueLexicalEnvironment} from '../vendor/lexical-environments.mjs';
import {ownershipSyntax} from '../vendor/module-syntax.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../../../..'),sourceRoot=process.env.ROUTER_NATIVE_TS_SOURCE_ROOT??root,fixtures=new URL('../../fixtures/static-native-performance/',import.meta.url),pins=JSON.parse(readFileSync(new URL('manifest.json',fixtures))),hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const oracles=new Map();
function retain(name,value){if(!process.env.ROUTER_STATIC_NATIVE_VECTORS)return;mkdirSync(process.env.ROUTER_STATIC_NATIVE_VECTORS,{recursive:true});writeFileSync(process.env.ROUTER_STATIC_NATIVE_VECTORS+'/'+name+'.json.gz',gzipSync(JSON.stringify(value)));}
async function oracle(name){
 if(oracles.has(name))return oracles.get(name);const row=pins.members.find(row=>row.sourceFile===name+'.source.txt');assert.ok(row);const bytes=readFileSync(new URL(row.sourceFile,fixtures));assert.equal(bytes.length,row.bytes);assert.equal(hash(bytes),row.sha256);assert.equal(createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex'),row.gitBlob);
 // Full pinned implementation, with only its module specifiers relocated.
 const original=bytes.toString(),parent=new URL(row.originalPath,pathToFileURL(root+'/'));
 const dependencies=new Map();
 if(name==='scoped-helpers'||name==='ir')dependencies.set('./lexical-environments.mjs',(await oracle('lexical-environments')).url);
 if(name==='scoped-helpers')dependencies.set('./ir.mjs',(await oracle('ir')).url);
 const source=original.replace(/(from\s+)(['"])(\.[^'"]+)\2/g,(_all,prefix,quote,path)=>prefix+quote+(dependencies.get(path)??new URL(path,parent).href)+quote);
 // A separate complete old IR module reads only its matching old private
 // lexical issuer. No old handle crosses into the current private WeakMap.
 const url='data:text/javascript;base64,'+Buffer.from(source).toString('base64'),module=await import(url);const value={module,url,originalSha256:row.sha256};oracles.set(name,value);return value;
}
function span(source,body){const start=source.indexOf(body);assert.ok(start>=0);return [start,start+body.length];}
function oldAndNew(old,source,body){const [start,end]=span(source,body);let before,after,beforeError,afterError;try{before=old.issueLexicalEnvironment(source,start,end,'fixture.mjs');}catch(error){beforeError=error.message;}try{after=issueLexicalEnvironment(source,start,end,'fixture.mjs');}catch(error){afterError=error.message;}assert.equal(afterError,beforeError);if(before){assert.deepEqual(readLexicalEnvironment(after).proof,old.readLexicalEnvironment(before).proof);assert.equal(readLexicalEnvironment(after).wrapper('callback'),old.readLexicalEnvironment(before).wrapper('callback'));}return {source,body,beforeError,afterError,proof:after?readLexicalEnvironment(after).proof:null};}
test('pinned full immutable native oracles retain original bytes and Git blob identities',async()=>{assert.equal(pins.sourceCommit,'32cbf93df679f03c8e344383d3fc38485a6edddc');for(const row of pins.members)assert.ok(await oracle(row.sourceFile.replace('.source.txt','')));});
test('call-local opaque lexical issuer preserves exact original symbols and ordered mutation refusals',async()=>{
 const old=(await oracle('lexical-environments')).module,vectors=[];
 const original='function outer(captured){return ()=>captured;}';
 const current=analyzeJavaScript(original,{sourcePath:'private-owner.mjs'}),previous=(await oracle('scoped-helpers')).module.discoverScopedHelpers(original,current.items,analyzeJavaScript,'private-owner.mjs');
 assert.equal(current.scopedFunctions.translatedItems,1);assert.equal(previous.translatedItems,1);assert.deepEqual(current.scopedFunctions,previous);
 retain('independent-old-private-closure-positive',{source:original,current,previous});
 for(const [source,body]of [
  ['function outer(a,b){return [()=>a,()=>b]}','()=>a'],['function outer(a,b){return [()=>a,()=>b]}','()=>b'],
  ['function outer(a,b){a=1;return [()=>a,()=>b]}','()=>a'],['function outer(a,b){a=1;return [()=>a,()=>b]}','()=>b'],
  ['function outer(a,b){a=1;Object.prototype.x=1;return [()=>a,()=>b]}','()=>a'],['function outer(a,b){a=1;Object.prototype.x=1;return [()=>a,()=>b]}','()=>b'],
  ['function outer(a){return()=>{const a=2;return a}}','()=>{const a=2;return a}'],
  ['async function outer(a){return()=>a}','()=>a'],['function outer(a=effect()){return()=>a}','()=>a'],
  ['function outer(a){return()=>()=>a}','()=>()=>a'],['function outer(a){eval("a=1");return()=>a}','()=>a'],
  ['function outer(a){for(a of []){}return()=>a}','()=>a'],['function outer(a){[a]=[1];return()=>a}','()=>a'],
  ['function outer(a){return [()=>a,()=>{a=2}]}','()=>a'],['function outer(a,b){b++;return()=>a}','()=>a'],
  ['function outer(a){const Number=()=>1;Number();return()=>a}','()=>a'],
  ['function outer(a){const escape=Math;return()=>a}','()=>a'],['function outer(a){Reflect.get({},"x");return()=>a}','()=>a'],
  ['function outer({a}){return()=>a}','()=>a'],['function outer(...a){return()=>a}','()=>a'],
  ['function outer(a){return()=>this.a}','()=>this.a'],['function outer(a){return()=>arguments[0]}','()=>arguments[0]'],
  ['function outer(a){const local=2;return()=>local}','()=>local'],['function outer(a){return()=>{return a+missing}}','()=>{return a+missing}'],
 ])vectors.push(oldAndNew(old,source,body));retain('ordered-lexical-source-vectors',vectors);
 const source='function outer(a,b){return [()=>a,()=>b]}',issuer=createLexicalEnvironmentIssuer(source,'fixture.mjs');
 for(const body of ['()=>a','()=>b']){const [start,end]=span(source,body),one=issueLexicalEnvironmentFrom(issuer,start,end),two=issueLexicalEnvironmentFrom(issuer,start,end);assert.notStrictEqual(one,two);assert.deepEqual(readLexicalEnvironment(one).proof,readLexicalEnvironment(two).proof);assert.equal(readLexicalEnvironment(one).wrapper('callback'),readLexicalEnvironment(two).wrapper('callback'));assert.deepEqual(readLexicalEnvironment(one).proof,old.readLexicalEnvironment(old.issueLexicalEnvironment(source,start,end,'fixture.mjs')).proof);}
});
test('copied, proxy, changed source and foreign span issuers cannot provide lexical authority',()=>{
 const source='function outer(value){return()=>value}',issuer=createLexicalEnvironmentIssuer(source,'fixture.mjs'),[start,end]=span(source,'()=>value');let hooks=0;
 for(const fake of [{...issuer},structuredClone(issuer),new Proxy(issuer,{get(){hooks++;throw Error('proxy');}})])assert.throws(()=>issueLexicalEnvironmentFrom(fake,start,end),/copied|foreign/);
 assert.equal(hooks,0);assert.throws(()=>issueLexicalEnvironmentFrom(issuer,start+1,end));assert.throws(()=>issueLexicalEnvironmentFrom(issuer,start,end-1));
 const original=issueLexicalEnvironmentFrom(issuer,start,end),proof=readLexicalEnvironment(original).proof;assert.notStrictEqual(reissueLexicalEnvironment(proof),original);
 for(const changed of [{...proof,sourceUtf16:source.replace('value}','missing}')},{...proof,sourceUtf16Sha256:'f'.repeat(64)},{...proof,start:start+1}])assert.throws(()=>reissueLexicalEnvironment(changed));
 const foreign=createLexicalEnvironmentIssuer(source.replace('value}','missing}'),'foreign.mjs');assert.throws(()=>issueLexicalEnvironmentFrom(foreign,start,end));
 const cached=ownershipSyntax(source);cached.file.statements=[];assert.deepEqual(readLexicalEnvironment(issueLexicalEnvironmentFrom(issuer,start,end)).proof,proof);assert.deepEqual(readLexicalEnvironment(issueLexicalEnvironment(source,start,end,'fixture.mjs')).proof,proof);
 const a='function outer(value){const text="'+String.fromCharCode(0xd800)+'";return()=>value}',b=a.replace(String.fromCharCode(0xd800),String.fromCharCode(0xd801)),position=span(a,'()=>value');assert.equal(hash(a),hash(b));
 const pa=readLexicalEnvironment(issueLexicalEnvironment(a,...position,'fixture.mjs')).proof,pb=readLexicalEnvironment(issueLexicalEnvironment(b,...position,'fixture.mjs')).proof;assert.notEqual(pa.sourceUtf16Sha256,pb.sourceUtf16Sha256);assert.throws(()=>reissueLexicalEnvironment({...pa,sourceUtf16:b}));
 retain('private-issuer-negatives',{source,proof,hooks,malformedUtf16:{a,b,pa,pb}});
});
test('every original native module retains complete top/scoped programs and all705 source refusal identities', {timeout:60000},async()=>{
 const old=(await oracle('scoped-helpers')).module,rows=[];let scoped=0,top=0,modules=0,translatedTop=0,translatedScoped=0,full=0,conditional=0,currentTranslatedScoped=0,currentFull=0,currentConditional=0;
 for(const path of sourceModules(sourceRoot).filter(path=>path.startsWith('js/src/'))){const source=readFileSync(resolve(sourceRoot,path),'utf8'),current=analyzeJavaScript(source,{sourcePath:path}),previous=old.discoverScopedHelpers(source,current.items,analyzeJavaScript,path);
  const gains=new Map([['js/src/client-status.mjs',2581],['js/src/config.mjs',15324],['js/src/github-proxy.mjs',2346],['js/src/provider-manifest.mjs',737],['js/src/tokens.mjs',4090]]);
  assert.equal(current.scopedFunctions.sourceItems,previous.sourceItems);
  for(const fn of previous.program)assert.deepEqual(current.scopedFunctions.program.find(row=>row.name===fn.name),fn,path+':'+fn.name);
  for(const before of previous.items){const after=current.scopedFunctions.items.find(row=>row.start===before.start);if(before.start===gains.get(path)){assert.equal(before.status,'unsupported');assert.equal(after.status,'translated');assert.equal(after.end,before.end);assert.deepEqual(after.sourceScope,before.sourceScope);assert.deepEqual(after.captures,before.captures);}else assert.deepEqual(after,before,path+':'+before.start);}
  assert.equal(current.scopedFunctions.program.length,previous.program.length+(gains.has(path)?1:0));
  // The existing portable producer takes every native .mjs module; the
  // complete TypeScript source set additionally includes four asset .js files.
  // Compare all 56 here, while keeping the published 52-module denominator.
  const portableCensus=path.endsWith('.mjs');if(portableCensus){modules++;scoped+=previous.sourceItems;top+=current.items.length;translatedTop+=current.program.length;translatedScoped+=previous.program.length;full+=previous.fullDomainTranslatedItems;conditional+=previous.conditionalPrivateBodyDraftItems;currentTranslatedScoped+=current.scopedFunctions.translatedItems;currentFull+=current.scopedFunctions.fullDomainTranslatedItems;currentConditional+=current.scopedFunctions.conditionalPrivateBodyDraftItems;}
  rows.push({path,sourceSha256:hash(source),portableCensus,topLevel:current.items,topLevelProgram:current.program,previous,current:current.scopedFunctions});
 }
 retain('complete-native-56-source-vectors',{rows,portableCensus:{modules,top,scoped,translatedTop,translatedScoped,full,conditional},currentPortableCensus:{translatedScoped:currentTranslatedScoped,full:currentFull,conditional:currentConditional}});
 assert.equal(rows.length,56);assert.equal(modules,52);assert.equal(rows.filter(row=>!row.portableCensus).length,4);assert.equal(top,788);assert.equal(scoped,705);assert.equal(translatedTop,73);assert.equal(translatedScoped,61);assert.equal(full,52);assert.equal(conditional,9);assert.equal(currentTranslatedScoped,66);assert.equal(currentFull,54);assert.equal(currentConditional,12);
});
test('all59 original native TypeScript source trees and full output artifacts match the previous independent producer',{timeout:60000},async()=>{
 const old=(await oracle('native-typescript')).module,ts=loadTypeScript(sourceRoot),rows=[],paths=sourceModules(sourceRoot);assert.equal(paths.length,59);
 for(const path of paths){const source=readFileSync(resolve(sourceRoot,path),'utf8'),previous=old.parseNativeJavaScript(ts,path,source),current=parseNativeJavaScript(ts,path,source);assert.deepEqual(current,previous,path);rows.push({path,sourceSha256:hash(source),metaSha256:hash(JSON.stringify(current)),nodes:current.nodes});}
 const previous=old.buildNativeTypeScript(sourceRoot),current=buildNativeTypeScript(sourceRoot);assert.deepEqual([...current],[...previous]);retain('complete-59-native-typescript-vectors',{rows,previous:[...previous],current:[...current]});
});
test('leaf source positions retain raw strings comments Unicode trivia and original ASI semantics',async()=>{
 const old=(await oracle('native-typescript')).module,ts=loadTypeScript(sourceRoot),vectors=[];
 for(const source of ['/*before*/const x="Ω\\ud800";','function f(){return\r\n/*between*/1}','const f=()=>({value:1});','function f(){return\u2028value}','const value=`a${1}b`;','const f=(a)=>a?.["x"];']){const previous=old.parseNativeJavaScript(ts,'fixture.mjs',source),current=parseNativeJavaScript(ts,'fixture.mjs',source);assert.deepEqual(current,previous);vectors.push({source,previous,current});}retain('leaf-trivia-goldens',vectors);
});
