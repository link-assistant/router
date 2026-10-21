import test from 'node:test';
import assert from 'node:assert/strict';
import {Hash,createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {ownershipCompiler} from '../vendor/module-syntax.mjs';
import {createOwnedCoreSourceContext,ownedCoreRuntimeSources} from '../owned-core-source.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE,ROUTER_CORE_PRIMITIVES_SOURCE} from '../../router-core-source-data.mjs';
import {rustPackageSourcePath} from '../../repository-layout.mjs';
import {prepareOwnedCorePrivateAnalysisRetention,composeOwnedCorePrivateAnalysisRetention} from '../../prepare-owned-core-private-analysis-retention.mjs';
import {transportConcreteSyntaxMeta} from '../../concrete-syntax-meta.mjs';
const ROOT=fileURLToPath(new URL('../../../../',import.meta.url)),PATH='tools/translation/js-to-rust/owned-core-operations.mjs',base=new URL('../owned-core-operations.mjs',import.meta.url);
const descriptor=Object.getOwnPropertyDescriptor,define=Object.defineProperty,apply=Reflect.apply;
const hash=source=>createHash('sha256').update(source).digest('hex');
let serial=0;
function context(){
 const imported="import {router_core_json_copy as copy} from './runtime/json-update-runtime.mjs';\n",js=imported+'export function first(value){return copy(value);}\nexport function second(value){return copy(value);}\n',ts=imported+"import type {JsonValue} from './runtime/json-macro-runtime.mjs';\nexport function first(value:JsonValue):JsonValue{return copy(value);}\nexport function second(value:JsonValue):JsonValue{return copy(value);}\n";
 const files=[...ownedCoreRuntimeSources(),{path:'src/lib.rs',source:'pub mod translation_core;\n'},{path:'src/translation_core.rs',source:ROUTER_FORMATTING_FACADE_SOURCE},{path:'src/translation_core/primitives.rs',source:ROUTER_CORE_PRIMITIVES_SOURCE},...['Cargo.toml','Cargo.lock'].map(path=>({path,source:readFileSync(join(ROOT,rustPackageSourcePath(ROOT,path)),'utf8')})),{path:'caller.mjs',source:js},{path:'caller.mts',source:ts}];
 return createOwnedCoreSourceContext({runtimeRoot:'runtime',declarationRoot:'runtime',files});
}
async function copies(row){
 const ts=ownershipCompiler(),result={};
 for(const [label,source]of [['before',row.before],['after',row.after]]){
  const file=ts.createSourceFile(PATH,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS),edits=[];assert.equal(file.parseDiagnostics.length,0);
  for(const node of file.statements)if((ts.isImportDeclaration(node)||ts.isExportDeclaration(node))&&node.moduleSpecifier&&ts.isStringLiteral(node.moduleSpecifier)&&/^\.{1,2}\//u.test(node.moduleSpecifier.text)){const item=node.moduleSpecifier;edits.push({start:item.getStart(file),end:item.end,after:JSON.stringify(new URL(item.text,base).href)});}
  const visit=node=>{if(ts.isFunctionDeclaration(node)&&node.name?.text==='canonicalCopy')edits.push({start:node.body.getStart(file)+1,end:node.body.getStart(file)+1,after:'__privateAnalysisProbe.copies++;'});if(ts.isFunctionDeclaration(node)&&node.name?.text==='analyzeOwnedCoreModule')edits.push({start:node.body.getStart(file)+1,end:node.body.getStart(file)+1,after:'__privateAnalysisProbe.analyses++;'});ts.forEachChild(node,visit);};visit(file);
  let code=source;for(const edit of edits.sort((a,b)=>b.start-a.start))code=code.slice(0,edit.start)+edit.after+code.slice(edit.end);
  code='const __privateAnalysisProbe={copies:0,analyses:0};\n'+code+'\nexport {__privateAnalysisProbe};\n// unique fixture '+(++serial);
  assert.equal(ts.createSourceFile(PATH,code,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS).parseDiagnostics.length,0);
  result[label]=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
 }
 return result;
}
function hashes(run){
 const field=descriptor(Hash.prototype,'update'),digest=descriptor(Hash.prototype,'digest'),tape=[];let value,error;
 try{define(Hash.prototype,'update',{...field,value:function(...args){const result=apply(field.value,this,args);tape.push({operation:'update',args:args.map(value=>typeof value==='string'?{string:value}:{bytes:Buffer.from(value).toString('base64')}),sameReceiver:result===this});return result;}});define(Hash.prototype,'digest',{...digest,value:function(...args){const result=apply(digest.value,this,args);tape.push({operation:'digest',args,result:typeof result==='string'?{string:result}:{bytes:Buffer.from(result).toString('base64')}});return result;}});try{value=run();}catch(thrown){error=thrown;}}
 finally{define(Hash.prototype,'update',field);define(Hash.prototype,'digest',digest);}return {value,error,tape};
}
test('complete default source proposal retains native copies both phases exact inverse and predecessor refusal',{timeout:60000},()=>{
 const plan=prepareOwnedCorePrivateAnalysisRetention(),row=plan.files[0];assert.equal(plan.defaultAdoption,true);assert.equal(plan.runtimeAuthority,false);assert.equal(plan.files.length,1);
 assert.equal(hash(row.before),row.beforeSha256);assert.equal(hash(row.after),row.afterSha256);assert.equal(row.inverse,row.before);assert.equal(row.selection.nativeInverse,row.before);assert.equal(row.selection.nativeLexicalBindings,true);
 assert.equal(transportConcreteSyntaxMeta(row.beforeMeta).source,row.before);assert.equal(transportConcreteSyntaxMeta(row.afterMeta).source,row.after);
 assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);for(const stage of row.stages){assert.equal(stage.completeInverse,true);assert.equal(transportConcreteSyntaxMeta(stage.beforeMeta).source,stage.before);assert.equal(transportConcreteSyntaxMeta(stage.afterMeta).source,stage.after);assert.deepEqual(stage.trace.map(trace=>trace.phase),['language','repository']);assert.equal(stage.trace.find(trace=>trace.phase===stage.phase).rules.length,1);assert.equal(stage.trace.find(trace=>trace.phase!==stage.phase).rules.length,0);}
 assert.equal(row.nativeCopies.length,2);assert.ok(row.nativeCopies.every(copy=>copy.completeNativeAstCopy));assert.throws(()=>composeOwnedCorePrivateAnalysisRetention({[PATH]:{after:row.before+'\n'}}),/preceding complete operations equation/u);
 const edit=row.selection.rule;assert.equal(row.before.slice(...edit.span),edit.expected);assert.equal(row.after,row.before.slice(0,edit.span[0])+edit.replacement+row.before.slice(edit.span[1]));
});
test('genuine original source groups keep complete results and full fresh Hash arguments while copying once',{timeout:60000},async()=>{
 const row=prepareOwnedCorePrivateAnalysisRetention().files[0],pair=await copies(row),source=context(),program=pair.before.analyzeOwnedCoreModule(source,'caller.mjs').program;
 const run=api=>api.withOwnedCoreItemChecks(check=>[check(program[0],source),check(program[1],source),check(program[0],source)]);
 run(pair.before);run(pair.after);
 for(const api of Object.values(pair)){api.__privateAnalysisProbe.copies=0;api.__privateAnalysisProbe.analyses=0;}
 const before=hashes(()=>run(pair.before)),after=hashes(()=>run(pair.after));assert.equal(before.error,undefined);assert.equal(after.error,undefined);assert.deepEqual(after.value,before.value);assert.deepEqual(after.tape,before.tape);assert.ok(after.tape.length>0);
 assert.equal(pair.before.__privateAnalysisProbe.copies,8);assert.equal(pair.after.__privateAnalysisProbe.copies,7);assert.equal(pair.before.__privateAnalysisProbe.analyses,1);assert.equal(pair.after.__privateAnalysisProbe.analyses,1);
 for(const api of Object.values(pair)){const prior=api.__privateAnalysisProbe.analyses;run(api);assert.equal(api.__privateAnalysisProbe.analyses,prior+1);}
});
test('separate returned copies cannot poison retained bodies spans or subsequent invocations',{timeout:60000},async()=>{
 const row=prepareOwnedCorePrivateAnalysisRetention().files[0],pair=await copies(row),source=context(),program=pair.before.analyzeOwnedCoreModule(source,'caller.mjs').program;
 for(const api of Object.values(pair))for(const kind of ['body','span','name']){
  api.withOwnedCoreItemChecks(check=>{const first=check(program[0],source);if(kind==='body')first.body[0].value.name='forged';else if(kind==='span')first.source.span[0]++;else first.name='forged';assert.throws(()=>check(first,source),/checked function\/meta|function span/u);assert.deepEqual(check(program[0],source),program[0]);assert.deepEqual(check(program[1],source),program[1]);});
  assert.deepEqual(api.checkOwnedCoreProgram(program,source),program);
 }
 const field=descriptor(Array.prototype,'filter');
 for(const api of Object.values(pair)){
  let caught;try{define(Array.prototype,'filter',{...field,value:function(...args){return apply(field.value,this,args);}});try{api.checkOwnedCoreProgram(program,source);}catch(error){caught=error;}}finally{define(Array.prototype,'filter',field);}
  assert.ok(caught instanceof TypeError);assert.match(caught.message,/host operations|native|source operations/u);
 }
});
test('final fresh physical source join refuses mutations from actual full-source Hash callbacks',{timeout:60000},()=>{
 const row=prepareOwnedCorePrivateAnalysisRetention().files[0],root=mkdtempSync(join(tmpdir(),'owned-private-analysis-retention-')),path=join(root,PATH),field=descriptor(Hash.prototype,'update');mkdirSync(dirname(path),{recursive:true});writeFileSync(path,row.before);let changed=false;
 try{define(Hash.prototype,'update',{...field,value:function(...args){const result=apply(field.value,this,args);if(args[0]===row.after&&!changed){changed=true;writeFileSync(path,row.before+'\n// changed during final full-source hashing\n');}return result;}});assert.throws(()=>prepareOwnedCorePrivateAnalysisRetention({root}),/physical source changed/u);assert.equal(changed,true);}
 finally{define(Hash.prototype,'update',field);rmSync(root,{recursive:true,force:true});}
});
