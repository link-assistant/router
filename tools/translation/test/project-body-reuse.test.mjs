import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {translateSource,translateSourceWithProjectBodies} from '../translate.mjs';
import {translateProjectWithFlatEnclosingSemanticMeta} from '../project.mjs';
import {prepareProjectBodyReuse} from '../prepare-project-body-reuse.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {repositorySourceURL} from './fixtures/repository-paths.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
import {ownershipCompiler} from '../js-to-rust/vendor/module-syntax.mjs';
const root=new URL('../../../',import.meta.url),manifest=readFileSync(repositorySourceURL('Cargo.toml',root),'utf8'),lock=readFileSync(repositorySourceURL('Cargo.lock',root),'utf8');
const deriveDependencies=loadDeriveDependencyProof({manifest,lock});
function project(files){
 return translateProjectWithFlatEnclosingSemanticMeta({entry:'src/lib.rs',paths:Object.keys(files),readSource:path=>files[path],cargoManifest:manifest,deriveDependencies,compilationProfile:PRODUCTION_PROFILE});
}
function options(result){return {projectDeclarations:result.executableDeclarations,projectSourceScopes:result.sourceScopes};}
function compare(source,path,input){const before=translateSource(source,path,input),after=translateSourceWithProjectBodies(source,path,input);assert.deepEqual(after,before);return after;}
test('complete native source proposals retain original public entries both rule phases and every inverse',{timeout:60000},()=>{
 const plan=prepareProjectBodyReuse(),ts=ownershipCompiler();assert.equal(plan.files.length,2);assert.equal(plan.newAcrossInvocationCache,false);assert.equal(plan.performanceQualified,false);
 for(const row of plan.files){assert.equal(row.current,row.after);assert.equal(row.inverse,row.before);assert.ok(row.stages.every(stage=>stage.completeInverse));assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);assert.equal(row.nativeBindings.nativeSemanticScopeChecked,true);}
 const row=plan.files.find(row=>row.path.endsWith('/translate.mjs')),parse=source=>ts.createSourceFile('source.mjs',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS),before=parse(row.before),after=parse(row.after);
 for(const name of ['translateSource','translateSourceConcreteSyntaxMeta']){const select=file=>file.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text===name).getText(file);assert.equal(select(after),select(before));}
});
test('complete project constants callers layouts and methods retain all old source IR and emitted bytes',{timeout:60000},async()=>{
 const files={'src/lib.rs':'mod model;pub const ROOT:u8=3;pub fn answer()->u8{model::answer()+ROOT}pub fn empty(value:&str)->bool{value.is_empty()}pub fn blocked()->u8{missing!(7)}','src/model.rs':'pub const VALUE:u8=4;pub struct Record{pub value:u8}impl Record{pub fn read(&self)->u8{self.value}}pub fn answer()->u8{VALUE}'};
 const checked=project(files);assert.ok(checked.executableDeclarations.some(row=>row.name==='answer'));
 for(const [path,source]of Object.entries(files))compare(source,path,options(checked));
 const emitted=compare(files['src/lib.rs'],'src/lib.rs',options(checked));
 await verifyTypedTargets({meta:{entry:'src/lib.rs'},javascript:emitted.javascript,typescript:emitted.typescript},api=>{assert.equal(api.answer(),7n);assert.equal(api.empty(''),true);assert.equal(api.empty('Ω😀'),false);},{childTimeoutMs:20000});
});
test('carried functions retain existing locally checked metadata when a project body is absent',{timeout:60000},()=>{
 const source='pub fn identity(value:u8)->u8{value}pub fn blocked()->u8{unknown!(7)}',checked=project({'src/lib.rs':source});
 const output=compare(source,'src/lib.rs',{...options(checked),projectDeclarations:[]}),identity=output.ir.items.find(row=>row.name==='identity');
 assert.equal(identity.status,'carried');assert.equal(identity.diagnostic.kind,'module-binding');assert.ok(identity.semantic?.checkedIR);assert.equal(output.ir.runtimeParity,false);
});
test('a different project keeps its ordinary standalone fallback instead of borrowing the matching scope',{timeout:60000},()=>{
 const source='pub fn identity(value:u8)->u8{value}',checked=project({'src/lib.rs':source}),input=options(checked);
 input.projectDeclarations=input.projectDeclarations.map(row=>({...row,project:'src/another.rs'}));
 const output=compare(source,'src/lib.rs',input),identity=output.ir.items.find(row=>row.name==='identity');assert.equal(identity.status,'executable');assert.equal(identity.semantic.project,undefined);
});
test('unknown ambiguous inactive and changed source contexts retain complete original outcomes',{timeout:60000},()=>{
 const source='#[cfg(test)]pub fn inactive()->u8{8}pub fn identity(value:u8)->u8{value}',checked=project({'src/lib.rs':source}),input=options(checked);
 compare(source,'src/lib.rs',input);compare(source+'\n','src/lib.rs',input);compare(source,'src/unmatched.rs',input);
 compare(source,'src/lib.rs',{...input,projectSourceScopes:[...input.projectSourceScopes,...input.projectSourceScopes]});
 compare(source,'src/lib.rs',{...input,projectDeclarations:[...input.projectDeclarations,...input.projectDeclarations]});
});
test('both source paths propagate the exact project lower error and cannot read a caller reuse flag',{timeout:60000},()=>{
 const source='pub fn identity(value:u8)->u8{value}',checked=project({'src/lib.rs':source}),input=options(checked),failure=Error('original lower failure');
 input.projectDeclarations=input.projectDeclarations.map(row=>({...row,lower(){throw failure;}}));let reads=0;
 Object.defineProperty(input,'reuseProjectChecks',{get(){reads++;throw Error('caller mode injection');}});
 for(const run of [translateSource,translateSourceWithProjectBodies])assert.throws(()=>run(source,'src/lib.rs',input),error=>error===failure);assert.equal(reads,0);
});
test('actual complete Router modules retain every original refusal source item and emitted byte',{timeout:60000},()=>{
 for(const relative of ['src/config_defaults.rs','src/cli/value_parsers.rs']){
  const source=readFileSync(repositorySourceURL(relative,root),'utf8'),checked=project({'src/lib.rs':source});
  compare(source,'src/lib.rs',options(checked));
 }
});
