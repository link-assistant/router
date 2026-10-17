import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {translateProject} from '../project.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {parseProgram} from '../semantic-meta.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
const root=new URL('../../../',import.meta.url),hash=value=>createHash('sha256').update(value).digest('hex');
const read=path=>readFileSync(new URL(path,root),'utf8');
const tag=($,fields={})=>Object.freeze({$,...fields});

test('untouched whole ClientKind source checks its Copy receiver and actual function-name shadowing',{timeout:60_000},async()=>{
  const source=read('src/clients.rs');assert.equal(hash(source),'2f12c5aa34a65ec62b793902cdefe8f36c1b6c414c673e6499ef40c7dbfb8c2d');
  const deriveDependencies=loadDeriveDependencyProof({manifest:read('Cargo.toml'),lock:read('Cargo.lock')}),paths=execFileSync('git',['ls-tree','-r','--name-only','HEAD','--','src'],{cwd:root,encoding:'utf8'}).trim().split('\n');
  const result=translateProject({entry:'src/clients.rs',paths,readSource:read,deriveDependencies,compilationProfile:PRODUCTION_PROFILE});
  assert.equal(result.meta.sources.find(entry=>entry.source==='src/clients.rs').sha256,hash(source));
  const program=parseProgram(JSON.stringify(result.meta.targetSemanticProgram)),aliases=[];
  for(const name of ['from_str_opt','legacy_name']){const method=result.meta.checkedMethods.find(entry=>entry.name==='ClientKind.'+name);assert.ok(method);const own=[...program.declarations.values()].find(entry=>entry.impl?.method===name);assert.ok(own);assert.equal(own.sourceMethodProof.originalTokenTransformVerified,true);if(name==='legacy_name')assert.equal(own.impl.copyCertificate.verified,true);aliases.push(`export {${own.fullName} as original_${name}};`);}
  assert.equal(result.meta.checkedMethods.some(entry=>entry.name==='ClientKind.integration'),false);
  const suffix='\n'+aliases.join('\n');
  await verifyTypedTargets({...result,javascript:result.javascript+suffix,typescript:result.typescript+suffix},(_api,_result,module)=>{
    for(const [variant,canonical,legacy]of [['Codex','codex','codex'],['ClaudeCode','claude','claude-code'],['Cursor','cursor-agent','cursor'],['GeminiCli','gemini','gemini-cli'],['GrokCli','grok','grok-cli'],['Opencode','opencode','opencode'],['QwenCode','qwen','qwen-code'],['Agent','agent','agent']]){assert.deepEqual(module.original_from_str_opt(canonical),tag('Some',{field0:tag(variant)}));assert.deepEqual(module.original_from_str_opt(legacy),tag('Some',{field0:tag(variant)}));assert.deepEqual(module.original_from_str_opt(' \t'+canonical.toUpperCase()+'\n '),tag('Some',{field0:tag(variant)}));assert.equal(module.original_legacy_name(tag(variant)),legacy);}
    for(const value of ['',' unknown ','CLAUDE😀','claude—code'])assert.deepEqual(module.original_from_str_opt(value),tag('None'));
    assert.throws(()=>module.original_from_str_opt(3n),TypeError);assert.throws(()=>module.original_legacy_name(tag('Wrong')),TypeError);assert.throws(()=>module.original_legacy_name({$:'Codex'}),TypeError);
  },{childTimeoutMs:20000});
});
