import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createRouterCore} from '../src/core.mjs';
import {withAuthenticationScope,EmergencyAuthentication,normalizeEmergencyConfig} from '../src/emergency-auth.mjs';
async function fixture(t,extra={}) {
  const directory=await mkdtemp(join(tmpdir(),'router-emergency-auth-'));t.after(()=>rm(directory,{recursive:true,force:true}));let now=1000;
  const core=await createRouterCore({env:{},clock:()=>now,config:{token_secret:'independent-emergency-signing-authority',storage_policy:'memory',data_dir:directory,...extra}});
  return {core,advance:seconds=>{now+=seconds;}};
}
test('emergency mode stays opt-in, bounded, and acknowledged on every non-loopback listener',async t=>{
  const {core}=await fixture(t);assert.equal(core.emergency.status().active,false);
  await assert.rejects(core.authenticate('foreign'),error=>error.code === 'invalid_prefix');
  assert.throws(()=>normalizeEmergencyConfig({emergency_accept_any_token:true,emergency_duration_minutes:1441}));
  assert.equal(normalizeEmergencyConfig({}, {EMERGENCY_ACCEPT_ANY_TOKEN:'typo'}).enabled,false);
  const live=new EmergencyAuthentication({config:{enabled:true,duration_minutes:60,allow_non_loopback:false},clock:()=>1000});
  live.checkListeners(['127.0.0.1','::1','::ffff:127.0.0.2']);assert.throws(()=>live.checkListeners(['127.0.0.1','0.0.0.0']));
  await assert.rejects(fixture(t,{emergency_accept_any_token:true,host:'0.0.0.0'}),error=>error.code === 'invalid_emergency_config');
});
test('bypassed valid, revoked, malformed, foreign and expired credentials never mutate durable authority',async t=>{
  const {core}=await fixture(t,{emergency_accept_any_token:true});
  const token=await core.tokens.issue({ttl_hours:1,max_requests:1,max_tokens:1,client_kind:'codex',principal_id:'subscriber',account:'subscriber',model_policy:{allowed_models:['pinned']}});
  await core.tokens.revoke(token.id);const before=await core.tokens.list();
  for (const carrier of [token.token,'foreign','la_sk_corrupt','at-corrupt']) {
    const claims=await core.authenticate(carrier,{model:'outside',headers:new Headers({'x-goog-api-key':carrier})});
    assert.ok(claims.sub.startsWith('emergency-bypass-'));assert.equal(claims.client_kind,'gemini');assert.equal(claims.scope,'');assert.equal(claims.is_admin,false);
    await core.tokens.enforceRequestBudget(claims.sub,100);await core.tokens.recordUsage(claims.sub,100);
    assert.deepEqual(await core.tokens.authorizeModel(claims.sub,'outside'),{});assert.equal(await core.tokens.renewRunLease(claims.sub),1120);
  }
  assert.deepEqual(await core.tokens.list(),before);assert.equal(core.emergency.status().bypassed_requests,4);
  assert.ok(!JSON.stringify(core.emergency.status()).includes(token.token));
  await assert.rejects(core.authenticate(token.token,{admin:true}),error=>error.code === 'revoked');
  await assert.rejects(core.authenticate('foreign',{admin:true}),error=>error.code === 'invalid_prefix');
});
test('absent credentials remain rejected and bypass ends immediately on disable or configured lapse',async t=>{
  const {core,advance}=await fixture(t,{emergency_accept_any_token:true,emergency_duration_minutes:1});
  await assert.rejects(core.authenticate(''),error=>error.code === 'missing_credential');assert.equal(core.emergency.status().bypassed_requests,0);
  await core.authenticate('foreign');advance(60);assert.equal(core.emergency.status().active,false);await assert.rejects(core.authenticate('foreign'));
  const second=await fixture(t,{emergency_accept_any_token:true});assert.equal(second.core.emergency.disable(),true);assert.equal(second.core.emergency.disable(),false);await assert.rejects(second.core.authenticate('foreign'));
});
test('one request scope counts one authentication outcome and diagnostics retain bounded fingerprints',async t=>{
  const {core}=await fixture(t,{emergency_accept_any_token:true});
  await withAuthenticationScope(async()=>{await core.authenticate('foreign');await core.authenticate('foreign');await core.authenticate('foreign');});
  assert.equal(core.emergency.status().bypassed_requests,1);assert.equal(core.emergency.status().bypassed_by_reason.invalid_prefix,1);
  core.emergency.disable();
  await withAuthenticationScope(async()=>{for (let i=0;i<3;i++) await assert.rejects(core.authenticate('foreign'));});
  assert.equal(core.diagnostics.snapshot().failures_by_reason.invalid_prefix,1);
  for (let i=0;i<70;i++) await assert.rejects(core.authenticate(`private-credential-${i}`));
  const diagnostics=core.diagnostics.snapshot();assert.equal(diagnostics.recent_failures.length,64);assert.ok(!JSON.stringify(diagnostics).includes('private-credential'));
  assert.match(core.emergency.renderPrometheus(),/link_assistant_emergency_auth_active 0/);assert.match(core.diagnostics.renderPrometheus(),/invalid_prefix/);
});
test('request headers determine emergency client binding before unverified token hints',async t=>{
  const {core}=await fixture(t,{emergency_accept_any_token:true});
  const payload=Buffer.from(JSON.stringify({client_kind:'codex',principal_id:'preserved-principal'})).toString('base64url'),token=`at-ignored.${payload}.ignored`;
  const gemini=await core.authenticate(token,{headers:new Headers({'x-goog-api-client':'gl-node'})});assert.equal(gemini.client_kind,'gemini');assert.equal(gemini.principal_id,'preserved-principal');
  const explicit=await core.authenticate(token,{headers:new Headers({'x-link-assistant-client':'qwen-code','user-agent':'codex_cli'})});assert.equal(explicit.client_kind,'qwen');
  const fallback=await core.authenticate(token);assert.equal(fallback.client_kind,'codex');
});
