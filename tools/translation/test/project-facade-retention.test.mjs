import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {serializeProgram} from '../semantic-meta.mjs';
import {ownershipCompiler} from '../js-to-rust/vendor/module-syntax.mjs';
import {translateProject} from '../project.mjs';
import {prepareProjectFacadeRetention,composeProjectFacadeRetention} from '../prepare-project-facade-retention.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
const limits={timeout:60000};
const input='pub fn root(x:u8)->u8{child::add(x)} pub mod child {pub fn add(x:u8)->u8{x+1}} pub mod other {pub fn same(x:u8)->u8{x}}';
function project(){return translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>input});}
function originalCallables(){
 const output=execFileSync(process.execPath,[fileURLToPath(new URL('./fixtures/project-facade-engine-child.mjs',import.meta.url))],{encoding:'utf8',maxBuffer:8388608,env:{...process.env,NODE_OPTIONS:'--max-old-space-size=512'}});
 const result=JSON.parse(output);assert.equal(result.originalSha256,'6d4f79faba62027fa5d3d1b733d99e309a5ae3981f6043bea4842cc58b75d7a0');return result;
}
const observe=fn=>({name:fn.name,length:fn.length,prototype:Object.hasOwn(fn,'prototype'),source:Function.prototype.toString.call(fn)});
function nativeCallable(source){
 const ts=ownershipCompiler(),file=ts.createSourceFile('engine-callable.mjs','const observed=('+source+');',ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
 assert.equal(file.parseDiagnostics.length,0);
 function shape(node){const children=[];ts.forEachChild(node,child=>{children.push(shape(child));});return [node.kind,ts.isIdentifier(node)?node.escapedText:ts.isLiteralExpression(node)?node.text:null,children];}
 return shape(file);
}

test('complete project retention equation preserves both native callable bodies and every serialized CST inverse',limits,()=>{
 const plan=prepareProjectFacadeRetention(),row=plan.files[0];
 assert.equal(plan.typescriptVersion,'5.9.3');assert.equal(plan.sourceAuthority,false);assert.equal(plan.semanticAuthority,false);
 assert.equal(row.current,row.after);assert.equal(readFileSync(new URL('../project.mjs',import.meta.url),'utf8'),row.after);
 assert.equal(row.inverse,row.before);assert.equal(row.selection.completeNativeInverse,row.before);
 assert.deepEqual(row.nativeBindings.unboundIdentifiers,[]);assert.ok(row.nativeCopies.every(copy=>copy.completeNativeAstCopy));
 assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);
 for(const stage of row.stages){
  assert.equal(transportConcreteSyntaxMeta(stage.beforeMeta).source,stage.before);
  assert.equal(transportConcreteSyntaxMeta(stage.afterMeta).source,stage.after);
  assert.equal(stage.completeInverse,true);assert.deepEqual(stage.trace.map(part=>part.phase),['language','repository']);
 }
 const facade=project().executableDeclarations.find(item=>item.name==='root');
 const original=originalCallables();
 for(const key of ['lower','checkedSource']){
  const actual=observe(facade[key]),before=original[key];
  assert.deepEqual({...actual,source:undefined},{...before,source:undefined});
  // Bun prints compiled source with indentation determined by its placement.
  // Compare every native syntax node; retain exact text comparison on Node.
  assert.deepEqual(nativeCallable(actual.source),nativeCallable(before.source));
  if(!process.versions.bun)assert.equal(actual.source,before.source);
 }
 const prior={[row.path]:{after:row.before}},joined=composeProjectFacadeRetention(prior);
 assert.equal(joined.historicalSources,prior);assert.equal(joined.sources[row.path].after,row.after);
 assert.throws(()=>composeProjectFacadeRetention({[row.path]:{after:row.before+' '}}),/preceding complete project equation/);
});

test('retained checked-source facade observes live module paths and ambiguous siblings and returns fresh frozen copies',limits,()=>{
 const result=project(),facade=result.executableDeclarations.find(row=>row.qualifiedName==='child.add');
 const first=facade.checkedSource(),second=facade.checkedSource();
 assert.notEqual(first,second);assert.notEqual(first.declaration,second.declaration);assert.deepEqual(first,second);
 assert.ok(Object.isFrozen(second.declaration.body));
 const child=result.meta.sources.find(row=>row.module.join('.')==='child'),other=result.meta.sources.find(row=>row.module.join('.')==='other');
 child.module.push('moved');const moved=facade.checkedSource();assert.deepEqual(moved.module,['child','moved']);assert.equal(moved.qualifiedName,first.qualifiedName);child.module.pop();
 other.module[0]='child';assert.throws(()=>facade.checkedSource(),/association differs/);other.module[0]='other';
 facade.span.start++;assert.throws(()=>facade.checkedSource(),/association differs/);facade.span.start--;
 assert.deepEqual(facade.checkedSource(),first);
 result.meta.checkedSemanticProgram={forged:true};assert.deepEqual(facade.checkedSource(),first);
});

test('retained lowerers preserve callable descriptors and ordinary option observations across receivers',limits,()=>{
 const result=project(),facade=result.executableDeclarations.find(row=>row.qualifiedName==='root');
 const original=originalCallables();
 for(const key of ['lower','checkedSource']){
  const actual=observe(facade[key]);delete actual.source;
  const before={...original[key]};delete before.source;assert.deepEqual(actual,before);
 }
 const calls=[],options={get runtimeModule(){calls.push('runtimeModule');return '../runtime/effects.mjs';}};
 const first=facade.lower(options),second=facade.lower.call(Object.freeze({receiver:true}),options);
 assert.deepEqual(calls,['runtimeModule','runtimeModule']);
 assert.equal(serializeProgram(first.program),serializeProgram(second.program));assert.deepEqual(first.emitted,second.emitted);
 assert.equal(first.own.fullName,second.own.fullName);assert.deepEqual(facade.lower().own,first.own);
});
