import nativeTest from 'node:test';
import assert from 'node:assert/strict';
import {Hash,createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {ownershipCompiler} from '../vendor/module-syntax.mjs';
import {createConstructorSourceGraph} from '../vendor/source-constructors.mjs';
import {issueOriginalConstructorBody,lowerOriginalConstructorBody} from '../vendor/constructor-bodies.mjs';
import {toLino} from '../vendor/ir.mjs';
import {prepareParsedLinoData} from '../../prepare-parsed-lino-data.mjs';
import {transportConcreteSyntaxMeta} from '../../concrete-syntax-meta.mjs';
import {writeJsonTextGzip} from '../../../evidence/write-json-gzip.mjs';
const ROOT=fileURLToPath(new URL('../../../../',import.meta.url)),TRANSLATOR='tools/translation/js-to-rust/translator.mjs',IR='tools/translation/js-to-rust/vendor/ir.mjs',LINO='tools/translation/js-to-rust/vendor/lino.mjs';
const descriptor=Object.getOwnPropertyDescriptor,define=Object.defineProperty,apply=Reflect.apply,nativeJSON=JSON.stringify;
const hash=value=>createHash('sha256').update(value).digest('hex');let serial=0;
let vectors=[];const retain=(kind,value)=>{vectors.push({kind,value});return value;};
function test(name,options,run){assert.equal(options.timeout,60000);return nativeTest(name,{timeout:60000},async t=>{vectors=[];try{return await run(t);}finally{const output=process.env.ROUTER_PARSED_LINO_DATA_VECTOR_DIR;if(output){mkdirSync(output,{recursive:true});writeJsonTextGzip(join(output,Buffer.from(name).toString('hex')+'.json.gz'),nativeJSON({schema:'parsed-Lino-DATA-complete-receiving-vectors-v1',name,vectors}));}}});}
function relocated(path,source,overrides={}){
 const ts=ownershipCompiler(),file=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS),edits=[];assert.equal(file.parseDiagnostics.length,0);
 for(const node of file.statements)if((ts.isImportDeclaration(node)||ts.isExportDeclaration(node))&&node.moduleSpecifier&&ts.isStringLiteral(node.moduleSpecifier)&&/^\.{1,2}\//u.test(node.moduleSpecifier.text)){const spec=node.moduleSpecifier;edits.push({start:spec.getStart(file),end:spec.end,after:JSON.stringify(overrides[spec.text]??new URL(spec.text,new URL(path,new URL('../../../../',import.meta.url))).href)});}
 let after=source;for(const row of edits.sort((a,b)=>b.start-a.start))after=after.slice(0,row.start)+row.after+after.slice(row.end);assert.equal(ts.createSourceFile(path,after,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS).parseDiagnostics.length,0);return after;
}
async function copies(plan){
 const ts=ownershipCompiler(),result={};
 for(const label of ['before','after']){
  const original=plan.inputs.find(row=>row.path===LINO).source,file=ts.createSourceFile(LINO,original,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS),fn=file.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='parseLinks');assert.ok(fn);
  const at=fn.body.getStart(file)+1,instrumented=original.slice(0,at)+'__linoParseProbe.calls[__linoParseProbe.calls.length]=text;'+original.slice(at),linoSource='const __linoParseProbe={calls:[]};\n'+instrumented+'\nexport {__linoParseProbe};',url=source=>'data:text/javascript;base64,'+Buffer.from(source+'\n// fixture '+(++serial)).toString('base64'),linoURL=url(linoSource),lino=await import(linoURL);
  // An import namespace has no public mutable source/issuer setter. Reuse the
  // exact URL only as the fixed native module specifier of this fixture copy.
  const irText=relocated(IR,plan.files.find(row=>row.path===IR)[label],{'./lino.mjs':linoURL}),selectedIRURL=url(irText),selectedIR=await import(selectedIRURL),translatorURL=url(relocated(TRANSLATOR,plan.files.find(row=>row.path===TRANSLATOR)[label],{'./vendor/ir.mjs':selectedIRURL,'./vendor/lino.mjs':linoURL}));
  result[label]={api:await import(translatorURL),ir:selectedIR,lino,reset(){lino.__linoParseProbe.calls.length=0;},calls:lino.__linoParseProbe.calls};
 }
 return result;
}
function outcome(run){try{return {ok:true,value:run()};}catch(error){return {ok:false,name:error?.name,message:error?.message};}}
function tape(run,observeJson=true){
 const update=descriptor(Hash.prototype,'update'),digest=descriptor(Hash.prototype,'digest'),parse=descriptor(JSON,'parse'),stringify=descriptor(JSON,'stringify'),events=[];
 const jsonCall=(name,field)=>function(...args){const value=apply(field.value,this,args);events.push({operation:'JSON.'+name,args:nativeJSON(args),value:nativeJSON(value)});return value;};
 let result;try{
  define(Hash.prototype,'update',{...update,value:function(...args){const value=apply(update.value,this,args);events.push({operation:'Hash.update',args:args.map(value=>typeof value==='string'?{string:value}:{bytes:Buffer.from(value).toString('base64')}),sameReceiver:value===this});return value;}});
  define(Hash.prototype,'digest',{...digest,value:function(...args){const value=apply(digest.value,this,args);events.push({operation:'Hash.digest',args,value:typeof value==='string'?value:Buffer.from(value).toString('base64')});return value;}});
  if(observeJson){define(JSON,'parse',{...parse,value:jsonCall('parse',parse)});define(JSON,'stringify',{...stringify,value:jsonCall('stringify',stringify)});}result=outcome(run);
 }finally{define(Hash.prototype,'update',update);define(Hash.prototype,'digest',digest);define(JSON,'parse',parse);define(JSON,'stringify',stringify);}
 return {result,events};
}
function constructor(){const errors="export class Mistake extends Error {constructor(message,status=400){super(message);this.status=status;this.code='bounded';}}",owner="import {Mistake as Failure} from './errors.mjs';export function selected(value){if(value===null)throw new Failure('bad');return value;}",graph=createConstructorSourceGraph([{path:'fixture/errors.mjs',source:errors},{path:'fixture/owner.mjs',source:owner}]),item=lowerOriginalConstructorBody(issueOriginalConstructorBody(graph,'fixture/owner.mjs',owner.indexOf('export function'),owner.length));return {graph,meta:toLino(item)+'\n'};}
test('complete native source proposal keeps original decoder both phases and full independent inverses',{timeout:60000},()=>{
 const plan=retain('complete-native-CST-source-proposal',prepareParsedLinoData());assert.equal(plan.files.length,2);assert.equal(plan.inputs.length,4);assert.equal(plan.typescriptVersion,'5.9.3');assert.equal(plan.oldPublicFromLinoUnchanged,true);assert.equal(plan.newAcrossInvocationCache,false);assert.equal(plan.runtimeAuthority,false);
 for(const row of plan.files){assert.equal(hash(row.before),row.beforeSha256);assert.equal(hash(row.after),row.afterSha256);assert.equal(row.inverse,row.before);assert.equal(row.selection.nativeInverse.source,row.before);assert.deepEqual(row.nativeBindings.unboundIdentifiers,[]);assert.equal(row.nativeCopies.length,2);assert.ok(row.nativeCopies.every(copy=>copy.completeNativeAstCopy));assert.equal(transportConcreteSyntaxMeta(row.beforeMeta).source,row.before);assert.equal(transportConcreteSyntaxMeta(row.afterMeta).source,row.after);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);for(const stage of row.stages){assert.equal(stage.completeInverse,true);assert.equal(transportConcreteSyntaxMeta(stage.beforeMeta).source,stage.before);assert.equal(transportConcreteSyntaxMeta(stage.afterMeta).source,stage.after);assert.deepEqual(stage.trace.map(value=>value.phase),['language','repository']);assert.equal(stage.trace.find(value=>value.phase===stage.phase).rules.length,1);assert.equal(stage.trace.find(value=>value.phase!==stage.phase).rules.length,0);}}
});
test('full checked scalar programs keep syntax and canonical parses while eliminating only the middle scan',{timeout:60000},async()=>{
 const plan=prepareParsedLinoData(),pair=await copies(plan),source='/** @param {number} value */\nexport function increment(value){return value+1;}\nexport const greeting="é猫😀";',translated=pair.before.api.translateJavaScript(source,{includeScoped:false}),meta=translated.meta;
 for(const row of Object.values(pair))row.reset();const before=pair.before.api.parseMeta(meta),after=pair.after.api.parseMeta(meta);assert.deepEqual(after,before);assert.deepEqual(after,translated.program);assert.equal(pair.before.calls.length,3);assert.equal(pair.after.calls.length,2);assert.equal(pair.after.calls[0],meta);assert.equal(pair.before.calls[0],meta);assert.equal(pair.before.calls[1],meta);assert.equal(pair.after.calls[1],pair.before.calls[2]);
 retain('complete-scalar-original-meta-and-results',{source,translated,meta,before,after,beforeInputs:pair.before.calls.slice(),afterInputs:pair.after.calls.slice()});
 assert.deepEqual(pair.after.ir.fromLino(meta),pair.before.ir.fromLino(meta));assert.equal(pair.after.ir.parsedLinoDataCopyReady(),true);
 for(const text of ['', '(alien)',meta+meta,meta.replace('(returns number)','(returns boolean)'),meta.replace('(body','(extra x) (body'),'(', '(function broken)']){const before=outcome(()=>pair.before.api.parseMeta(text)),after=outcome(()=>pair.after.api.parseMeta(text));retain('complete-negative-meta-and-outcomes',{text,before,after});assert.deepEqual(after,before,text);}
});
test('genuine constructor owners keep every fresh Hash and actual JSON observer call through original fallback',{timeout:60000},async()=>{
 const pair=await copies(prepareParsedLinoData()),row=constructor();pair.before.api.parseMeta(row.meta,{constructorGraph:row.graph});pair.after.api.parseMeta(row.meta,{constructorGraph:row.graph});
 pair.before.reset();pair.after.reset();const freshBefore=tape(()=>pair.before.api.parseMeta(row.meta,{constructorGraph:row.graph}),false),freshAfter=tape(()=>pair.after.api.parseMeta(row.meta,{constructorGraph:row.graph}),false);assert.deepEqual(freshAfter,freshBefore);assert.equal(freshAfter.result.ok,true);assert.ok(freshAfter.events.some(row=>row.operation==='Hash.update'));assert.equal(pair.before.calls.length,3);assert.equal(pair.after.calls.length,2);
 const before=tape(()=>pair.before.api.parseMeta(row.meta,{constructorGraph:row.graph})),after=tape(()=>pair.after.api.parseMeta(row.meta,{constructorGraph:row.graph}));assert.deepEqual(after,before);assert.equal(after.result.ok,true);assert.ok(after.events.some(row=>row.operation==='Hash.update'));assert.ok(after.events.some(row=>row.operation==='JSON.parse'));assert.ok(after.events.some(row=>row.operation==='JSON.stringify'));
 retain('complete-genuine-owner-and-fresh-observer-tapes',{meta:row.meta,freshBefore,freshAfter,before,after});
 for(const copy of Object.values(pair)){copy.reset();const observed=tape(()=>copy.api.parseMeta(row.meta,{constructorGraph:row.graph}));assert.equal(observed.result.ok,true);assert.equal(copy.calls.length,3);}
});
test('copied decoder DATA stays detached during JSON parse callbacks and rejects untrusted shapes without getters',{timeout:60000},async()=>{
 const pair=await copies(prepareParsedLinoData()),row=constructor(),original=descriptor(JSON,'parse');
 const run=copy=>{copy.reset();const argumentsSeen=[];let calls=0;try{define(JSON,'parse',{...original,value:function(...args){calls++;argumentsSeen.push(args[0]);return apply(original.value,this,args);}});const value=copy.api.parseMeta(row.meta,{constructorGraph:row.graph});return {value,argumentsSeen,calls,syntaxCalls:copy.calls.length};}finally{define(JSON,'parse',original);}};
 const before=run(pair.before),after=run(pair.after);assert.deepEqual(after.value,before.value);assert.deepEqual(after.argumentsSeen,before.argumentsSeen);assert.equal(after.calls,before.calls);assert.ok(after.calls>0);assert.equal(before.syntaxCalls,3);assert.equal(after.syntaxCalls,2);
 // The decoder's later find sees its separate working network. If that
 // callback changes a name, the first network must still reject canonicality.
 const find=descriptor(Array.prototype,'find'),mutate=copy=>{let armed=false,changed=false;try{define(JSON,'parse',{...original,value:function(...args){const value=apply(original.value,this,args);if(!armed){armed=true;define(Array.prototype,'find',{...find,value:function(...args){if(!changed&&this[0]==='function'){changed=true;this[1]='forged_name';define(Array.prototype,'find',find);}return apply(find.value,this,args);}});}return value;}});return {result:outcome(()=>copy.api.parseMeta(row.meta,{constructorGraph:row.graph})),changed};}finally{define(JSON,'parse',original);define(Array.prototype,'find',find);}};
 const mutatedBefore=mutate(pair.before),mutatedAfter=mutate(pair.after);assert.deepEqual(mutatedAfter,mutatedBefore);assert.equal(mutatedAfter.changed,true);assert.equal(mutatedAfter.result.ok,false);assert.match(mutatedAfter.result.message,/noncanonical or malformed/u);
 retain('complete-JSON-callback-and-canonical-mutation-outcomes',{meta:row.meta,before,after,mutatedBefore,mutatedAfter});
 let touched=0;const accessor=[];define(accessor,'0',{get(){touched++;return 'function';},enumerable:true,configurable:true});const cycle=[];cycle.push(cycle);const quoted={};define(quoted,'quoted',{get(){touched++;return 'text';},enumerable:true,configurable:true});const proxy=new Proxy([],{ownKeys(){touched++;throw Error('observed proxy');}}),stack=[];Error.captureStackTrace(stack);
 for(const data of [accessor,cycle,[quoted],proxy,stack,Object.assign([],{extra:true}),Object.setPrototypeOf([],null)])assert.equal(pair.after.ir.tryDecodeCopiedLinoData(data),null);assert.equal(touched,0);
 const network=pair.after.lino.parseLinks(row.meta),copied=pair.after.ir.tryDecodeCopiedLinoData(network);assert.deepEqual(copied,pair.before.ir.fromLino(row.meta));network[0][1]='changed';assert.notEqual(copied[0].name,'changed');assert.throws(()=>pair.after.api.parseMeta(row.meta,{constructorGraph:{}}));
 for(const [kind,change]of [['owner',item=>item.sourceConstructors.owner.start++],['source',item=>{item.sourceConstructors.sources[0].source+='\n';}],['conditional',item=>{item.conditionalConstructors=false;}],['name',item=>{item.name='forged_name';}]]){
  const item=JSON.parse(nativeJSON(copied[0]));change(item);const meta=pair.after.ir.toLino(item)+'\n',before=outcome(()=>pair.before.api.parseMeta(meta,{constructorGraph:row.graph})),after=outcome(()=>pair.after.api.parseMeta(meta,{constructorGraph:row.graph}));retain('complete-forged-DATA-private-owner-refusal',{kind,meta,before,after});assert.deepEqual(after,before);assert.equal(after.ok,false);
 }
});
test('changed and transiently restored collection regex and JSON hooks keep original whole fallback schedules',{timeout:60000},async()=>{
 const pair=await copies(prepareParsedLinoData()),meta=pair.before.api.translateJavaScript('/** @param {number} value */\nexport function increment(value){return value+1;}',{includeScoped:false}).meta;
 for(const kind of ['push','regex','stringify']){
  const owner=kind==='push'?Array.prototype:kind==='regex'?RegExp.prototype:JSON,key=kind==='push'?'push':kind==='regex'?'test':'stringify',field=descriptor(owner,key),run=copy=>{copy.reset();let calls=0;try{define(owner,key,{...field,value:function(...args){calls++;if(kind==='push'&&calls===1)define(owner,key,field);return apply(field.value,this,args);}});const value=outcome(()=>copy.api.parseMeta(meta));return {value,calls,syntaxCalls:copy.calls.length};}finally{define(owner,key,field);}};
  const before=run(pair.before),after=run(pair.after);retain('complete-original-fallback-hook-observations',{kind,meta,before,after});assert.deepEqual(after,before);assert.ok(after.calls>0);assert.equal(after.syntaxCalls,3);
 }
});
test('final source and archive joins refuse mutation during complete actual source Hash operations',{timeout:60000},()=>{
 const plan=prepareParsedLinoData(),root=mkdtempSync(join(tmpdir(),'parsed-lino-data-source-')),target=plan.files.find(row=>row.path===TRANSLATOR),field=descriptor(Hash.prototype,'update');for(const input of plan.inputs){const path=join(root,input.path);mkdirSync(dirname(path),{recursive:true});writeFileSync(path,input.source);}let changed=false;
 try{define(Hash.prototype,'update',{...field,value:function(...args){const value=apply(field.value,this,args);if(args[0]===target.after&&!changed){changed=true;writeFileSync(join(root,TRANSLATOR),target.before+'\n// changed during final source hashing\n');}return value;}});assert.throws(()=>prepareParsedLinoData({root}),/source changed at final input join/u);assert.equal(changed,true);}
 finally{define(Hash.prototype,'update',field);rmSync(root,{recursive:true,force:true});}
});
