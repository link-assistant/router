import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {gzipSync} from 'node:zlib';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {createDeriveFootprintContext,deriveFootprintHelperAttributeAt} from '../derive-footprints.mjs';
import {resolveModuleBindings} from '../module-bindings.mjs';
import {resolveModuleGraph} from '../project.mjs';
import {originalSourceModuleItems} from '../source-module-views.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
const root=new URL('../../../',import.meta.url),dependencies=loadDeriveDependencyProof({manifest:readFileSync(new URL('Cargo.toml',root),'utf8'),lock:readFileSync(new URL('Cargo.lock',root),'utf8')});
const originalRoot=readFileSync(new URL('src/lib.rs',root),'utf8'),alias=originalRoot.slice(442,485);
const model='#[derive(Clone,Default,serde::Deserialize)] pub struct Payload { #[serde(default)] value:u32 }';
function fixture(rootSource,modelSource=model){
 const sources=new Map([['src/lib.rs',rootSource],['src/model.rs',modelSource]]),graph=resolveModuleGraph({entry:'src/lib.rs',paths:[...sources.keys()],readSource:path=>sources.get(path),compilationProfile:PRODUCTION_PROFILE});
 const context=createDeriveFootprintContext({modules:graph.modules,dependencies,compilationProfile:PRODUCTION_PROFILE});
 const module=graph.modules.find(module=>module.path.join('.')==='model'),item=module&&originalSourceModuleItems(module).find(item=>item.name==='Payload'),certificate=context.certificates.find(certificate=>certificate.name==='Payload'),span=certificate?.attributes.find(attribute=>attribute.name==='serde')?.span;
 return {graph,context,certificate,helper:span?deriveFootprintHelperAttributeAt(context,module,item,span):null};
}
function retain(name,value){const path=process.env.ROUTER_DERIVE_ANCESTOR_EVIDENCE_DIR;if(path){mkdirSync(path,{recursive:true});writeFileSync(path+'/'+name+'.json.gz',gzipSync(JSON.stringify(value)));}}
test('exact original Router self-crate alias retains the privately resolved header and nested helper owner',()=>{
 assert.equal(alias,'extern crate self as link_assistant_router;');const source=alias+'\nmod model;',value=fixture(source);assert.deepEqual(value.context.diagnostics,[]);assert.ok(value.helper);assert.equal(value.helper.exactNestedHelperInert,true);assert.equal(value.helper.namespaceAuthority,false);assert.equal(value.helper.generatedImplBehavior,false);
 const binding=resolveModuleBindings({modules:value.graph.modules,compilationProfile:PRODUCTION_PROFILE}).scopes[0].bindings.find(binding=>binding.name==='link_assistant_router');assert.equal(binding.externCrateSelf,true);assert.deepEqual(binding.target,['crate']);assert.deepEqual(binding.declaration,{source:'src/lib.rs',span:{start:0,end:alias.length}});retain('original-self-crate-alias',{originalRootSource:originalRoot,originalAliasSpan:{start:442,end:485},source,context:value.context,helper:value.helper,binding});
});
test('other exact self aliases and visibility preserve the original resolved crate identity',()=>{
 const rows=[];for(const declaration of ['extern crate self as local_router;','pub extern crate self as local_router;','extern crate self as r#router;']){const value=fixture(declaration+'\nmod model;');assert.deepEqual(value.context.diagnostics,[]);assert.ok(value.helper);rows.push({declaration,context:value.context,helper:value.helper});}retain('generic-self-crate-aliases',rows);
});
test('foreign extern crates omitted aliases duplicate bindings and procedural attributes retain refusal',()=>{
 const rows=[];for(const declaration of ['extern crate foreign as link_assistant_router;','extern crate self;','extern crate self as _;','extern crate self as local_router; struct local_router;','#[custom] extern crate self as local_router;']){const value=fixture(declaration+'\nmod model;');assert.equal(value.helper,null,declaration);rows.push({declaration,context:value.context,helper:value.helper});}retain('refused-self-crate-aliases',rows);
});
test('owner aliases imported macro shadows and unknown conditional owners remain refused',()=>{
 const rows=[];for(const source of ['extern crate self as core;\nmod model;','use serde::Deserialize as serde;\n'+alias+'\nmod model;','use serde::*;\n'+alias+'\nmod model;','#[cfg(unix)] extern crate self as local_router;\nmod model;','extern crate self as local_router;\n#[cfg(unix)] mod model;']){const value=fixture(source);assert.equal(value.helper,null,source);rows.push({source,context:value.context,helper:value.helper,graphDiagnostics:value.graph.diagnostics});}
 const conditional=fixture(alias+'\nmod model;','#[cfg(unix)] '+model);assert.equal(conditional.certificate,undefined);rows.push({source:alias+'\nmod model;',modelSource:'#[cfg(unix)] '+model,context:conditional.context});retain('refused-conditional-owner-aliases',rows);
});
