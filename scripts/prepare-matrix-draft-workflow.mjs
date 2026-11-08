// Compose independent checks and data custody from the immutable whole workflow.
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
const ordinary='      - run: node scripts/translate-router.mjs --profile-matrix --check\n';
const upload='      - name: Preserve complete unqualified matrix drafts\n        if: ${{ always() }}\n        uses: actions/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a\n        with:\n          name: matrix-drafts-${{ inputs.sha }}\n          path: js/node_modules/.matrix-drafts/\n          include-hidden-files: true\n          if-no-files-found: error\n          retention-days: 7\n';
function replaceOnce(source,before,after){if(source.split(before).length!==2)throw TypeError('Complete historical matrix workflow changed');return source.replace(before,()=>after);}
const directory='    env:\n      ROUTER_MATRIX_DRAFT_DIRECTORY: js/node_modules/.matrix-drafts\n';
const start=original.indexOf(profile),end=original.indexOf('  reverse-translation:\n',start);
if(start<0||end<=start)throw TypeError('Complete historical matrix job missing');
const complete=replaceOnce(original.slice(start,end),profile,profile+directory);
const ordinaryJob=replaceOnce(complete,checks,'');
const ownedJob=replaceOnce(replaceOnce(complete,ordinary,''),'  profile-matrix:\n','  owned-profile-matrix:\n');
const needs='    needs: [lint, node-tests, bun-tests, typescript, parity, translation, profile-matrix, reverse-translation]\n';
const forward='      - run: node scripts/run-node-tests.mjs --outer-timeout-ms=3600000 --test-concurrency=2 tools/translation/test/*.test.mjs tools/translation/serialization-schema/*.test.mjs\n';
const canonical='      - run: node scripts/translate-router.mjs --check\n      - run: node scripts/translate-router.mjs --retain-output-text --owned-core-definitions --check\n';
const forwardStart=original.indexOf('  translation:\n'),forwardEnd=original.indexOf(profile,forwardStart);
if(forwardStart<0||forwardEnd<=forwardStart)throw TypeError('Complete historical forward job missing');
const forwardComplete=original.slice(forwardStart,forwardEnd);
const nodeUploadStart=forwardComplete.indexOf('      - name: Preserve complete Node deadline audit and raw streams\n');
if(nodeUploadStart<0)throw TypeError('Complete historical forward evidence missing');
const shardJob=replaceOnce(forwardComplete,canonical,'');
const freshnessJob=replaceOnce(replaceOnce(forwardComplete.slice(0,nodeUploadStart),forward,''),'  translation:\n','  translation-freshness:\n');
const forwardHeader='  translation:\n    runs-on: ubuntu-24.04\n';
const shardStrategy='    strategy:\n      fail-fast: false\n      matrix:\n        shard: [1, 2, 3, 4, 5, 6, 7, 8]\n';
const shardCommand='      - run: node scripts/run-node-test-shard.mjs --outer-timeout-ms=3600000 --whole-file-shard=${{ matrix.shard }}/8 --test-concurrency=2 tools/translation/test/*.test.mjs tools/translation/serialization-schema/*.test.mjs\n';
export const MATRIX_DRAFT_LANGUAGE_RULES=Object.freeze([
 {id:'matrix-custody:explicit-data-directory',before:profile,after:profile+directory},
 {id:'matrix-custody:independent-complete-owned-check',before:complete,after:ordinaryJob+ownedJob},
 {id:'forward-files:independent-complete-freshness',before:forwardComplete,after:shardJob+freshnessJob},
]);
export const MATRIX_DRAFT_REPOSITORY_RULES=Object.freeze([
 {id:'matrix-custody:retain-complete-failed-check-drafts',before:ordinary,after:ordinary+upload},
 {id:'matrix-custody:retain-complete-owned-check-drafts',before:checks,after:checks+replaceOnce(upload,'name: matrix-drafts-','name: matrix-owned-drafts-')},
 {id:'matrix-custody:require-both-complete-jobs',before:needs,after:replaceOnce(needs,'profile-matrix, reverse-translation','profile-matrix, owned-profile-matrix, reverse-translation')},
 {id:'matrix-custody:reject-each-of-nine-stage-failures',before:'stages.length !== 8',after:'stages.length !== 9'},
 {id:'forward-files:distinct-complete-evidence',before:shardJob,after:replaceOnce(shardJob,'name: node-case-deadlines-${{ github.job }}-${{ inputs.sha }}','name: node-case-deadlines-${{ github.job }}-${{ inputs.sha }}-${{ matrix.shard }}')},
 {id:'forward-files:eight-exhaustive-whole-file-shards',before:forwardHeader,after:forwardHeader+shardStrategy},
 {id:'forward-files:unchanged-auditor-and-case-budgets',before:forward,after:shardCommand},
 {id:'forward-files:require-complete-freshness',before:replaceOnce(needs,'profile-matrix, reverse-translation','profile-matrix, owned-profile-matrix, reverse-translation'),after:replaceOnce(replaceOnce(needs,'profile-matrix, reverse-translation','profile-matrix, owned-profile-matrix, reverse-translation'),'translation, profile-matrix','translation, translation-freshness, profile-matrix')},
 {id:'forward-files:reject-each-of-ten-stage-failures',before:'stages.length !== 9',after:'stages.length !== 10'},
 {id:'forward-files:mandatory-whole-control-file',before:'      - run: node --test scripts/test/check-js-first-local.test.mjs\n',after:'      - run: node --test scripts/test/check-js-first-local.test.mjs\n      - run: node --test scripts/test/run-node-test-shard.test.mjs\n'},
]);
function concrete(source){
 const document=parseDocument(source,{version:'1.2',uniqueKeys:true});if(document.errors.length)throw TypeError('Complete matrix workflow grammar differs');
 const meta=JSON.stringify({source,tokens:[...new Parser().parse(source)]}),parsed=JSON.parse(meta);
 if(parsed.source!==source||parsed.tokens.map(token=>CST.stringify(token)).join('')!==source)throw TypeError('Complete matrix workflow CST differs');
 return meta;
}
export function proposeMatrixDraftWorkflow(){
 const rows=[...MATRIX_DRAFT_LANGUAGE_RULES,...MATRIX_DRAFT_REPOSITORY_RULES],stages=[];
 let source=original;
 for(const [phase,rules]of [['language',MATRIX_DRAFT_LANGUAGE_RULES],['repository',MATRIX_DRAFT_REPOSITORY_RULES]]){
  const before=source,beforeMeta=concrete(before);
  source=createRulePipeline([{phase:'language',rules:phase==='language'?rules.map(row=>exactLiteralSubstitutionRule(row.id,row.before,row.after,'Complete historical matrix workflow changed')):[]},{phase:'repository',rules:phase==='repository'?rules.map(row=>exactLiteralSubstitutionRule(row.id,row.before,row.after,'Complete historical matrix workflow changed')):[]}]).run(source).value;
  stages.push({phase,before,after:source,beforeMeta,afterMeta:concrete(source)});
 }
 let inverse=source;
 for(const row of [...rows].reverse()){if(inverse.split(row.after).length!==2)throw TypeError('Complete matrix workflow inverse differs');inverse=inverse.replace(row.after,()=>row.before);}
 if(inverse!==original||concrete(inverse)!==concrete(original))throw TypeError('Complete matrix custody workflow inverse differs');
 return {schema:'matrix-draft-workflow-source-equations-v1',before:original,after:source,inverse,stages,semanticAuthority:false,gateSuccessObserved:false};
}
export function prepareMatrixDraftWorkflow(current=readFileSync(new URL('../.github/workflows/javascript-first.yml',import.meta.url),'utf8')){
 const result=proposeMatrixDraftWorkflow();
 if(current!==result.after)throw TypeError('Complete matrix custody workflow source differs');
 return {...result,current};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(process.argv.length!==3||process.argv[2]!=='--check')throw TypeError('Use --check');
 const result=prepareMatrixDraftWorkflow();console.log(JSON.stringify({fresh:true,phases:result.stages.map(row=>row.phase),gateSuccessObserved:false}));
}
