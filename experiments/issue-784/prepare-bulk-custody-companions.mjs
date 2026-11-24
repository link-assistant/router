// Review actual producer bytes before installing a complete companion batch.
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import {prepareBulkDraftCustody} from '../../tools/translation/prepare-bulk-draft-custody.mjs';
import {deriveRetainedBulkSources} from '../../tools/translation/prepare-retained-bulk.mjs';
import {deriveOwnedDefinitionBulkSources} from '../../tools/translation/prepare-owned-definition-bulk.mjs';
import {transportConcreteNamedSourcePhases} from '../../tools/translation/concrete-source-origin-phases.mjs';
import {verifyNativeCopiedModuleBindings} from '../../tools/translation/source-copy-native-bindings.mjs';
import {ownershipCompiler} from '../../tools/translation/js-to-rust/vendor/module-syntax.mjs';
import {proposeMatrixDraftWorkflow} from '../../scripts/prepare-matrix-draft-workflow.mjs';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const ts=ownershipCompiler(),proposal=prepareBulkDraftCustody();
const bulk=proposal.originals.find(row=>row.path==='tools/translation/bulk.mjs').source;
const matrix=readFileSync('tools/translation/matrix-bulk.mjs','utf8');
const retained=deriveRetainedBulkSources({bulk,matrix});
const definitions=deriveOwnedDefinitionBulkSources({bulk,matrix});
const sources=[...proposal.originals.map(row=>({path:row.path,after:row.source})),
 {path:'tools/translation/retained-bulk.mjs',after:retained.bulk.text},
 {path:'tools/translation/retained-matrix-bulk.mjs',after:retained.matrix.text},
 ...definitions.files.map(row=>({path:row.path,after:row.text}))];
for(const row of sources){
 const original=execFileSync('git',['show','11aca637da6ba73c021ddc60e81badc7cb26e4a7^:'+row.path],{encoding:'utf8',maxBuffer:1048576});
 if(row.after!==original)throw Error('Genuine producer differs from complete predecessor: '+row.path);
}
const files=[...sources,...proposal.files.map(row=>({path:row.path,after:row.after}))];
for(const row of files){
 row.existed=existsSync(row.path);row.before=row.existed?readFileSync(row.path,'utf8'):'';
 row.beforeSha256=hash(row.before);row.afterSha256=hash(row.after);
 if(ts.createSourceFile(row.path,row.after,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS).parseDiagnostics.length)throw Error('Complete companion grammar differs');
 const [equation]=transportConcreteNamedSourcePhases([{before:row.before,middle:row.after,after:row.after,language:'JavaScript',rules:['javascript:preserve-complete-original-and-companion-source','router:keep-custody-outside-original-source-consumers','javascript:restore-complete-installed-predecessor','router:restore-original-source-paths']}]);
 if(equation.inverse!==row.before)throw Error('Complete source inverse differs');
 row.equation=equation;
}
const bindings=verifyNativeCopiedModuleBindings(ts,files.map(row=>({path:resolve(row.path),source:row.after})));
for(const [at,row]of files.entries())row.nativeBindings=bindings[at];
const workflow=proposeMatrixDraftWorkflow(),workflowPath='.github/workflows/javascript-first.yml';
const before=readFileSync(workflowPath,'utf8');
if(before.replace('node scripts/translate-router.mjs --check','node scripts/translate-router-with-draft-custody.mjs --check')!==workflow.after)throw Error('Complete workflow companion equation differs');
files.push({path:workflowPath,existed:true,before,after:workflow.after,workflow});
const record={schema:'reviewed-complete-bulk-custody-companions-v1',typescriptVersion:ts.version,
 proposal,retained,definitions,files,originalSourceBodiesRestored:true,semanticAuthority:false,
 fullGatePassed:false,runtimeParity:false,newlyExecutableProductionFunctions:0};
const raw=Buffer.from(JSON.stringify(record)),packed=gzipSync(raw);
if(raw.length>64*1024*1024)throw Error('Complete finite companion proposal bound');
const path='ci-logs/issue-784-restart-2/current-bulk-companions-proposal.json.gz';
writeFileSync(path,packed,{flag:'wx'});
if(!gunzipSync(readFileSync(path),{maxOutputLength:64*1024*1024}).equals(raw))throw Error('Complete proposal readback differs');
for(const row of files)if(existsSync(row.path)!==row.existed||(row.existed&&readFileSync(row.path,'utf8')!==row.before))throw Error('Physical source changed before installation');
for(const row of files)if(row.before!==row.after)writeFileSync(row.path,row.after);
for(const row of files)if(readFileSync(row.path,'utf8')!==row.after)throw Error('Complete installed source differs');
console.log(JSON.stringify({schema:record.schema,typescriptVersion:ts.version,
 files:files.map(({path,beforeSha256,afterSha256})=>({path,beforeSha256,afterSha256})),
 proposal:path,storedBytes:packed.length,decodedBytes:raw.length,sha256:hash(packed),
 originalSourceBodiesRestored:true,semanticAuthority:false,fullGatePassed:false}));
