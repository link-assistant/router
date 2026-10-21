import nativeTest from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {join,dirname,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {createHash,Hash} from 'node:crypto';
import {ownershipCompiler} from '../js-to-rust/vendor/module-syntax.mjs';
import {prepareRustLexicalData} from '../prepare-rust-lexical-data.mjs';
import {createRustLexicalDataFactory,withRustLexicalDataScope} from '../rust-lexical-data-scope.mjs';
import {translateProjectOwnedDefinitions} from '../project.mjs';
import {translateProjectOwnedDefinitionsLexicalData} from '../project-rust-lexical-data.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {repositoryRustLayout} from '../repository-layout.mjs';
import {writeJsonTextGzip} from '../../evidence/write-json-gzip.mjs';
const ROOT=fileURLToPath(new URL('../../../',import.meta.url)),STRUCTURE='tools/translation/rust-structure.mjs';
const field=Object.getOwnPropertyDescriptor,define=Object.defineProperty,apply=Reflect.apply,nativeJSON=JSON.stringify,hash=value=>createHash('sha256').update(value).digest('hex');
let vectors=[],serial=0;const retain=(kind,value)=>{vectors.push({kind,value});return value;};
function test(name,options,run){assert.equal(options.timeout,60000);return nativeTest(name,{timeout:60000},async()=>{vectors=[];try{return await run();}finally{const out=process.env.ROUTER_RUST_LEXICAL_DATA_VECTOR_DIR;if(out){mkdirSync(out,{recursive:true});writeJsonTextGzip(join(out,Buffer.from(name).toString('hex')+'.json.gz'),nativeJSON({schema:'rust-lexical-DATA-receiving-v1',name,vectors}));}}});}
function result(run){try{return {ok:true,value:run()};}catch(error){return {ok:false,name:error?.name,message:error?.message};}}
function moved(path,source,overrides={}){
 const ts=ownershipCompiler(),file=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS),edits=[];assert.equal(file.parseDiagnostics.length,0);
 for(const node of file.statements)if((ts.isImportDeclaration(node)||ts.isExportDeclaration(node))&&node.moduleSpecifier&&ts.isStringLiteral(node.moduleSpecifier)&&/^\.{1,2}\//u.test(node.moduleSpecifier.text)){const spec=node.moduleSpecifier;edits.push({start:spec.getStart(file),end:spec.end,after:nativeJSON(overrides[spec.text]??new URL(spec.text,new URL(path,new URL('../../../',import.meta.url))).href)});}
 let after=source;for(const row of edits.sort((a,b)=>b.start-a.start))after=after.slice(0,row.start)+row.after+after.slice(row.end);return after;
}
async function copies(plan){
 const ts=ownershipCompiler(),row=plan.files.find(value=>value.path===STRUCTURE),copies={},vendorPath='tools/translation/vendor/formal-ai/lexer.mjs',vendor=plan.files.find(value=>value.path===vendorPath),vendorURL='data:text/javascript;base64,'+Buffer.from(moved(vendorPath,vendor.after)+'\n// owner '+(++serial)).toString('base64');copies.lexer=await import(vendorURL);
 for(const side of ['before','after']){
  const source=row[side],file=ts.createSourceFile(STRUCTURE,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS),fn=file.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text===(side==='before'?'rustTokens':'__originalRustTokens'));assert.ok(fn);
  const at=fn.body.getStart(file)+1,instrumented=source.slice(0,at)+'__probe.calls++;'+source.slice(at)+'\nexport const __probe={calls:0};\n';
  copies[side]=await import('data:text/javascript;base64,'+Buffer.from(moved(STRUCTURE,instrumented,{'./vendor/formal-ai/lexer.mjs':vendorURL})+'\n// fixture '+(++serial)).toString('base64'));
 }
 return copies;
}
function shape(tokens){assert.equal(Object.getPrototypeOf(tokens),Array.prototype);assert.equal(Object.getOwnPropertyDescriptor(tokens,'length').writable,true);assert.deepEqual(Reflect.ownKeys(tokens),[...tokens.keys()].map(String).concat('length'));for(const token of tokens){assert.equal(Object.getPrototypeOf(token),Object.prototype);assert.deepEqual(Reflect.ownKeys(token),['type','text','start','end']);for(const key of Reflect.ownKeys(token)){const descriptor=field(token,key);assert.equal(descriptor.enumerable,true);assert.equal(descriptor.writable,true);assert.equal(descriptor.configurable,true);assert.ok(Object.hasOwn(descriptor,'value'));}}}
function token(source){return [{type:'ident',text:source,start:0,end:source.length}];}
const LITERALS=String.raw`#![allow(dead_code)]
/* outer /* nested */ tail */
pub struct Café<'a>{ pub name:&'a str }
pub fn raw(){let a=r###"hello # \" 😀"###;let b=br#"bytes"#;let c=cr"nul";let d='\u{1f600}';let e='\x7f';let f='\'';let z=12.3e+4_u32;}
// final CRLF follows
`+'\r\n';
test('complete lexer proposal preserves actual native bindings both ordered phases and full source inverses',{timeout:60000},()=>{
 const plan=retain('complete-source-proposal',prepareRustLexicalData());assert.equal(plan.files.length,4);assert.equal(plan.inputs.length,9);assert.equal(plan.installationReady,false);assert.equal(plan.sealedOriginalBootstrap.sealedOriginals.length,2);assert.equal(plan.optInOnly,true);assert.equal(plan.originalSourceItemsUnchanged,true);assert.equal(plan.sameOriginalProjectIssuers,true);assert.equal(plan.runtimeAuthority,false);assert.equal(plan.acrossInvocationCache,false);
 for(const row of plan.files){assert.equal(hash(row.before),row.beforeSha256);assert.equal(hash(row.after),row.afterSha256);assert.equal(row.inverse,row.before);assert.equal(row.selection.nativeInverse.source,row.before);assert.deepEqual(row.nativeBindings.unboundIdentifiers,[]);assert.equal(row.nativeCopies.length,2);assert.ok(row.nativeCopies.every(copy=>copy.completeNativeAstCopy));assert.equal(transportConcreteSyntaxMeta(row.beforeMeta).source,row.before);assert.equal(transportConcreteSyntaxMeta(row.afterMeta).source,row.after);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);for(const stage of row.stages){assert.equal(stage.completeInverse,true);assert.equal(transportConcreteSyntaxMeta(stage.beforeMeta).source,stage.before);assert.equal(transportConcreteSyntaxMeta(stage.afterMeta).source,stage.after);assert.deepEqual(stage.trace.map(row=>row.phase),['language','repository']);assert.equal(stage.trace.find(row=>row.phase===stage.phase).rules.length,1);assert.equal(stage.trace.find(row=>row.phase!==stage.phase).rules.length,0);}}
 const original=plan.files[0];assert.ok(original.selection.completePrivateFallback.includes(original.selection.completeOriginalFunction.slice(original.selection.completeOriginalFunction.indexOf('{'))));
});
test('actual full Rust lexer fixtures retain exact UTF16 DATA and fresh mutable arrays rows and fields',{timeout:60000},async()=>{
 const pair=await copies(prepareRustLexicalData());
 for(const source of [LITERALS,'','pub fn é猫😀()->u8{1}\n','pub fn lone\ud800()->u8{0}\n',"pub fn borrow<'a>(v:&'a str)->&'a str{v}\n"]){
  const expected=pair.before.rustTokens(source);shape(expected);pair.after.__probe.calls=0;
  withRustLexicalDataScope(()=>{const first=pair.after.rustTokens(source),second=pair.after.rustTokens(source);assert.deepEqual(first,expected);assert.deepEqual(second,expected);shape(first);shape(second);assert.notStrictEqual(first,second);for(let at=0;at<first.length;at++)assert.notStrictEqual(first[at],second[at]);if(first.length){first[0].text='MUTATED';first[0].type='foreign';delete first[0].end;}first.push({type:'extra'});assert.deepEqual(pair.after.rustTokens(source),expected);assert.equal(pair.after.__probe.calls,1);});
  assert.deepEqual(pair.after.rustTokens(source),expected);assert.equal(pair.after.__probe.calls,2);retain('full-Rust-fixture-original-DATA',{source,expected});
 }
 for(const source of ['/* open','r###"open','"open',"'\\"]){pair.after.__probe.calls=0;withRustLexicalDataScope(()=>{for(let at=0;at<2;at++)assert.deepEqual(result(()=>pair.after.rustTokens(source)),result(()=>pair.before.rustTokens(source)));});assert.equal(pair.after.__probe.calls,2);}
});
test('complete physical application Rust sources keep original token DATA including saturated scope fallback',{timeout:60000},async()=>{
 const pair=await copies(prepareRustLexicalData()),layout=repositoryRustLayout(ROOT),directory=join(ROOT,layout.productionPrefix),paths=[];
 function walk(path){for(const item of readdirSync(path,{withFileTypes:true})){const next=join(path,item.name);if(item.isDirectory())walk(next);else if(item.isFile()&&item.name.endsWith('.rs'))paths.push(next);}}
 walk(directory);paths.sort();assert.ok(paths.length>0);let tokens=0;
 withRustLexicalDataScope(()=>{for(const path of paths){const source=readFileSync(path,'utf8'),expected=pair.before.rustTokens(source),first=pair.after.rustTokens(source),second=pair.after.rustTokens(source);assert.deepEqual(first,expected,path);assert.deepEqual(second,expected,path);assert.notStrictEqual(first,second);tokens+=expected.length;retain('complete-application-source-and-original-lexical-DATA',{path:path.slice(ROOT.length+1),source,tokens:expected});}});
 assert.ok(tokens>0);retain('full-application-lexical-census',{files:paths.length,tokens});
});
test('factory identity exact UTF16 keys bounded admission and malformed DATA never affect genuine lexer',{timeout:60000},async()=>{
 const pair=await copies(prepareRustLexicalData());let calls=0;const fallback=source=>{calls++;return token(source);},a=createRustLexicalDataFactory(fallback),b=createRustLexicalDataFactory(fallback),evil=createRustLexicalDataFactory(source=>[{type:'foreign',text:source,start:0,end:source.length}]);
 const sources=['x','x\0','x\n','x\\n','é','😀','\ud800','\udc00'];withRustLexicalDataScope(()=>{for(const source of sources){assert.deepEqual(a(source),token(source));assert.deepEqual(a(source),token(source));assert.deepEqual(b(source),token(source));assert.equal(evil(source)[0].type,'foreign');}assert.equal(calls,sources.length*2);assert.deepEqual(pair.after.rustTokens('x'),pair.before.rustTokens('x'));});
 let touched=0;const getter={type:'ident',text:'x',start:0};define(getter,'end',{get(){touched++;return 1;},enumerable:true,configurable:true});const proxied=new Proxy(token('x'),{ownKeys(){touched++;throw Error('proxy reached');}}),duplicate=token('x')[0],hole=Array(1),exotic=Object.setPrototypeOf(token('x'),null),lazy=token('x');Error.captureStackTrace(lazy);const bad=[proxied,[getter],[duplicate,duplicate],hole,exotic,lazy,Object.assign(token('x'),{extra:true}),[{type:'ident',text:'',start:NaN,end:NaN}]];
 for(const value of bad){let count=0;const read=createRustLexicalDataFactory(()=>{count++;return value;});withRustLexicalDataScope(()=>{assert.strictEqual(read('x'),value);assert.strictEqual(read('x'),value);});assert.equal(count,2);}assert.equal(touched,0);
 let largeCalls=0;const large=createRustLexicalDataFactory(source=>{largeCalls++;return token(source);}),huge='x'.repeat(8388608);withRustLexicalDataScope(()=>{assert.equal(large(huge)[0].text,huge);assert.equal(large(huge)[0].text,huge);});assert.equal(largeCalls,2);
 let admissions=0;const bounded=createRustLexicalDataFactory(source=>{admissions++;return token(source);});withRustLexicalDataScope(()=>{for(let at=0;at<4097;at++)bounded('k'+at);bounded('k0');});assert.equal(admissions,4098);
 let proxyCalls=0;const callable=new Proxy(source=>token(source),{apply(target,receiver,args){proxyCalls++;return apply(target,receiver,args);}}),proxiedFactory=createRustLexicalDataFactory(callable);withRustLexicalDataScope(()=>{proxiedFactory('x');proxiedFactory('x');});assert.equal(proxyCalls,2);
 let tokenCalls=0;const many=createRustLexicalDataFactory(()=>{tokenCalls++;return Array(200001);});withRustLexicalDataScope(()=>{many('x');many('x');});assert.equal(tokenCalls,2);
 const object={get length(){touched++;return 0;}};withRustLexicalDataScope(()=>{assert.deepEqual(pair.after.rustTokens(object),pair.before.rustTokens(object));assert.deepEqual(pair.after.rustTokens(object),pair.before.rustTokens(object));});assert.ok(touched>0);retain('factory-identity-and-refusal-DATA',{sources,calls,malformed:bad.length,largeCalls,admissions});
});
test('observed hooks including restoration disable every active frame and preserve original lexical callbacks',{timeout:60000},async()=>{
 const pair=await copies(prepareRustLexicalData()),source='pub fn chosen(v:u8)->u8{v+1}\n';
 for(const [owner,key]of [[Array.prototype,'map'],[Array.prototype,'push'],[RegExp.prototype,'test'],[String.prototype,'startsWith']]){
  const pin=field(owner,key),trial=api=>{let calls=0;api.__probe.calls=0;let output;
   withRustLexicalDataScope(()=>{api.rustTokens(source);try{define(owner,key,{...pin,value:function(...args){calls++;define(owner,key,pin);return apply(pin.value,this,args);}});output=api.rustTokens(source);}finally{define(owner,key,pin);}assert.deepEqual(api.rustTokens(source),output);});return {calls,output,fallbackCalls:api.__probe.calls};};
  const before=trial(pair.before),after=trial(pair.after);assert.deepEqual(after,before);assert.ok(after.calls>0);assert.equal(after.fallbackCalls,3);retain('full-original-hook-tapes',{key,before,after});
 }
 const mapPin=field(Array.prototype,'map'),getterTrial=api=>{let getters=0;api.__probe.calls=0;let output;withRustLexicalDataScope(()=>{api.rustTokens(source);try{define(Array.prototype,'map',{get(){getters++;define(Array.prototype,'map',mapPin);return mapPin.value;},enumerable:mapPin.enumerable,configurable:true});output=api.rustTokens(source);}finally{define(Array.prototype,'map',mapPin);}assert.deepEqual(api.rustTokens(source),output);});return {getters,output,fallbackCalls:api.__probe.calls};};const getterBefore=getterTrial(pair.before),getterAfter=getterTrial(pair.after);assert.deepEqual(getterAfter,getterBefore);assert.equal(getterAfter.getters,1);assert.equal(getterAfter.fallbackCalls,3);
 let calls=0;const read=createRustLexicalDataFactory(source=>{calls++;return token(source);}),pin=field(Array.prototype,'map');withRustLexicalDataScope(()=>{read('x');withRustLexicalDataScope(()=>{try{define(Array.prototype,'map',{...pin,value:function(...args){return apply(pin.value,this,args);}});read('x');}finally{define(Array.prototype,'map',pin);}});read('x');read('x');});assert.equal(calls,4);
});
test('nested scopes exceptions and asynchronous or proxy results clean up without touching then getters',{timeout:60000},()=>{
 let calls=0,touched=0;const read=createRustLexicalDataFactory(source=>{calls++;return token(source);});
 withRustLexicalDataScope(()=>{read('x');read('x');withRustLexicalDataScope(()=>{read('x');read('x');});assert.equal(calls,2);read('x');assert.equal(calls,2);assert.throws(()=>withRustLexicalDataScope(()=>{read('z');throw Error('stop');}),/stop/u);read('x');assert.equal(calls,3);
  const thenable={get then(){touched++;throw Error('then reached');}},inherited=Object.create(thenable),proxied=new Proxy({},{get(){touched++;throw Error('proxy get');},getOwnPropertyDescriptor(){touched++;throw Error('proxy descriptor');},getPrototypeOf(){touched++;throw Error('proxy parent');}});
  for(const value of [thenable,inherited,proxied,Promise.resolve(1)])assert.throws(()=>withRustLexicalDataScope(()=>value),/cannot return/u);
  assert.throws(()=>withRustLexicalDataScope(async()=>{touched++;}),/synchronous ordinary/u);const callback=new Proxy(()=>{touched++;},{apply(){touched++;}});assert.throws(()=>withRustLexicalDataScope(callback),/synchronous ordinary/u);read('x');assert.equal(calls,3);
 });assert.equal(touched,0);read('x');assert.equal(calls,4);withRustLexicalDataScope(()=>read('x'));assert.equal(calls,5);retain('nested-cleanup-counters',{calls,touched});
});
function observer(run){const update=field(Hash.prototype,'update'),digest=field(Hash.prototype,'digest'),json=field(JSON,'stringify'),events=[];let outcome;try{define(Hash.prototype,'update',{...update,value:function(...args){const value=apply(update.value,this,args);events.push({op:'Hash.update',args:args.map(value=>typeof value==='string'?value:{base64:Buffer.from(value).toString('base64')})});return value;}});define(Hash.prototype,'digest',{...digest,value:function(...args){const value=apply(digest.value,this,args);events.push({op:'Hash.digest',args,value:typeof value==='string'?value:{base64:Buffer.from(value).toString('base64')}});return value;}});define(JSON,'stringify',{...json,value:function(...args){const value=apply(json.value,this,args);events.push({op:'JSON.stringify',args:apply(json.value,JSON,args),value});return value;}});outcome=result(run);}finally{define(Hash.prototype,'update',update);define(Hash.prototype,'digest',digest);define(JSON,'stringify',json);}return {outcome,events};}
test('opt-in project facade retains original semantic refusals same issuers and every Hash JSON source and progress callback',{timeout:60000},()=>{
 for(const source of ['pub fn keep(value:u8)->u8{value}','use missing::*;pub fn keep(value:u8)->u8{value}','#[cfg(unknown_feature)]pub struct Maybe;pub fn keep(value:u8)->u8{value}']){
  const trial=api=>{const calls=[],options={entry:'src/lib.rs',paths:['src/lib.rs'],readSource:path=>{calls.push({read:path});return source;},progress:event=>calls.push({progress:event})};const value=api(options);return {value,calls};};
  const before=trial(translateProjectOwnedDefinitions),after=trial(translateProjectOwnedDefinitionsLexicalData);assert.deepEqual(after,before);assert.equal(after.value.meta.runtimeParity,false);
  const observedBefore=observer(()=>trial(translateProjectOwnedDefinitions)),observedAfter=observer(()=>trial(translateProjectOwnedDefinitionsLexicalData));assert.deepEqual(observedAfter,observedBefore);assert.equal(observedAfter.outcome.ok,true);assert.ok(observedAfter.events.some(row=>row.op==='Hash.update'));assert.ok(observedAfter.events.some(row=>row.op==='JSON.stringify'));retain('full-original-project-outcomes-and-observers',{source,before,after,observedBefore,observedAfter});
 }
});
test('complete selected sources and archive require fresh final native CST and Hash joins',{timeout:60000},()=>{
 const plan=prepareRustLexicalData(),root=mkdtempSync(join(tmpdir(),'rust-lexical-DATA-source-'));for(const input of plan.inputs){mkdirSync(dirname(join(root,input.path)),{recursive:true});writeFileSync(join(root,input.path),input.source);}
 try{for(const input of plan.inputs){writeFileSync(join(root,input.path),input.source+'\n// changed\n');assert.throws(()=>prepareRustLexicalData({root}),/complete original\/current source differs/u);writeFileSync(join(root,input.path),input.source);}
  const pin=field(Hash.prototype,'update'),target=plan.files.find(row=>row.path===STRUCTURE);let changed=false;try{define(Hash.prototype,'update',{...pin,value:function(...args){const value=apply(pin.value,this,args);if(args[0]===target.after&&!changed){changed=true;writeFileSync(join(root,STRUCTURE),target.before+'\n// during source hash\n');}return value;}});assert.throws(()=>prepareRustLexicalData({root}),/changed at final source join/u);assert.equal(changed,true);}finally{define(Hash.prototype,'update',pin);}
 }finally{rmSync(root,{recursive:true,force:true});}
});

