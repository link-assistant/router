// Receiving source adapter. The historical generator and its SHA remain exact.
import {createHash} from 'node:crypto';
import {adaptHistoricalTypeScriptLayout} from './historical-language-layout.mjs';
import {createRulePipeline} from '../../rule-pipeline.mjs';
import {exactLiteralSubstitutionRule as literalRule} from '../../literal-substitution-rule.mjs';
import {transportConcreteSourcePhases} from '../../concrete-phased-equations.mjs';

const hash=value=>createHash('sha256').update(value).digest('hex');
const originalSha256='476ff090d064ced3d7b090cfc3962b24e50d8ddf3f32bca20a88c9d22966b558';
const relocatedSha256='67a77538cfef53951a2ad6310c3e0514616209ce51083d08360d0af60e4e115d';

const exactLiteralSubstitutionRule=(id,before,after)=>literalRule(id,before,after,'Complete source anchor changed: '+id);

export function adaptCompleteHistoricalReverseGenerator(before){
  if(typeof before!=='string'||hash(before)!==originalSha256)throw Error('Complete pinned historical reverse generator required');
  const layout=adaptHistoricalTypeScriptLayout(before);
  if(layout.wholeInverse!==true||hash(layout.source)!==relocatedSha256)throw Error('Complete known language-root migration differs');
  const imports=`import {withOwnedRuntimeImportEdges} from '../tools/translation/js-to-rust/owned-core-source.mjs';
import {repositoryRustLayout} from '../tools/translation/repository-layout.mjs';
import {buildOwnedCoreDocumentArtifacts} from '../tools/translation/js-to-rust/owned-core-corpus.mjs';
`;
  const rules=[
    ['current-output-imports',"import { createHash } from 'node:crypto';",imports+"import { createHash } from 'node:crypto';"],
    ['independent-original-build-name','export function buildArtifacts(root = ROOT) {','function buildArtifactsWithIndependentDiagnostics(root = ROOT) {'],
    ['current-rust-package-layout','  const artifacts = new Map([','  const rustSource=repositoryRustLayout(root).productionPrefix;\n  const artifacts = new Map(['],
    ['current-rust-policy-path',"['src/generated_js_first/policy.rs',",'[`'+ '${rustSource}' +'generated_js_first/policy.rs`,'],
    ['current-rust-module-path',"['src/generated_js_first/mod.rs',",'[`'+ '${rustSource}' +'generated_js_first/mod.rs`,'],
    ['complete-owned-artifact-addition',
      '  for (const [path, content] of nativeDraft.artifacts) artifacts.set(path, content);',
      `  for (const [path, content] of nativeDraft.artifacts) artifacts.set(path, content);
  const ownedDraft=buildOwnedCoreDocumentArtifacts(root);
  for(const [path,content]of ownedDraft.artifacts)artifacts.set(path,content);`],
    ['complete-owned-manifest-addition',
      '    unsupportedExamples: unsupported,',
      "    unsupportedExamples: unsupported,\n    ownedCoreDraft:{manifest:'parity/js-owned-core-reverse-draft.json',...ownedDraft.manifest.totals,runtimeParity:false},"],
    ['fresh-runtime-import-scope',
      'export function regenerate(root = ROOT, { check = false } = {}) {',
      `export function buildArtifacts(root = ROOT){return withOwnedRuntimeImportEdges(()=>buildArtifactsWithIndependentDiagnostics(root));}

export function regenerate(root = ROOT, { check = false } = {}) {`],
  ];
  const run=createRulePipeline([
    {phase:'language',rules:[]},
    {phase:'repository',rules:rules.map(([id,expected,replacement])=>exactLiteralSubstitutionRule('historical-generator:'+id,expected,replacement))},
  ]).run(layout.source);
  const after=run.value;
  const [equation]=transportConcreteSourcePhases([{before,middle:layout.source,after,language:'JavaScript'}]);
  if(equation.inverse!==before)throw Error('Complete original historical generator inverse differs');
  return {before,middle:layout.source,after,originalSha256,relocatedSha256,afterSha256:hash(after),layout,equation,
    trace:run.trace,oldIndependentAnalysisCallsRetained:true,originalArtifactsRetained:true,
    receivingQualified:false,semanticAuthority:false};
}
