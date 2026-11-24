import {repositorySourceURL} from "./fixtures/repository-paths.mjs";
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {gzipSync} from 'node:zlib';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {captureSourceModuleViews,originalSourceModuleItems} from '../source-module-views.mjs';
import {createDeriveFootprintContext} from '../derive-footprints.mjs';
import {createCloneSourceContext,cloneSourceContextFacts} from '../clone-trait-source.mjs';
import {originalUnitCloneSource,assertOriginalUnitCloneSource} from '../clone-unit-source.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
const root=new URL('../../../',import.meta.url),read=path=>readFileSync(repositorySourceURL(path,root),'utf8');
const dependencies=loadDeriveDependencyProof({manifest:read('Cargo.toml'),lock:read('Cargo.lock')});
function retain(name,value){const directory=process.env.ROUTER_CLONE_UNIT_EVIDENCE_DIR;if(directory){mkdirSync(directory,{recursive:true});writeFileSync(directory+'/'+name+'.json.gz',gzipSync(JSON.stringify(value,null,2)+'\n'));}}
function setup(source,file='src/lib.rs'){
  const sourceView=captureSourceModuleViews({source,sourcePath:file,compilationProfile:PRODUCTION_PROFILE}).views[0];
  const derive=createDeriveFootprintContext({modules:[{file,path:[],source,sourceView,configurationCondition:'active',compilationProfile:PRODUCTION_PROFILE}],dependencies,compilationProfile:PRODUCTION_PROFILE});
  const context=createCloneSourceContext(derive),module=cloneSourceContextFacts(context).modules[0],item=originalSourceModuleItems(module).find(value=>value.term==='enum');
  return {context,module,item};
}
for(const variants of ['Only','Off,On','One,Two,Three,Four'])test('original Clone Copy branch preserves '+variants+' source variants',()=>{
  const row=setup('#[derive(Clone,Copy,serde::Serialize)]pub enum Mode{'+variants+'}'),proof=originalUnitCloneSource(row.context,row.module,row.item);
  retain('original-unit-variants-'+proof.variants.length,{source:row.module.source,proof});
  assert.strictEqual(assertOriginalUnitCloneSource(proof,row.context,row.module,row.item),proof);
  assert.deepEqual(proof.variants.map(value=>value.name),variants.split(','));
  assert.equal(proof.selectedBranch.feature,'has_derive_copy=true');
  assert.equal(proof.requiresPrivateCheckedCopyAndNoDrop,true);
  for(const key of ['namespaceAuthority','copyAuthority','noDropAuthority','constAuthority','generatedImplBehavior','runtimeParity'])assert.equal(proof[key],false);
});
test('complete unchanged model enum retains original docs and default helper source',{timeout:60000},()=>{
  const row=setup(read('src/model_contract.rs'),'src/model_contract.rs'),proof=originalUnitCloneSource(row.context,row.module,row.item);
  retain('complete-original-model-unit-enum',{source:row.module.source,proof});
  assert.equal(proof.typePath.at(-1),'ModelSelectorKind');
  assert.deepEqual(proof.variants.map(value=>value.name),['Concrete','ProviderDynamicAlias','OperatorAlias','Unknown']);
  assert.equal(proof.sourceOutput.originalHelperOwners.length,1);
});
test('copied foreign proxy changed-source and relocated unit Clone proof inputs refuse',()=>{
  const row=setup('#[derive(Clone,Copy,serde::Serialize)]enum Mode{Off,On}'),proof=originalUnitCloneSource(row.context,row.module,row.item);
  retain('private-unit-source-before-forgeries',{source:row.module.source,proof});
  assert.throws(()=>assertOriginalUnitCloneSource(structuredClone(proof),row.context,row.module,row.item),/copied/);
  assert.throws(()=>originalUnitCloneSource(structuredClone(row.context),row.module,row.item),/unsealed/);
  assert.throws(()=>originalUnitCloneSource(row.context,new Proxy(row.module,{}),row.item),/plain/);
  assert.throws(()=>originalUnitCloneSource(row.context,row.module,new Proxy(row.item,{})),/plain/);
  assert.throws(()=>assertOriginalUnitCloneSource(proof,row.context,{...row.module,source:row.module.source+' '},row.item),/differs/);
  const other=setup(row.module.source);assert.throws(()=>assertOriginalUnitCloneSource(proof,other.context,other.module,other.item),/foreign/);
  assert.throws(()=>assertOriginalUnitCloneSource(proof,row.context,row.module,{...row.item,start:row.item.start+1}),/rebound/);
});
test('payload generic explicit discriminant empty missing Copy and duplicate derives remain source refusals',()=>{
  for(const source of ['#[derive(Clone)]enum Mode{Off,On}','#[derive(Clone,Copy)]enum Mode{Off(u8),On}','#[derive(Clone,Copy)]enum Mode<T>{Off(T),On}','#[derive(Clone,Copy)]enum Mode{Off=1,On=2}','#[derive(Clone,Copy)]enum Mode{}','#[derive(Clone,Clone,Copy)]enum Mode{Off,On}','#[derive(Clone,Copy,Copy)]enum Mode{Off,On}']){
    assert.throws(()=>{const row=setup(source);originalUnitCloneSource(row.context,row.module,row.item);},TypeError,source);
  }
});
