// Independent foreign Codex catalogue source. SOURCE ONLY; ALL CASES UNRUN.
import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm,symlink,stat} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join,dirname} from 'node:path';
import {clientPaths,optionalClientText} from '../src/client-files.mjs';
import {inspectCodexCatalogConstraint,removeCodexCatalogConstraint} from '../src/client-codex-catalog.mjs';
import {clientFileTransaction} from '../src/client-transaction.mjs';
import {applyGlobalClientConfiguration,undoGlobalClientConfiguration} from '../src/client-global.mjs';
import {repairGlobalClientConfiguration} from '../src/client-global-repair.mjs';
import {readGlobalClientState} from '../src/client-global-state.mjs';
import {executeNativeConfigure} from '../src/client-configure.mjs';
const limits={timeout:60000},models=[{id:'model-a',owned_by:'openai'}],endpoint='http://127.0.0.1:8080/api/services/codex/v1';
async function fixture(t){const home=await mkdtemp(join(tmpdir(),'router-codex-catalog-'));t.after(()=>rm(home,{recursive:true,force:true}));const env={HOME:home,PATH:''},paths=clientPaths('codex',{home,env}),catalog=join(home,'foreign-catalog.json');await mkdir(dirname(paths.config),{recursive:true});return {home,env,paths,catalog};}
async function seed(input,value,{relative=false}={}){const source='# preserve adjacent source 🦀\nmodel_catalog_json = '+JSON.stringify(relative?'foreign-catalog.json':input.catalog)+' # retire this override\ncustom = \'keep exactly\'\n[foreign]\nvalue="untouched"\n';await writeFile(input.paths.config,source);await writeFile(input.catalog,value);return source;}
test('actual regular JSON catalogue is observed fresh and only its TOML field is removed with complete source inverse',limits,async t=>{
 const input=await fixture(t),catalog='{ "models": [ {"slug":"foreign"} ] }\n',source=await seed(input,catalog),expected=await inspectCodexCatalogConstraint(input.paths);const result=await clientFileTransaction(input.paths,txn=>removeCodexCatalogConstraint(input.paths,txn,{expected}));assert.equal(result.changed,true);assert.equal(result.inverse,source);assert.deepEqual(result.stages,['language','repository']);assert.equal(result.sourceAuthority,false);assert.equal(result.semanticAuthority,false);const after=await readFile(input.paths.config,'utf8');assert.equal(after.includes('model_catalog_json'),false);assert.ok(after.includes('# preserve adjacent source 🦀'));assert.ok(after.includes("custom = 'keep exactly'"));assert.ok(after.includes('[foreign]\nvalue="untouched"'));assert.equal(await readFile(input.catalog,'utf8'),catalog);
});
test('relative catalogue paths honor the explicit invocation directory and an empty models array remains a valid constraint shape',limits,async t=>{
 const input=await fixture(t);await seed(input,'{"models":[]}',{relative:true});assert.equal((await inspectCodexCatalogConstraint(input.paths,{cwd:input.home})).path,input.catalog);await assert.rejects(inspectCodexCatalogConstraint(input.paths,{cwd:join(input.home,'missing-context')}));
});
for(const data of ['not JSON','{}','{"models":null}','{"models":{}}','[]'])test('invalid catalogue shape '+data+' preserves original files and fails before managed takeover',limits,async t=>{
 const input=await fixture(t),source=await seed(input,data);await assert.rejects(applyGlobalClientConfiguration(input.paths,endpoint,models));assert.equal(await readFile(input.paths.config,'utf8'),source);assert.equal(await readFile(input.catalog,'utf8'),data);assert.equal(await readGlobalClientState(input.paths),null);
});
test('missing directory numeric and oversized catalogue inputs refuse without touching config',limits,async t=>{
 const input=await fixture(t),source=await seed(input,'{"models":[]}');await rm(input.catalog);await assert.rejects(inspectCodexCatalogConstraint(input.paths));await mkdir(input.catalog);await assert.rejects(inspectCodexCatalogConstraint(input.paths),/regular/);await rm(input.catalog,{recursive:true});await writeFile(input.catalog,Buffer.alloc(8*1024*1024+1));await assert.rejects(inspectCodexCatalogConstraint(input.paths),/bound/);assert.equal(await readFile(input.paths.config,'utf8'),source);await writeFile(input.paths.config,'model_catalog_json=7\n');await assert.rejects(inspectCodexCatalogConstraint(input.paths),/file path string/);
});
test('catalogue file and ancestor symlinks remain explicit refusals',{...limits,skip:process.platform==='win32'},async t=>{
 const input=await fixture(t);await seed(input,'{"models":[]}');const actual=join(input.home,'actual.json');await writeFile(actual,'{"models":[]}');await rm(input.catalog);await symlink(actual,input.catalog);await assert.rejects(inspectCodexCatalogConstraint(input.paths),/symlink/);await rm(input.catalog);const actualDirectory=join(input.home,'actual-dir'),alias=join(input.home,'alias-dir');await mkdir(actualDirectory);await writeFile(join(actualDirectory,'catalog.json'),'{"models":[]}');await symlink(actualDirectory,alias);await writeFile(input.paths.config,'model_catalog_json='+JSON.stringify(join(alias,'catalog.json'))+'\n');await assert.rejects(inspectCodexCatalogConstraint(input.paths),/symlink/);
});
test('stale inspected catalogue DATA cannot authorize a later field removal',limits,async t=>{
 const input=await fixture(t),source=await seed(input,'{"models":[]}'),expected=await inspectCodexCatalogConstraint(input.paths);await writeFile(input.catalog,'{"models":[{"slug":"changed"}]}');await assert.rejects(clientFileTransaction(input.paths,txn=>removeCodexCatalogConstraint(input.paths,txn,{expected})),/changed/);assert.equal(await readFile(input.paths.config,'utf8'),source);
});
test('fresh global configure removes a validated override but exact undo restores it and its unrelated source',limits,async t=>{
 const input=await fixture(t),catalog='{"models":[]}',source=await seed(input,catalog);await applyGlobalClientConfiguration(input.paths,endpoint,models);assert.equal((await readFile(input.paths.config,'utf8')).includes('model_catalog_json'),false);await undoGlobalClientConfiguration(input.paths);assert.equal(await readFile(input.paths.config,'utf8'),source);assert.equal(await readFile(input.catalog,'utf8'),catalog);
});
test('global validation occurs before token minting process startup or config changes',limits,async t=>{
 const input=await fixture(t),source=await seed(input,'{"models":null}');let calls=0;await assert.rejects(executeNativeConfigure({options:{client:'codex',home:input.home,server:'https://remote.invalid'},core:{config:{data_dir:join(input.home,'.router')},clock:()=>42,tokens:{}},env:input.env,fetch:async()=>{calls++;throw Error('network must not run');}}),/models array/);assert.equal(calls,0);assert.equal(await readFile(input.paths.config,'utf8'),source);
});
test('catalogue removal and config takeover roll back to the original override on a later checkpoint failure',limits,async t=>{
 const input=await fixture(t),source=await seed(input,'{"models":[]}');await assert.rejects(applyGlobalClientConfiguration(input.paths,endpoint,models,{checkpoint:async phase=>{if(phase==='config')throw Error('injected');}}),/injected/);assert.equal(await readFile(input.paths.config,'utf8'),source);assert.equal(await readGlobalClientState(input.paths),null);
});
