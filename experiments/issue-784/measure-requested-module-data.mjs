// One complete real production graph and fresh derive issuer per process.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {resolveModuleGraph} from '../../tools/translation/project.mjs';
import {createDeriveFootprintContext} from '../../tools/translation/derive-footprints.mjs';
import {loadDeriveDependencyProof} from '../../tools/translation/derive-dependencies.mjs';
import {rustPackageSourcePath} from '../../tools/translation/repository-layout.mjs';
import {trackedSource} from '../../tools/translation/source-corpus.mjs';
import {PRODUCTION_PROFILE} from '../../tools/translation/cfg-profile.mjs';
import {writeCompleteEvidenceJson} from './complete-evidence-json.mjs';

const label=process.argv[2];
assert.match(label,/^(before|after)-(1|2)$/);assert.equal(process.argv.length,3);
const root=fileURLToPath(new URL('../../',import.meta.url));
const hash=value=>createHash('sha256').update(value).digest('hex');
const pathList=execFileSync('git',['ls-files','-z','--','*.rs'],{encoding:'utf8',maxBuffer:4194304}).split('\0').filter(Boolean);
const cargo={manifest:readFileSync(rustPackageSourcePath(root,'Cargo.toml'),'utf8'),lock:readFileSync(rustPackageSourcePath(root,'Cargo.lock'),'utf8')};
const dependencies=loadDeriveDependencyProof(cargo),inputs=new Map();
const started=performance.now();
const graph=resolveModuleGraph({entry:rustPackageSourcePath(root,'src/lib.rs'),paths:pathList,
 readSource:path=>{const source=trackedSource(root,path);inputs.set(path,source);return source;},
 compilationProfile:PRODUCTION_PROFILE});
const graphMilliseconds=performance.now()-started;
const context=createDeriveFootprintContext({modules:graph.modules,dependencies,compilationProfile:PRODUCTION_PROFILE});
const totalMilliseconds=performance.now()-started;
assert.ok(pathList.length>=804);assert.ok(graph.modules.length>100);
assert.ok(context.certificates.length>0);
// Compare the entire issued output. The first diagnostic tried to duplicate
// every graph CST in one JSON string and exhausted its unchanged 512 MiB heap.
// Complete physical sources and graph identities remain in the receipt below.
const raw=Buffer.from(JSON.stringify({context}));
const output=writeCompleteEvidenceJson('ci-logs/issue-784-restart-2/requested-module-data-'+label+'-output.json',raw);
const record={schema:'complete-production-derive-data-measurement-v1',label,
 graphMilliseconds,totalMilliseconds,modules:graph.modules.length,certificates:context.certificates.length,
 fullOutputSha256:hash(raw),fullOutputBytes:raw.length,output,
 inputs:[...inputs].map(([path,source])=>({path,source,sha256:hash(source)})),pathList,cargo,
 graph:{modules:graph.modules.map(module=>({file:module.file,path:module.path,
  sourceView:module.sourceView,configurationCondition:module.configurationCondition})),
  edges:graph.edges,diagnostics:graph.diagnostics},
 compilerSources:['source-module-views.mjs','derive-footprints.mjs'].map(name=>{const path='tools/translation/'+name;const source=readFileSync(path,'utf8');return {path,source,sha256:hash(source)};}),
 typescriptVersion:JSON.parse(readFileSync('js/node_modules/typescript/package.json')).version,
 command:process.argv,originalDeadlinesQualified:false,newExecutableFunctions:0};
const receipt=writeCompleteEvidenceJson('ci-logs/issue-784-restart-2/requested-module-data-'+label+'-receipt.json',Buffer.from(JSON.stringify(record)));
console.log(JSON.stringify({label,graphMilliseconds,totalMilliseconds,modules:record.modules,
 certificates:record.certificates,fullOutputBytes:raw.length,fullOutputSha256:hash(raw),receipt}));
