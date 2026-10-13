import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {translateProject} from '../project.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {loadJsonMacroSourceProof} from '../json-macro-inputs.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
const root=new URL('../../../',import.meta.url);
const read=path=>{try{return readFileSync(new URL(path,root),'utf8');}catch(error){if(error.code!=='ENOENT')throw error;return execFileSync('git',['show','HEAD:'+path],{cwd:root,encoding:'utf8',maxBuffer:10000000});}};
test('unchanged whole model contract reaches real generic-body routes while independent ownership remains refused',{timeout:60000},()=>{
 const entry='src/model_contract.rs',source=read(entry),paths=execFileSync('git',['ls-tree','-r','--name-only','HEAD','--','src'],{cwd:root,encoding:'utf8'}).trim().split('\n'),dependency={manifest:read('Cargo.toml'),lock:read('Cargo.lock')},result=translateProject({entry,paths,readSource:read,deriveDependencies:loadDeriveDependencyProof(dependency),jsonMacroDependencies:loadJsonMacroSourceProof(dependency),compilationProfile:PRODUCTION_PROFILE});
 assert.equal(result.meta.sources.find(item=>item.source===entry).sha256,createHash('sha256').update(source).digest('hex'));
 for(const name of ['validate_translated_response','validate_translated_response_for_selector']){assert.equal(result.meta.executable.some(row=>row.name===name),false);const refusal=result.meta.refused.find(row=>row.name===name);assert.match(refusal.message,/pinned standard body owner|private original checked Copy/);assert.ok(source.slice(refusal.span.start,refusal.span.end).includes('.map(Some)'));}
 const mapped=result.meta.refused.find(row=>row.name.endsWith(Buffer.from('from_catalog_value').toString('hex')));assert.ok(mapped);assert.match(mapped.message,/private original checked Copy layout/);assert.match(source.slice(mapped.span.start,mapped.span.end),/map_or\(Self::Unknown, Self::from_wire\)/);
 assert.match(result.meta.refused.find(row=>row.name==='validate_served_model_for_selector').message,/ok_or_else/);
 assert.match(result.meta.refused.find(row=>row.name==='ModelSelectorKind.permits_resolution').message,/consuming receiver/);
 assert.match(result.meta.refused.find(row=>row.name==='ModelSelectorKind.deserialize').message,/generic/);
 assert.ok(result.meta.checkedMethods.some(row=>row.name==='ModelSelectorKind.from_wire'));
});
