// Independent role-byte export and physical relocation source cases. UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {join,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {exportFullAncillaryCompilerSourceVault} from '../full-ancillary-source-export-20261102.mjs';
import {readCompactSourceVaultDirectory} from '../compact-source-vault-store-20261102.mjs';
import {withCompactSourceVault} from '../compact-source-vault-20261102.mjs';
const SOURCE=fileURLToPath(new URL('../../../',import.meta.url));
const ROLE='translation/source-role-contract.json';
function temporary(t){const root=fs.realpathSync(fs.mkdtempSync(join(tmpdir(),'router-physical-role-receiving-')));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));return root;}
test('the complete committed compiler export retains explicit physical source-role DATA and every actual new producer/history source',{timeout:3600000,concurrency:false},t=>{
 const output=join(temporary(t),'vault'),result=exportFullAncillaryCompilerSourceVault({sourceRoot:SOURCE,output,extraPaths:[ROLE]});
 assert.equal(result.compilerQualified,false);assert.equal(result.completeReceivingClosure,false);
 const model=readCompactSourceVaultDirectory(output);
 try{withCompactSourceVault(model,reader=>{
  for(const name of [ROLE,'tools/translation/repository-layout.mjs','tools/translation/physical-language-output-layout-20261104.mjs','tools/translation/physical-language-output-layout-20261104-history.mjs','tools/translation/source-profiles/physical-language-output-adoption-20261104/equations.json','scripts/regenerate-js-first.mjs','tools/translation/js-to-rust/native-typescript.mjs'])assert.ok(reader.read(name).equals(fs.readFileSync(join(SOURCE,name))),'missing or changed physical producer source: '+name);
  const roles=JSON.parse(reader.read(ROLE));assert.equal(roles.installationAuthority,false);assert.equal(roles.semanticAuthority,false);return null;
 });}finally{model.volumes.length=0;model.metadata.files.length=0;model.metadata.objects.length=0;}
});
test('a relocated ordinary copy resolves all physical source labels from its receiving root without original-checkout imports',{timeout:60000,concurrency:false},t=>{
 const base=temporary(t),first=join(base,'first'),receiver=join(base,'moved 😀 receiving'),outside=join(base,'unrelated-cwd');fs.mkdirSync(first);fs.mkdirSync(outside);
 const put=(name,source)=>{fs.mkdirSync(dirname(join(first,name)),{recursive:true});fs.writeFileSync(join(first,name),source);};
 put('tools/translation/repository-layout.mjs',fs.readFileSync(join(SOURCE,'tools/translation/repository-layout.mjs')));put(ROLE,fs.readFileSync(join(SOURCE,ROLE)));
 put('Cargo.toml','[workspace]\nmembers=["rust"]\nresolver="3"\n');put('Cargo.lock','version = 4\n');put('rust/Cargo.toml','[package]\nname="receiving-layout"\nversion="0.1.0"\nedition="2024"\n');
 put('rust/src/lib.rs','pub fn marker()->bool{true}\n');put('js/src/marker.mjs','export const marker="authored JS";\n');put('ts/src/marker.ts','export const marker:string="authored TS";\n');put('tools/translation/meta/marker.json','{"sourceAuthority":false}\n');
 const originals=new Map(['rust/src/lib.rs','js/src/marker.mjs','ts/src/marker.ts','tools/translation/meta/marker.json'].map(name=>[name,fs.readFileSync(join(first,name))]));
 put('inspect.mjs',`import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {fileURLToPath} from 'node:url';import {repositoryRustLayout,rustPackageSourcePath,LANGUAGE_ROOTS} from './tools/translation/repository-layout.mjs';const root=fileURLToPath(new URL('./',import.meta.url));const layout=repositoryRustLayout(root);assert.equal(layout.manifest,'rust/Cargo.toml');assert.equal(layout.lock,'Cargo.lock');assert.equal(rustPackageSourcePath(root,'src/lib.rs'),'rust/src/lib.rs');assert.equal(rustPackageSourcePath(root,'js/src/marker.mjs'),'js/src/marker.mjs');assert.equal(rustPackageSourcePath(root,'ts/src/marker.ts'),'ts/src/marker.ts');assert.deepEqual(LANGUAGE_ROOTS,{javascript:'js',typescript:'ts',rust:'rust'});const roles=JSON.parse(readFileSync(new URL('./translation/source-role-contract.json',import.meta.url),'utf8'));assert.equal(roles.installationAuthority,false);assert.equal(roles.semanticAuthority,false);`);
 fs.renameSync(first,receiver);
 const env={...process.env};for(const name of ['NODE_OPTIONS','NODE_PATH','NODE_TEST_CONTEXT','ROUTER_NATIVE_TS_SOURCE_ROOT'])delete env[name];
 execFileSync(process.execPath,[join(receiver,'inspect.mjs')],{cwd:outside,env,timeout:20000,maxBuffer:1048576});
 assert.equal(fs.existsSync(first),false);assert.equal(fs.existsSync(join(receiver,'src')),false);assert.equal(fs.existsSync(join(receiver,'node_modules')),false);assert.equal(fs.existsSync(join(receiver,'ts/node_modules')),false);
 for(const [name,raw]of originals)assert.ok(fs.readFileSync(join(receiver,name)).equals(raw),'authored receiving source changed: '+name);
});
