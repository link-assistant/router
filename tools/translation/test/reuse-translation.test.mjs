import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {copyFileSync,cpSync,mkdirSync,mkdtempSync,readFileSync,readdirSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';

const root=fileURLToPath(new URL('../../../',import.meta.url));
test('source-only relocated bulk translator regenerates a separate tracked repository and executes both targets',async()=>{
  const directory=mkdtempSync(join(tmpdir(),'router-translator-reuse-'));
  try {
    const bundle=join(directory,'source-bundle'),repository=join(directory,'destination');
    mkdirSync(join(bundle,'scripts'),{recursive:true});mkdirSync(join(bundle,'tools/translation'),{recursive:true});mkdirSync(join(repository,'src'),{recursive:true});
    copyFileSync(join(root,'scripts/translate-router.mjs'),join(bundle,'scripts/translate-router.mjs'));
    for(const name of readdirSync(join(root,'tools/translation')))if(name.endsWith('.mjs'))copyFileSync(join(root,'tools/translation',name),join(bundle,'tools/translation',name));
    for(const name of ['extensions','vendor'])cpSync(join(root,'tools/translation',name),join(bundle,'tools/translation',name),{recursive:true});
    cpSync(join(root,'tools/translation/source-profiles'),join(bundle,'tools/translation/source-profiles'),{recursive:true});
    for(const path of [bundle,repository])writeFileSync(join(path,'package.json'),'{"type":"module"}\n');
    const source='mod values; mod relay;\npub fn cap(value: u64) -> u64 { if value < 10 { value } else { 10 } }\npub fn identity(value: &serde_json::Value) -> &serde_json::Value { value }\npub fn bounded(value: std::time::Duration) -> std::time::Duration { value.min(std::time::Duration::from_secs(10)) }\npub fn normalize(value: u8) -> u8 { relay::normalize(value) }\n';
    writeFileSync(join(repository,'src/lib.rs'),source);
    writeFileSync(join(repository,'src/values.rs'),'pub const LIMIT:u8=9; pub fn allowed(value:u8)->bool{value<LIMIT}\n');
    writeFileSync(join(repository,'src/relay.rs'),'pub use crate::values::*; pub fn normalize(value:u8)->u8{if allowed(value){value}else{LIMIT}}\n');
    writeFileSync(join(repository,'untracked.rs'),'pub fn invisible() -> bool { true }');
    writeFileSync(join(repository,'Cargo.toml'),'[package]\nname="independent-fixture"\nversion="0.1.0"\nedition="2024"\n[dependencies]\nserde_json="1"\n');
    execFileSync('git',['init','--quiet'],{cwd:repository,stdio:'pipe'});
    execFileSync('git',['add','--force','src/lib.rs','src/values.rs','src/relay.rs'],{cwd:repository,stdio:'pipe'});
    const script=join(bundle,'scripts/translate-router.mjs');
    const run=extra=>JSON.parse(execFileSync(process.execPath,[script,'--root',repository,...extra],{encoding:'utf8',maxBuffer:1024*1024}));
    const written=run([]),checked=run(['--check']);
    assert.equal(written.sources,3);assert.equal(written.executableFunctions,6);assert.equal(checked.mode,'check');
    assert.equal(written.projects[0].executableFunctions,6);assert.equal(written.projects[0].moduleEdges,2);assert.equal(written.runtimeParity,false);
    const projectMeta=JSON.parse(readFileSync(join(repository,'tools/translation/projects/src/lib.meta.json'),'utf8'));
    assert.equal(projectMeta.deriveDependencyProfile.available,false);assert.equal(projectMeta.deriveDependencyProfile.digest,null);assert.equal(projectMeta.deriveDependencyProfile.diagnostics[0].kind,'unsupported-profile');
    const meta=JSON.parse(readFileSync(join(repository,'tools/translation/meta/src/lib.meta.json'),'utf8'));
    assert.equal(meta.items.map(item=>item.source).join(''),source);
    const javascript=join(repository,'packages/javascript/generated/rust-draft/src/lib.mjs');
    const text=readFileSync(javascript,'utf8');assert.equal(text.includes(bundle),false);assert.equal(text.includes(root),false);
    const js=await import(pathToFileURL(javascript));
    const generated=join(repository,'packages/typescript/generated'),draft=join(generated,'rust-draft'),project=join(generated,'rust-project'),compiled=join(repository,'compiled');
    const args=['--strict','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext','--skipLibCheck','--rootDir',generated,'--outDir',compiled,...['lib','values','relay'].map(name=>join(draft,'src/'+name+'.ts')),join(project,'src/lib.ts')];
    if(process.env.ROUTER_TRANSLATION_TSC)execFileSync(process.env.ROUTER_TRANSLATION_TSC,args,{stdio:'pipe'});
    else {
      const require=createRequire(join(root,'packages/javascript/package.json'));
      let compiler;
      try {compiler=require.resolve('typescript/bin/tsc');}
      catch(error){if(error.code!=='MODULE_NOT_FOUND')throw error;}
      if(compiler)execFileSync(process.execPath,[compiler,...args],{stdio:'pipe'});
      else execFileSync('tsc',args,{stdio:'pipe'});
    }
    for(const tree of ['rust-draft','rust-project'])cpSync(join(generated,tree,'runtime'),join(compiled,tree,'runtime'),{recursive:true});
    const ts=await import(pathToFileURL(join(compiled,'rust-draft/src/lib.js')));
    for(const target of [js,ts]) {
      assert.deepEqual(Object.keys(target.translated).sort(),['bounded','cap','identity','normalize']);
      assert.equal(target.translated.cap(9n),9n);assert.equal(target.translated.cap(18446744073709551615n),10n);
      assert.throws(()=>target.translated.cap(18446744073709551616n),RangeError);
      const value=Object.freeze({$:'Null'});assert.equal(target.translated.identity(value),value);
      assert.throws(()=>target.translated.identity({value:null}),TypeError);
      assert.deepEqual(target.translated.bounded(Object.freeze({$:'Duration',secs:11n,nanos:1n})),{$:'Duration',secs:10n,nanos:0n});
      assert.deepEqual(target.translated.bounded(Object.freeze({$:'Duration',secs:9n,nanos:999999999n})),{$:'Duration',secs:9n,nanos:999999999n});
      assert.throws(()=>target.translated.bounded(Object.freeze({$:'Duration',secs:0n,nanos:1000000000n})),RangeError);
      assert.equal(target.translated.normalize(8n),8n);assert.equal(target.translated.normalize(10n),9n);
      assert.throws(()=>target.translated.normalize(256n),RangeError);
      assert.equal(target.provenance.runtimeParity,false);
    }
    for(const path of [join(repository,'packages/javascript/generated/rust-project/src/lib.mjs'),join(compiled,'rust-project/src/lib.js')]) {
      const target=await import(pathToFileURL(path));
      assert.equal(target.translated.normalize(2n),2n);assert.equal(target.translated['relay.normalize'](20n),9n);
      assert.equal(target.translated['values.allowed'](8n),true);assert.equal(target.translated['values.allowed'](9n),false);
      assert.equal(target.translated['values.LIMIT'],9n);
    }
    for(const name of ['rust-marker-1.89.0.rs.gz','rust-fmt-1.89.0.rs.gz','rust-path-1.89.0.rs.gz']) {
      const archive=join(bundle,'tools/translation/source-profiles/copy-standard',name),original=readFileSync(archive),changed=Buffer.from(original);
      changed[0]^=1;writeFileSync(archive,changed);
      try {assert.throws(()=>run(['--check']),/Copy trait source archive checksum mismatch/);}
      finally {writeFileSync(archive,original);}
    }
  } finally {rmSync(directory,{recursive:true,force:true});}
});
