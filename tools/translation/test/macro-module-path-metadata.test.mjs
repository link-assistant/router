import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {gzipSync} from 'node:zlib';
import {resolveModuleGraph} from '../project.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {createDeriveFootprintContext,deriveFootprintExternalModules} from '../derive-footprints.mjs';
import {createDeriveBangContext} from '../derive-bang-context.mjs';
import {createToolAttributeContext} from '../tool-attributes.mjs';
import {resolveModuleBindings} from '../module-bindings.mjs';
import {registeredStandardHostBindings} from '../standard-host-bindings.mjs';
import {lockedTomlValueNamespaceBindings} from '../toml-value-namespace.mjs';
import {captureOriginalMacroModules,originalMacroModules} from '../original-macro-module-context.mjs';
import {createMatchesMacroContext,originalMatchesNamespaceBindings,configureMatchesMacroParser,matchesParserFacts} from '../matches-macro-context.mjs';
import {HostRustParser} from '../extensions/host-contracts.mjs';
import {tokenizeRust} from '../extensions/lexical.mjs';
const root=new URL('../../../',import.meta.url),dependencies=loadDeriveDependencyProof({manifest:readFileSync(new URL('Cargo.toml',root),'utf8'),lock:readFileSync(new URL('Cargo.lock',root),'utf8')});
function retain(name,value){const directory=process.env.ROUTER_MACRO_PATH_VECTORS;if(directory){mkdirSync(directory,{recursive:true});writeFileSync(directory+'/'+name+'.json.gz',gzipSync(JSON.stringify(value)));}}
const defaultModel='#[derive(Default,serde::Deserialize)]pub struct Payload{#[serde(default)]pub value:String}pub fn probe()->u32{7u32}';
function fixture(model=defaultModel){
 const files={'src/lib.rs':'extern crate self as link_assistant_router;#[cfg(unix)]mod sibling;mod model;','src/model.rs':model,'src/sibling.rs':'#[derive(Clone,Copy,Debug)]pub struct Hidden;'},graph=resolveModuleGraph({entry:'src/lib.rs',paths:Object.keys(files),readSource:path=>files[path],compilationProfile:PRODUCTION_PROFILE});return {files,graph};
}
function independentScopes(value){
 const modules=value.graph.modules,externalModules=registeredStandardHostBindings([...originalMatchesNamespaceBindings(),...lockedTomlValueNamespaceBindings(dependencies)]),deriveContext=createDeriveFootprintContext({modules,dependencies,externalModules,compilationProfile:PRODUCTION_PROFILE}),resolvedExternal=deriveFootprintExternalModules(deriveContext),toolContext=createToolAttributeContext({modules,externalModules:resolvedExternal,deriveContext,compilationProfile:PRODUCTION_PROFILE}),deriveBangContext=createDeriveBangContext({deriveContext}),project=resolveModuleBindings({modules,externalModules:resolvedExternal,deriveContext,deriveBangContext,toolContext,compilationProfile:PRODUCTION_PROFILE}),context=createMatchesMacroContext({modules,deriveDependencies:dependencies,compilationProfile:PRODUCTION_PROFILE}),module=modules.find(row=>row.path.join('.')==='model'),parser=new HostRustParser(tokenizeRust(module.source));
 parser.compilationProfile=PRODUCTION_PROFILE;configureMatchesMacroParser(parser,context,{file:module.file,modulePath:module.path});const independent=matchesParserFacts(parser).facts;
 return {project,independent:independent.evidence,independentModules:independent.modules,deriveContext,deriveBangContext};
}
test('original macro snapshots retain exact graph directories and private view identity',()=>{
 const value=fixture(),capture=captureOriginalMacroModules({modules:value.graph.modules,compilationProfile:PRODUCTION_PROFILE}),original=originalMacroModules(capture);
 for(const [index,module]of original.modules.entries()){const graph=value.graph.modules[index];assert.equal(module.directory,graph.directory);assert.equal(module.pathDirectory,graph.pathDirectory);assert.strictEqual(module.sourceView,graph.sourceView);assert.equal(module.source,graph.source);assert.equal(capture.views[index].directory,graph.directory);assert.equal(capture.views[index].pathDirectory,graph.pathDirectory);assert.equal(Object.isFrozen(module),true);}
 assert.throws(()=>originalMacroModules(structuredClone(capture)),/Unsealed/);assert.throws(()=>{original.modules[0].directory='other';},TypeError);retain('01-original-directory-capture',{value,capture,original});
});
test('independent conditional helper resolution preserves every complete project scope field',()=>{
 const value=fixture(),result=independentScopes(value);assert.deepEqual(result.independent.scopes,result.project.scopes);const model=result.project.scopes.find(row=>row.path.join('.')==='model');assert.equal(model.unresolvedBangMacroScope,false);assert.deepEqual(model.unresolvedImports,[]);assert.equal(result.project.scopes.find(row=>row.path.length===0).unresolvedBangMacroScope,true);retain('02-complete-independent-scopes',{value,result});
});
test('complete original vendor limit source retains the same independently reconstructed scopes',()=>{
 const source=readFileSync(new URL('src/account_limits.rs',root),'utf8'),value=fixture(source),result=independentScopes(value);assert.deepEqual(result.independent.scopes,result.project.scopes);assert.equal(value.graph.modules.find(row=>row.path.join('.')==='model').source,source);retain('03-complete-original-account-limits',{source,value,result});
});
test('omitted path evidence stays omitted and cannot close a conditional helper output',()=>{
 const value=fixture();value.graph={...value.graph,modules:value.graph.modules.map(module=>{const {directory,pathDirectory,...rest}=module;return rest;})};const capture=captureOriginalMacroModules({modules:value.graph.modules,compilationProfile:PRODUCTION_PROFILE}),original=originalMacroModules(capture);assert.equal(original.modules.some(module=>Object.hasOwn(module,'directory')||Object.hasOwn(module,'pathDirectory')),false);const result=independentScopes(value);assert.deepEqual(result.independent.scopes,result.project.scopes);assert.equal(result.project.scopes.find(row=>row.path.join('.')==='model').unresolvedBangMacroScope,true);retain('04-omitted-path-obligations',{value,capture,original,result});
});
test('escaping malformed oversized and accessor path metadata is rejected before capture',()=>{
 const value=fixture();let reads=0;
 for(const key of ['directory','pathDirectory']){
  for(const directory of ['/tmp/source','../source','src/../source','src//source','src/','src\\source','src:source','src\0source','x'.repeat(4097),null,undefined]){const modules=value.graph.modules.map(module=>({...module}));modules[0][key]=directory;assert.throws(()=>captureOriginalMacroModules({modules,compilationProfile:PRODUCTION_PROFILE}),/canonical original directories/,key+':'+JSON.stringify(directory));}
  const modules=value.graph.modules.map(module=>({...module}));Object.defineProperty(modules[0],key,{get(){reads++;return 'src';},enumerable:true});assert.throws(()=>captureOriginalMacroModules({modules,compilationProfile:PRODUCTION_PROFILE}),/canonical original directories/);
 }
 assert.equal(reads,0);retain('05-path-refusals',{value,reads,existingPathByteCap:4096});
});
