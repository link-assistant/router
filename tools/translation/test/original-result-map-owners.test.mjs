import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {translateProject} from '../project.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {loadJsonMacroSourceProof} from '../json-macro-inputs.mjs';
import {parseProgram} from '../semantic-meta.mjs';
import {serde_json_from_str} from '../extensions/json-runtime.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
const root=new URL('../../../',import.meta.url);
const read=path=>{try{return readFileSync(new URL(path,root),'utf8');}catch(error){if(error.code!=='ENOENT')throw error;return execFileSync('git',['show','HEAD:'+path],{cwd:root,encoding:'utf8',maxBuffer:10000000});}};
test('unchanged whole model contract executes source-certified catalog and wire methods while owned Result barriers remain refused',{timeout:60000},async()=>{
 const entry='src/model_contract.rs',source=read(entry),paths=execFileSync('git',['ls-tree','-r','--name-only','HEAD','--','src'],{cwd:root,encoding:'utf8'}).trim().split('\n'),dependency={manifest:read('Cargo.toml'),lock:read('Cargo.lock')},result=translateProject({entry,paths,readSource:read,deriveDependencies:loadDeriveDependencyProof(dependency),jsonMacroDependencies:loadJsonMacroSourceProof(dependency),compilationProfile:PRODUCTION_PROFILE});
 assert.equal(result.meta.sources.find(item=>item.source===entry).sha256,createHash('sha256').update(source).digest('hex'));
 for(const name of ['validate_translated_response','validate_translated_response_for_selector']){assert.equal(result.meta.executable.some(row=>row.name===name),false);const refusal=result.meta.refused.find(row=>row.name===name);assert.match(refusal.message,/pinned standard body owner|private original checked Copy/);assert.ok(source.slice(refusal.span.start,refusal.span.end).includes('.map(Some)'));}
 assert.ok(result.meta.checkedMethods.some(row=>row.name==='ModelSelectorKind.from_catalog_value'));assert.ok(result.meta.checkedMethods.some(row=>row.name==='ModelSelectorKind.as_wire'));
 const program=parseProgram(JSON.stringify(result.meta.targetSemanticProgram)),aliases=[];for(const name of ['from_catalog_value','as_wire']){const method=[...program.declarations.values()].find(row=>row.impl?.method===name);assert.ok(method.sourceMethodProof.originalTokenTransformVerified);aliases.push(`export {${method.fullName} as original_${name}};`);}const suffix='\n'+aliases.join('\n'),tag=$=>Object.freeze({$}),some=field0=>Object.freeze({$:'Some',field0}),none=tag('None'),canonical=value=>serde_json_from_str(JSON.stringify(value)).field0;
 await verifyTypedTargets({...result,javascript:result.javascript+suffix,typescript:result.typescript+suffix},(_api,_r,module)=>{for(const [wire,variant]of [['concrete','Concrete'],['provider_advertised_exact_id','Concrete'],['provider_dynamic_alias','ProviderDynamicAlias'],['provider_advertised_alias','ProviderDynamicAlias'],['operator_alias','OperatorAlias'],['unknown','Unknown'],['','Unknown'],['Concrete','Unknown'],['É😀','Unknown']])assert.deepEqual(module.original_from_catalog_value(some(canonical(wire))),tag(variant));for(const value of [null,false,true,3,[],{}])assert.deepEqual(module.original_from_catalog_value(some(canonical(value))),tag('Unknown'));assert.deepEqual(module.original_from_catalog_value(none),tag('Unknown'));for(const [variant,wire]of [['Concrete','concrete'],['ProviderDynamicAlias','provider_dynamic_alias'],['OperatorAlias','operator_alias'],['Unknown','unknown']])assert.equal(module.original_as_wire(tag(variant)),wire);assert.throws(()=>module.original_as_wire(tag('Other')),TypeError);assert.throws(()=>module.original_as_wire({$:'Concrete'}),/immutable/);},{childTimeoutMs:20000});
 assert.match(result.meta.refused.find(row=>row.name==='validate_served_model_for_selector').message,/ok_or_else/);
 assert.match(result.meta.refused.find(row=>row.name.endsWith(Buffer.from('permits_resolution').toString('hex'))||row.name==='ModelSelectorKind.permits_resolution').message,/matches! original source contract/);
 assert.match(result.meta.refused.find(row=>row.name==='ModelSelectorKind.deserialize').message,/generic/);
 assert.ok(result.meta.checkedMethods.some(row=>row.name==='ModelSelectorKind.from_wire'));
});
