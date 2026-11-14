// Whole current production parents and their module descendants; diagnostic
// metadata only. The optional, explicitly labeled original-root projection
// retains both actual module declarations. Neither mode qualifies whole-crate
// execution, newly executable production functions or parity.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {translateProject} from '../../tools/translation/project.mjs';
import {loadDeriveDependencyProof} from '../../tools/translation/derive-dependencies.mjs';
import {PRODUCTION_PROFILE} from '../../tools/translation/cfg-profile.mjs';
import {sourceItems} from '../../tools/translation/rust-structure.mjs';
import {repositoryCratePaths,repositorySourceURL,repositorySourcePath} from '../../tools/translation/test/fixtures/repository-paths.mjs';

const root=new URL('../../',import.meta.url),entry=process.argv[2];
assert.ok(['src/output_limit.rs','src/usage.rs','src/vk.rs','src/stream_termination.rs'].includes(entry));
const hash=text=>createHash('sha256').update(text).digest('hex');
const read=path=>{
 try{return readFileSync(repositorySourceURL(path,root),'utf8');}
 catch(error){if(error.code!=='ENOENT')throw error;return execFileSync('git',['show','HEAD:'+repositorySourcePath(path,root)],{cwd:root,encoding:'utf8',maxBuffer:10000000});}
};
const paths=repositoryCratePaths(execFileSync('git',['ls-tree','-r','--name-only','HEAD','--',repositorySourcePath('src',root)],{cwd:root,encoding:'utf8'}).trim().split('\n'),root);
const projected=process.argv[3]==='--source-root-projection';
assert.ok(process.argv[3]===undefined||projected);
const originalRoot=read('src/lib.rs'),owner=entry.slice(4,-3);
const declarations=sourceItems(originalRoot).filter(row=>row.term==='mod'&&['translation_core',owner].includes(row.name));
assert.equal(declarations.length,2);
const projection=declarations.map(row=>originalRoot.slice(row.start,row.end)).join('\n');
const readSource=path=>projected&&path==='src/lib.rs'?projection:read(path);
console.log(JSON.stringify({phase:'whole-parent-start',entry,wholeSourceSha256:hash(read(entry)),listedPaths:paths.length,rootProjection:projected,originalRootSha256:hash(originalRoot),projectedRootSha256:projected?hash(projection):null}));
const result=translateProject({entry:projected?'src/lib.rs':entry,paths,readSource,deriveDependencies:loadDeriveDependencyProof({manifest:read('Cargo.toml'),lock:read('Cargo.lock')}),compilationProfile:PRODUCTION_PROFILE});
for(const row of result.meta.sources)assert.equal(row.sha256,hash(readSource(row.source)));
console.log(JSON.stringify({phase:'whole-parent-result',entry,rootProjection:projected,productionGainQualified:false,sources:result.meta.sources,refused:result.meta.refused,executable:result.meta.executable,checkedMethods:result.meta.checkedMethods,runtimeParity:result.meta.runtimeParity}));
