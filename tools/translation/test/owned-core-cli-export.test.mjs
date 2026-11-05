// Independent bounded CLI and offline receiving SOURCE. Every case is unrun.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,mkdtempSync,writeFileSync,rmSync,symlinkSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {sourceUnitArguments,performSourceUnitSynchronization} from '../../../scripts/router-owned-core-stages.mjs';
import {exportPartitionedTranslatorBundle} from '../partitioned-export-bundle.mjs';
import {prepareOwnedCoreCliSources} from '../prepare-owned-core-cli-sources.mjs';
import {repositorySourceURL,repositoryWorkspaceManifestURL} from './fixtures/repository-paths.mjs';
import {TEXT_NATIVE_SOURCE} from '../text-native-source.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE,ROUTER_CORE_PRIMITIVES_SOURCE,ROUTER_CORE_RANGES_SOURCE,ROUTER_CORE_BASE64_SOURCE,ROUTER_CORE_JSON_COLLECTIONS_SOURCE} from '../router-core-source-data.mjs';
const limits={timeout:60000},root=fileURLToPath(new URL('../../../',import.meta.url));
test('explicit proposal and review arguments retain stages paths and unknown/duplicate refusal',()=>{
 const proposal=sourceUnitArguments(['--mode','propose','--output','./packets','--root','./receiving','--stages','text-methods,primitives']);assert.equal(proposal.mode,'propose');assert.deepEqual(proposal.stages,['text-methods','primitives']);assert.ok(proposal.root.endsWith('/receiving'));assert.ok(proposal.output.endsWith('/packets'));assert.equal(sourceUnitArguments(['--mode','review','--output','./packets']).mode,'review');
 for(const args of [['--mode','propose','--output','packets'],['--mode','review','--output','packets','--stages','primitives'],['--mode','review','--mode','review','--output','packets'],['constructor','x','--mode','review','--output','packets'],['--mode','propose','--output','packets','--stages','primitives,primitives'],['--mode','propose','--output','packets','--stages',',primitives']])assert.throws(()=>sourceUnitArguments(args));
});
test('direct worker refuses a mode outside its actual fixed proposal/review APIs',async()=>{
 const before=process.env.ROUTER_NATIVE_TS_SOURCE_ROOT;try{await assert.rejects(performSourceUnitSynchronization({root,output:'unused',mode:'unknown'}),/Explicit propose\/review/u);}finally{if(before===undefined)delete process.env.ROUTER_NATIVE_TS_SOURCE_ROOT;else process.env.ROUTER_NATIVE_TS_SOURCE_ROOT=before;}
});
test('complete offline export contains the CLI and runs original source proposal/readback from receiving cwd',limits,t=>{
 const directory=mkdtempSync(join(tmpdir(),'router-owned-cli-receiving-'));t.after(()=>rmSync(directory,{recursive:true,force:true}));const exported=exportPartitionedTranslatorBundle({sourceRoot:root,output:join(directory,'compiler')}),paths=new Set(exported.manifest.inputs.map(row=>row.path));
 for(const path of ['scripts/router-owned-core-stages.mjs','tools/translation/source-bound-owned-core-bulk.mjs','tools/translation/source-bound-owned-core-context.mjs','tools/translation/source-bound-owned-packet-readback.mjs','tools/translation/source-bound-owned-migrate-core-text-methods.mjs','tools/translation/source-profiles/owned-core-cli/complete-originals-and-rules.json.gz'])assert.ok(paths.has(path),path);assert.equal(exported.manifest.runtimeParity,false);
 const project=join(directory,'receiving'),output=join(directory,'packets'),files={'Cargo.toml':readFileSync(repositoryWorkspaceManifestURL(new URL('../../../',import.meta.url)),'utf8'),'rust/Cargo.toml':readFileSync(repositorySourceURL('Cargo.toml',new URL('../../../',import.meta.url)),'utf8'),'Cargo.lock':readFileSync(repositorySourceURL('Cargo.lock',new URL('../../../',import.meta.url)),'utf8'),'rust/src/lib.rs':'pub mod translation_core;pub mod translation_text_core;#[rustfmt::skip]pub fn blank(value:&str)->bool{value.trim().is_empty()}','rust/src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'rust/src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'rust/src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE,'rust/src/translation_core/base64.rs':ROUTER_CORE_BASE64_SOURCE,'rust/src/translation_core/json_collections.rs':ROUTER_CORE_JSON_COLLECTIONS_SOURCE,'rust/src/translation_text_core.rs':TEXT_NATIVE_SOURCE};for(const [path,text]of Object.entries(files)){mkdirSync(dirname(join(project,path)),{recursive:true});writeFileSync(join(project,path),text);}mkdirSync(join(project,'js'));const require=createRequire(join(root,'js/package.json'));symlinkSync(join(require.resolve('typescript/package.json'),'../..'),join(project,'js/node_modules'),'dir');
 const cli=join(exported.destination,'scripts/router-owned-core-stages.mjs'),run=args=>JSON.parse(execFileSync(process.execPath,[cli,...args],{cwd:project,env:{...process.env,ROUTER_NATIVE_TS_SOURCE_ROOT:project},encoding:'utf8',timeout:20000,maxBuffer:8*1024*1024}));
 const proposed=run(['--mode','propose','--output',output,'--stages','text-methods']),review=run(['--mode','review','--output',output]);assert.equal(proposed.complete,true);assert.equal(proposed.applicationSourcesInstalled,false);assert.equal(review.complete,true);assert.equal(review.wholeOriginalProducersReexecuted,true);assert.equal(review.semanticAdmission,false);assert.equal(review.executableCoverageGain,null);for(const [path,text]of Object.entries(files))assert.equal(readFileSync(join(project,path),'utf8'),text);
});
test('complete CLI worker original entrypoint and source histories retain both phases and inverse',limits,()=>{
 const plan=prepareOwnedCoreCliSources();assert.equal(plan.files.length,3);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.semanticAuthority,false);assert.equal(plan.receivingExecuted,false);
});
