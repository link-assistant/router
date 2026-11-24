// Exact original declaration bodies in a dependency projection. This fixture
// deliberately makes no unchanged-whole-module or bulk admission claim.
import {repositorySourceURL} from "./fixtures/repository-paths.mjs";
import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';
import {sourceItems} from '../rust-structure.mjs';import {translateProject} from '../project.mjs';import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';import {parseProgram} from '../semantic-meta.mjs';import {verifyTypedTargets} from './typed-targets.mjs';
const read=p=>readFileSync(repositorySourceURL(p,new URL('../../../',import.meta.url)),'utf8'),hash=s=>createHash('sha256').update(s).digest('hex'),tag=$=>Object.freeze({$});
export function originalClientKindProjection(){
 const sources={'src/clients.rs':read('src/clients.rs'),'src/route_contract.rs':read('src/route_contract.rs'),'src/route_contract_types.rs':read('src/route_contract_types.rs')},slices=[];
 const select=(path,predicate)=>sourceItems(sources[path]).filter(predicate).map(item=>{const text=sources[path].slice(item.start,item.end);slices.push({source:path,start:item.start,end:item.end,sha256:hash(text)});return text;}).join('\n');
 const clients=select('src/clients.rs',item=>item.term==='const'||['ClientKind','ClientIntegration','ClientIsolation'].includes(item.name)&&['enum','struct'].includes(item.term)||item.term==='impl'&&item.tokens.slice(0,item.tokens.findIndex(token=>token.text==='{')).some(token=>token.text==='ClientKind'));
 const kind=select('src/route_contract_types.rs',item=>item.term==='enum'&&item.name==='ServiceKind'),base=select('src/route_contract.rs',item=>item.term==='fn'&&item.name==='service_base_path');
 return {source:'use clap::ValueEnum;use std::fmt;\n'+clients+'\npub mod route_contract{\n'+kind+'\n'+base+'\n}',slices,inputs:Object.entries(sources).map(([path,source])=>({path,sha256:hash(source)}))};
}
test('exact original ClientKind dependency projection executes nine static-dependent methods in both targets',{timeout:60000},async()=>{
 const fixture=originalClientKindProjection(),result=translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>fixture.source,deriveDependencies:loadDeriveDependencyProof({manifest:read('Cargo.toml'),lock:read('Cargo.lock')})});
 assert.equal(fixture.inputs.find(item=>item.path==='src/clients.rs').sha256,'2f12c5aa34a65ec62b793902cdefe8f36c1b6c414c673e6499ef40c7dbfb8c2d');
 const program=parseProgram(JSON.stringify(result.meta.targetSemanticProgram)),aliases=[];
 for(const name of ['integration','command','display_name','dialect','token_env','base_url_env','setup_limitation','canonical_name','legacy_name']){assert.ok(result.meta.checkedMethods.some(item=>item.name==='ClientKind.'+name),name+': '+JSON.stringify(result.meta.refused));const entry=[...program.declarations.values()].find(entry=>entry.impl?.method===name);assert.ok(entry.sourceMethodProof.originalTokenTransformVerified);aliases.push(`export {${entry.fullName} as original_${name}};`);}
 const suffix='\n'+aliases.join('\n');await verifyTypedTargets({...result,javascript:result.javascript+suffix,typescript:result.typescript+suffix},(_api,_result,module)=>{
  for(const variant of ['Codex','ClaudeCode','Cursor','GeminiCli','GrokCli','Opencode','QwenCode','Agent']){const value=tag(variant),integration=module.original_integration(value);assert.equal(module.original_integration(value),integration);assert.deepEqual(integration.kind,value);assert.equal(module.original_command(value),integration.command);assert.equal(module.original_canonical_name(value),integration.command);assert.equal(module.original_display_name(value),integration.name);assert.equal(module.original_dialect(value),integration.dialect);for(const field of ['token_env','base_url_env','setup_limitation'])assert.deepEqual(module['original_'+field](value),integration[field]);assert.ok(Object.isFrozen(integration));}
  assert.equal(module.original_command(tag('ClaudeCode')),'claude');assert.equal(module.original_command(tag('Cursor')),'cursor-agent');assert.equal(module.original_legacy_name(tag('ClaudeCode')),'claude-code');assert.throws(()=>module.original_integration(tag('Unknown')),TypeError);
 },{childTimeoutMs:30000});
});