test('genuine escaped vendor punctuation state is checked freshly before reuse without invoking its getters',{timeout:60000},async()=>{
 const pair=await copies(prepareRustLexicalData()),pin=field(Array.prototype,'find');let owner;
 try{define(Array.prototype,'find',{...pin,value:function(...args){if(!owner&&this[0]==='>>>=')owner=this;return apply(pin.value,this,args);}});pair.before.rustTokens('a>>>=b;');}finally{define(Array.prototype,'find',pin);}
 assert.ok(owner);const original=field(owner,'0'),source='a>>>=b;\n',expected=pair.before.rustTokens(source);assert.equal(pair.lexer.rustLexicalOwnerStateUnchanged(),true);pair.after.__probe.calls=0;let changed;
 withRustLexicalDataScope(()=>{assert.deepEqual(pair.after.rustTokens(source),expected);assert.deepEqual(pair.after.rustTokens(source),expected);assert.equal(pair.after.__probe.calls,1);try{owner[0]='@';assert.equal(pair.lexer.rustLexicalOwnerStateUnchanged(),false);changed=pair.before.rustTokens(source);assert.notDeepEqual(changed,expected);assert.deepEqual(pair.after.rustTokens(source),changed);assert.equal(pair.after.__probe.calls,2);}finally{define(owner,'0',{__proto__:null,...original});}assert.equal(pair.lexer.rustLexicalOwnerStateUnchanged(),true);assert.deepEqual(pair.after.rustTokens(source),expected);assert.equal(pair.after.__probe.calls,3);});
 const trial=api=>{let gets=0;api.__probe.calls=0;let output;withRustLexicalDataScope(()=>{api.rustTokens(source);try{define(owner,'0',{__proto__:null,get(){gets++;return original.value;},enumerable:true,configurable:true});assert.equal(pair.lexer.rustLexicalOwnerStateUnchanged(),false);assert.equal(gets,0);output=api.rustTokens(source);}finally{define(owner,'0',{__proto__:null,...original});}api.rustTokens(source);});return {output,gets,calls:api.__probe.calls};};const before=trial(pair.before),after=trial(pair.after);assert.deepEqual(after,before);assert.ok(after.gets>0);assert.equal(after.calls,3);retain('complete-real-owner-mutation-and-restoration',{source,expected,changed,before,after});
});

test('genuine lexical hits replay exact final LF RegExp statics while empty and nonLF calls preserve original behavior',{timeout:60000},async()=>{
 const pair=await copies(prepareRustLexicalData()),names=['input','$_','lastMatch','$&','lastParen','$+','leftContext','$`','rightContext',"$'",'$1','$2','$3','$4','$5','$6','$7','$8','$9'],statics=()=>names.map(name=>({name,present:Object.hasOwn(RegExp,name),value:RegExp[name]}));
 for(const source of ['pub fn keep()->u8{1}\n','', '"literal"', 'abc']){
  const trial=api=>{api.__probe.calls=0;const rows=[];withRustLexicalDataScope(()=>{for(let at=0;at<2;at++){/before(.)(.)/u.exec('beforeΩ😀');const tokens=api.rustTokens(source),state=statics();rows.push({tokens,state});}});return {rows,calls:api.__probe.calls};};
  const before=trial(pair.before),after=trial(pair.after);assert.deepEqual(after.rows,before.rows);assert.equal(after.calls,source===''||source.endsWith('\n')?1:2);assert.equal(before.calls,2);retain('complete-legacy-regex-state-and-DATA',{source,before,after});
 }
});
