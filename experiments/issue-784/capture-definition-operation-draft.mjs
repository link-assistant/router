// Complete finite source custody, not semantic or performance authority.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {writeCompleteEvidenceJson} from './complete-evidence-json.mjs';
const label=process.argv[2];assert.match(label??'',/^[a-z0-9-]{1,70}$/u);assert.equal(process.argv.length,3);
const path='tools/translation/derive-bang-context.mjs',head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const before=execFileSync('git',['show',head+':'+path],{encoding:'utf8',maxBuffer:262144}),after=readFileSync(path,'utf8');
const helperPath='tools/translation/builtin-definition-position-operation.mjs',helper=readFileSync(helperPath,'utf8'),hash=value=>createHash('sha256').update(value).digest('hex');
const edits=[
 ["import {proveSchemarsBangFootprint,assertSchemarsBangFootprint,originalSchemarsOutput} from './schemars-bang-footprints.mjs';\n","import {proveSchemarsBangFootprint,assertSchemarsBangFootprint,originalSchemarsOutput} from './schemars-bang-footprints.mjs';\nimport {withOptionalBuiltinDefinitionPositions} from './builtin-definition-position-operation.mjs';\n"],
 ['return withRetainedPrivateNativeProofCostScope(()=>createUnscopedDeriveBangContext({deriveContext}));','return withRetainedPrivateNativeProofCostScope(()=>withOptionalBuiltinDefinitionPositions(()=>createUnscopedDeriveBangContext({deriveContext})));'],
];
let actual=before;for(const [from,to]of edits){assert.equal(actual.split(from).length,2);actual=actual.replace(from,()=>to);}assert.equal(actual,after);
let inverse=after;for(const [from,to]of [...edits].reverse()){assert.equal(inverse.split(to).length,2);inverse=inverse.replace(to,()=>from);}assert.equal(inverse,before);
const result={schema:'complete-definition-position-operation-draft-v1',head,path,before,after,beforeSha256:hash(before),afterSha256:hash(after),edits,inverse,helper:{path:helperPath,source:helper,sha256:hash(helper)},performanceQualified:false,semanticAuthority:false};
console.log(JSON.stringify({output:writeCompleteEvidenceJson('ci-logs/issue-784-restart-2/'+label+'.json',Buffer.from(JSON.stringify(result)))}));
