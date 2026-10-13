import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {translateProject} from '../project.mjs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
const root=new URL('../../../',import.meta.url),hash=text=>createHash('sha256').update(text).digest('hex'),read=file=>readFileSync(new URL(file,root),'utf8');
const dependencies=loadDeriveDependencyProof({manifest:read('Cargo.toml'),lock:read('Cargo.lock')});
const original=file=>{const source=read(file),result=translateProject({entry:file,paths:[file],readSource:()=>source,deriveDependencies:dependencies,compilationProfile:PRODUCTION_PROFILE});assert.equal(result.meta.sources.find(row=>row.source===file).sha256,hash(source));return result;};
test('the two original whole-file bridge controls gain ordinary functions rather than generated source owners',()=>{
  const result=original('src/bridge_controls.rs');for(const name of ['untranslatable_moderation','untranslatable_chat_prediction']){assert.ok(result.meta.executable.some(row=>row.name===name&&row.term==='fn'));assert.equal(result.meta.refused.some(row=>row.name===name),false);}assert.equal(result.meta.runtimeParity,false);assert.ok(result.meta.refused.some(row=>row.name==='validate_responses_resource_selectors'));
});
test('remaining original borrowed aggregate and anonymous conversion contexts retain explicit barriers',()=>{
  const result=original('src/bridge_request.rs'),refusal=result.meta.refused.find(row=>row.name==='untranslatable_responses_state');assert.ok(refusal);assert.match(refusal.message,/source conversion namespace.*anonymous trait/u);assert.equal(result.meta.executable.some(row=>row.name==='untranslatable_responses_state'),false);
  const safety=original('src/safety_identifier.rs');for(const name of ['validate_openai_value','validate_openai_user_value','anthropic_user_id'])assert.ok(safety.meta.refused.some(row=>row.name===name));
});
test('original GitHub conversion does not waive derive namespace or later Default obligations',()=>{
  const result=original('src/github_proxy.rs');assert.ok(result.meta.refused.some(row=>row.name.endsWith('with_credential')||row.name.endsWith(Buffer.from('with_credential').toString('hex'))));assert.equal(result.meta.checkedMethods.some(row=>row.name==='GitHubProxyConfig.with_credential'),false);
});
