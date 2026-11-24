import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,realpath,rm,mkdir,writeFile,readFile,stat,symlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {NativeRouter} from '../src/operations.mjs';
import {ProviderStore} from '../src/config.mjs';
async function fixture(t,{env={},oauth={},config={}}={}) {
  const dir=await realpath(await mkdtemp(join(tmpdir(),'router-credential-cli-')));t.after(()=>rm(dir,{recursive:true,force:true}));
  return {dir,router:new NativeRouter({config:{data_dir:join(dir,'data'),home:dir,...config},env:{HOME:dir,...env},oauth:{platform:'linux',...oauth}})};
}
test('credential status has no dependency on TOKEN_SECRET or TOKEN_SECRET_FILE',{timeout:60000},async t=> {
  const {dir,router}=await fixture(t,{env:{TOKEN_SECRET_FILE:'/missing/unrelated-secret'}});
  const result=await router.auth.status({local:true});assert.equal(result.success,true);assert.equal(result.data.credentials.length,4);assert.ok(result.data.credentials.every(row=>row.state==='absent'));
  assert.equal(router.corePromise,null);assert.deepEqual(result.data.api_key_providers,[]);
  await assert.rejects(stat(join(dir,'data','tokens.bin')),error=>error.code==='ENOENT');
});
test('clear removes every candidate file but never follows an adopted credential source or symlink',{timeout:60000},async t=> {
  const {dir,router}=await fixture(t);const home=join(dir,'.claude');await mkdir(home);
  const foreign=join(dir,'foreign.json');await writeFile(foreign,'foreign-token');
  for(const file of ['.credentials.json','credentials.json','auth.json','oauth.json'])await writeFile(join(home,file),JSON.stringify({_link_assistant_router:{credential_source:foreign}}));
  await symlink(foreign,join(home,'config.json'));
  const result=await router.auth.clear({provider:'claude',local:true});assert.equal(result.success,true);assert.equal(result.data.output.filter(line=>line.includes('removed')).length,5);
  assert.equal(await readFile(foreign,'utf8'),'foreign-token');assert.match(result.data.output.at(-1),/local credentials only/);
  const again=await router.auth.clear({provider:'claude',local:true});assert.ok(again.data.output.some(line=>line.includes('absent')));
});
test('multi-provider withdrawal requires confirmation before any mutation and reaches API-key providers',{timeout:60000},async t=> {
  const {dir,router}=await fixture(t,{env:{VENDOR_KEY:'environment-key'}});const data=join(dir,'data');
  const store=new ProviderStore({dataDir:data,secret:'credential-import-fixture-secret',env:{VENDOR_KEY:'environment-key'}});
  await store.install({name:'stored',base_url:'https://vendor.invalid',api_key:'private-stored-key'});
  await store.install({name:'environment',base_url:'https://vendor.invalid',api_key_env:'VENDOR_KEY'});
  await store.install({name:'no-credential',base_url:'https://vendor.invalid'});
  await mkdir(join(dir,'.codex'));await writeFile(join(dir,'.codex','auth.json'),'private-codex');
  await writeFile(join(data,'github-credential'),'private-github');
  const refused=await router.execute('auth.clear',{all:true,local:true});assert.equal(refused.success,false);assert.match(refused.diagnostics.join(),/require yes/);
  assert.equal(await readFile(join(data,'github-credential'),'utf8'),'private-github');assert.equal((await store.list()).length,3);
  const result=await router.auth.clear({all:true,yes:true,local:true});assert.equal(result.success,true);
  assert.deepEqual((await store.list()).map(row=>row.name),['no-credential']);
  assert.match(result.data.output.join('\n'),/VENDOR_KEY still holds/);assert.ok(!JSON.stringify(result).includes('environment-key'));assert.ok(!JSON.stringify(result).includes('private-stored-key'));
  await assert.rejects(stat(join(dir,'.codex','auth.json')),error=>error.code==='ENOENT');
});
test('remote or saved-selected withdrawals refuse without making a request or touching local credentials',{timeout:60000},async t=> {
  let requests=0;const {dir,router}=await fixture(t);router.options.fetch=()=>{requests++;throw Error('unexpected remote request');};
  const home=join(dir,'.codex');await mkdir(home);await writeFile(join(home,'auth.json'),'must-stay');
  for(const [name,options] of [['auth.clear',{provider:'codex'}],['auth.status',{clear_all:true,yes:true}],['auth.codex',{clear:true}]]) {
    const result=await router.execute(name,{...options,server:'https://deployment.invalid'});assert.equal(result.success,false);assert.match(result.diagnostics.join(),/selected remote deployment/);
  }
  const selection=join(dir,'.config','link-assistant-router');await mkdir(selection,{recursive:true});await writeFile(join(selection,'server.json'),JSON.stringify({server:'https://deployment.invalid'}));
  const saved=await router.execute('auth.clear',{provider:'codex'});assert.equal(saved.success,false);
  assert.equal(await readFile(join(home,'auth.json'),'utf8'),'must-stay');assert.equal(requests,0);
  await router.auth.clear({provider:'codex',local:true});await assert.rejects(stat(join(home,'auth.json')),error=>error.code==='ENOENT');
});
test('GitHub stdin/import/status use owner-only actual storage and host-selected mounted credentials',{timeout:60000},async t=> {
  const {dir,router}=await fixture(t,{env:{GITHUB_PROXY_BASE_URL:'https://github.enterprise.invalid/api/v3'}});
  const gh=join(dir,'gh');await mkdir(gh);await writeFile(join(gh,'hosts.yml'),'github.com:\n  oauth_token: public-host-token\ngithub.enterprise.invalid:\n  oauth_token: "enterprise-secret"\n');
  const imported=await router.auth.gh({from_gh_config:gh,local:true});assert.equal(imported.success,true);
  const path=join(dir,'data','github-credential');assert.equal(await readFile(path,'utf8'),'enterprise-secret');assert.equal((await stat(path)).mode&0o777,0o600);assert.ok(!JSON.stringify(imported).includes('enterprise-secret'));
  assert.match((await router.auth.gh({status:true,local:true})).data.output[0],/stored at/);
  await router.auth.gh({token_stdin:true,local:true},{stdin:' stdin-secret \n'});assert.equal(await readFile(path,'utf8'),'stdin-secret');
  const invalid=await router.execute('auth.gh',{token_stdin:true,local:true},{stdin:'bad\nsecret'});assert.equal(invalid.success,false);assert.equal(await readFile(path,'utf8'),'stdin-secret');
  await router.auth.gh({clear:true,local:true});assert.match((await router.auth.gh({status:true,local:true})).data.output[0],/absent/);
});
test('clear retains vendor Keychain ownership and reports an exact profile service without reading its secret',{timeout:60000},async t=> {
  const services=[];const {router}=await fixture(t,{env:{CLAUDE_CONFIG_DIR:'/isolated/profile'},oauth:{keychainHasEntry:async service=>{services.push(service);return true;}}});
  const result=await router.auth.clear({provider:'claude',local:true});assert.equal(services.length,1);assert.match(services[0],/^Claude Code-credentials-[a-f0-9]{8}$/);assert.match(result.data.output.join(),/vendor-owned Keychain entry/);
});
test('unremovable credentials produce a truthful failure while completed providers remain withdrawn',{timeout:60000},async t=> {
  const {dir,router}=await fixture(t);await mkdir(join(dir,'.claude','credentials.json'),{recursive:true});await writeFile(join(dir,'.claude','.credentials.json'),'removed-first');
  const result=await router.execute('auth.clear',{provider:'claude',local:true});assert.equal(result.success,false);assert.equal(result.exit_code,1);assert.match(result.data.output.join(),/withdrawal failed/);
  await assert.rejects(stat(join(dir,'.claude','.credentials.json')),error=>error.code==='ENOENT');assert.equal((await stat(join(dir,'.claude','credentials.json'))).isDirectory(),true);
});
