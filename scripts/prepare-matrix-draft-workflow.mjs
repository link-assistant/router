// Compose data custody after the unchanged historical fixed-nine transformation.
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {readFixedNineDraftWorkflowSources} from './fixed-nine-draft-policy.mjs';
import {createRulePipeline} from '../tools/translation/rule-pipeline.mjs';
import {exactLiteralSubstitutionRule} from '../tools/translation/literal-substitution-rule.mjs';
const require=createRequire(new URL('./ci/package.json',import.meta.url));
const {parseDocument,Parser,CST}=require('yaml');
const original=readFixedNineDraftWorkflowSources().files.find(row=>row.path==='.github/workflows/javascript-first.yml').before;
const profile='  profile-matrix:\n    runs-on: ubuntu-24.04\n    # Completed cycle-nine matrix checks reached 2166s. Keep a finite independent\n    # 60-minute window, the same immutable SHA and unconditional failure.\n    timeout-minutes: 60\n';
const checks='      - run: node scripts/translate-router.mjs --retain-output-text --owned-core-definitions --profile-matrix --check\n';
const upload='      - name: Preserve complete unqualified matrix drafts\n        if: ${{ always() }}\n        uses: actions/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a\n        with:\n          name: matrix-drafts-${{ inputs.sha }}\n          path: js/node_modules/.matrix-drafts/\n          include-hidden-files: true\n          if-no-files-found: error\n          retention-days: 7\n';
export const MATRIX_DRAFT_LANGUAGE_RULES=Object.freeze([{id:'matrix-custody:explicit-data-directory',before:profile,after:profile+'    env:\n      ROUTER_MATRIX_DRAFT_DIRECTORY: js/node_modules/.matrix-drafts\n'}]);
export const MATRIX_DRAFT_REPOSITORY_RULES=Object.freeze([{id:'matrix-custody:retain-complete-failed-check-drafts',before:checks,after:checks+upload}]);
function concrete(source){
 const document=parseDocument(source,{version:'1.2',uniqueKeys:true});if(document.errors.length)throw TypeError('Complete matrix workflow grammar differs');
 const meta=JSON.stringify({source,tokens:[...new Parser().parse(source)]}),parsed=JSON.parse(meta);
 if(parsed.source!==source||parsed.tokens.map(token=>CST.stringify(token)).join('')!==source)throw TypeError('Complete matrix workflow CST differs');
 return meta;
}
export function prepareMatrixDraftWorkflow(current=readFileSync(new URL('../.github/workflows/javascript-first.yml',import.meta.url),'utf8')){
 const rows=[...MATRIX_DRAFT_LANGUAGE_RULES,...MATRIX_DRAFT_REPOSITORY_RULES],stages=[];
 let source=original;
 for(const [phase,rules]of [['language',MATRIX_DRAFT_LANGUAGE_RULES],['repository',MATRIX_DRAFT_REPOSITORY_RULES]]){
  const before=source,beforeMeta=concrete(before);
  source=createRulePipeline([{phase:'language',rules:phase==='language'?rules.map(row=>exactLiteralSubstitutionRule(row.id,row.before,row.after,'Complete historical matrix workflow changed')):[]},{phase:'repository',rules:phase==='repository'?rules.map(row=>exactLiteralSubstitutionRule(row.id,row.before,row.after,'Complete historical matrix workflow changed')):[]}]).run(source).value;
  stages.push({phase,before,after:source,beforeMeta,afterMeta:concrete(source)});
 }
 let inverse=source;
 for(const row of [...rows].reverse()){if(inverse.split(row.after).length!==2)throw TypeError('Complete matrix workflow inverse differs');inverse=inverse.replace(row.after,()=>row.before);}
 if(inverse!==original||concrete(inverse)!==concrete(original)||current!==source)throw TypeError('Complete matrix custody workflow source differs');
 return {schema:'matrix-draft-workflow-source-equations-v1',before:original,after:source,current,inverse,stages,semanticAuthority:false,gateSuccessObserved:false};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(process.argv.length!==3||process.argv[2]!=='--check')throw TypeError('Use --check');
 const result=prepareMatrixDraftWorkflow();console.log(JSON.stringify({fresh:true,phases:result.stages.map(row=>row.phase),gateSuccessObserved:false}));
}
