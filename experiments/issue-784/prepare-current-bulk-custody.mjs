// Review and install only the complete source outputs of the actual producers.
import {readFileSync,writeFileSync} from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {prepareBulkDraftCustody} from '../../tools/translation/prepare-bulk-draft-custody.mjs';
import {deriveRetainedBulkSources} from '../../tools/translation/prepare-retained-bulk.mjs';
import {deriveOwnedDefinitionBulkSources} from '../../tools/translation/prepare-owned-definition-bulk.mjs';
import {transportConcreteNamedSourcePhases} from '../../tools/translation/concrete-source-origin-phases.mjs';
import {verifyNativeCopiedModuleBindings} from '../../tools/translation/source-copy-native-bindings.mjs';
import {ownershipCompiler} from '../../tools/translation/js-to-rust/vendor/module-syntax.mjs';
import {proposeMatrixDraftWorkflow,MATRIX_DRAFT_REPOSITORY_RULES} from '../../scripts/prepare-matrix-draft-workflow.mjs';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const ts=ownershipCompiler(),bulk=prepareBulkDraftCustody(),matrix=readFileSync('tools/translation/matrix-bulk.mjs','utf8');
const base=bulk.files.find(row=>row.path==='tools/translation/bulk.mjs').after;
const retained=deriveRetainedBulkSources({bulk:base,matrix}),owned=deriveOwnedDefinitionBulkSources({bulk:base,matrix});
const files=[...bulk.files,
 {path:'tools/translation/retained-bulk.mjs',after:retained.bulk.text},
 {path:'tools/translation/retained-matrix-bulk.mjs',after:retained.matrix.text},
 ...owned.files.map(row=>({path:row.path,after:row.text})),
];
for(const row of files){
 row.before=readFileSync(row.path,'utf8');row.beforeSha256=hash(row.before);row.afterSha256=hash(row.after);
 const parsed=ts.createSourceFile(row.path,row.after,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
 if(parsed.parseDiagnostics.length)throw Error('Independent complete native syntax failed: '+row.path);
 if(row.path.endsWith('/bulk.mjs')){
  const old=ts.createSourceFile(row.path,row.before,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
  const find=file=>file.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='regenerate')?.getText(file);
  if(!find(old)||find(old)!==find(parsed))throw Error('Original complete regenerate body changed');
 }
 const [equation]=transportConcreteNamedSourcePhases([{before:row.before,middle:row.after,after:row.after,language:'JavaScript',rules:['javascript:compose-complete-output-custody','router:preserve-complete-private-plan-validation','javascript:restore-complete-before-module','router:restore-complete-before-module']}]);
 if(equation.inverse!==row.before)throw Error('Complete source inverse failed');
 row.independentConcreteEquation=equation;
}
const bindings=verifyNativeCopiedModuleBindings(ts,files.map(row=>({path:resolve(row.path),source:row.after})));
for(const [at,row]of files.entries())row.independentNativeBindings=bindings[at];
const workflow=proposeMatrixDraftWorkflow(),before=readFileSync('.github/workflows/javascript-first.yml','utf8');
const edit=MATRIX_DRAFT_REPOSITORY_RULES.find(row=>row.id==='bulk-custody:retain-complete-canonical-failed-check-drafts');
if(workflow.after.split(edit.after).length!==2||workflow.after.replace(edit.after,()=>edit.before)!==before)throw Error('Independent full workflow edit differs');
files.push({path:'.github/workflows/javascript-first.yml',before,after:workflow.after,beforeSha256:hash(before),afterSha256:hash(workflow.after),workflow});
const record={schema:'reviewed-complete-bulk-custody-composition-v1',typescriptVersion:ts.version,files,retained,owned,semanticAuthority:false,runtimeParity:false,fullGatePassed:false};
const raw=Buffer.from(JSON.stringify(record)),packed=gzipSync(raw),path='ci-logs/issue-784-restart-2/current-bulk-custody-proposal.json.gz';
writeFileSync(path,packed,{flag:'wx'});if(!gunzipSync(readFileSync(path)).equals(raw))throw Error('Complete proposal readback differs');
for(const row of files){if(readFileSync(row.path,'utf8')!==row.before)throw Error('Physical source changed');}
for(const row of files)if(row.before!==row.after)writeFileSync(row.path,row.after);
for(const row of files)if(readFileSync(row.path,'utf8')!==row.after)throw Error('Complete installed source differs');
console.log(JSON.stringify({schema:record.schema,typescriptVersion:ts.version,files:files.map(({path,beforeSha256,afterSha256})=>({path,beforeSha256,afterSha256})),proposal:path,proposalBytes:packed.length,proposalSha256:hash(packed),semanticAuthority:false,fullGatePassed:false}));
