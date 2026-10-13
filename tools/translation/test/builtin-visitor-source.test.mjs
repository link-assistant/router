import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {builtinDeriveAstSourceProfile,builtinAstOriginal,originalAstFunction,astFragmentText} from '../builtin-derive-ast-meta.mjs';
const root=new URL('../../../',import.meta.url),dependencies=loadDeriveDependencyProof({manifest:readFileSync(new URL('Cargo.toml',root),'utf8'),lock:readFileSync(new URL('Cargo.lock',root),'utf8')}),profile=builtinDeriveAstSourceProfile(dependencies),path='compiler/rustc_ast_ir/src/visit.rs';
test('complete original visitor helper source shares the same immutable compiler revision and existing licenses',()=>{
 const source=builtinAstOriginal(profile,path);assert.equal(source.revision,'29483883eed69d5fb4db01964cdf2af4d86e9cb2');assert.equal(source.bytes,2199);assert.equal(source.sha256,'d585d8858e1d799b78f9f8c80d9b839bf86f492b9787e711326e960f02c81e38');assert.equal(source.namespaceAuthority,false);assert.equal(source.generatedImplBehavior,false);for(const name of ['try_visit','walk_list','visit_opt','walk_visitable_list'])assert.ok(source.source.includes('macro_rules! '+name));assert.throws(()=>builtinAstOriginal(structuredClone(profile),path),/Unsealed/);
});
test('both actual VisitorResult branch implementations remain retained source with no execution permission',()=>{
 for(const [name,selector]of [['output','fn output() -> Self {}'],['branch','ControlFlow::Continue(())'],['output','ControlFlow::Continue(())'],['branch','self\n']]){const recipe=originalAstFunction(profile,path,name,selector);assert.equal(recipe.semanticSyntaxRoundTrip,true);assert.equal(recipe.generatedImplBehavior,false);assert.equal(astFragmentText(recipe),builtinAstOriginal(profile,path).source.slice(recipe.span.start,recipe.span.end));assert.throws(()=>astFragmentText(structuredClone(recipe)),/Unsealed/);}
});
