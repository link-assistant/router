// Whole prior-case source correction DATA. All execution UNRUN.
import {fileURLToPath} from 'node:url';
import {createReconcileSourceCapture,requireReconcile as need,boundedReconcileWireBytes} from './paired-sync-reconcile-20261101-support.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta} from './concrete-syntax-meta.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
import {countedLiteralSubstitutionRule} from './counted-literal-substitution-20261102.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url)),PATH='tools/translation/test/protected-copy-variants-20261102.test.mjs',BASE='tools/translation/source-profiles/protected-unit-variants-20261102/';
export function proposeProtectedUnitVariantPriorCase({root=ROOT}={}){
 const capture=createReconcileSourceCapture(root);let answer,primary,failed=false;
 try{const before=capture.capture(BASE+'prior-copy-case.before.txt').source,after=capture.capture(BASE+'prior-copy-case.after.txt').source,current=capture.capture(PATH).source;need(before!==null&&after!==null&&current===after,'complete original/corrected/current case source required');
  // The predecessor contains a malformed regexp delimiter. Preserve it as raw
  // complete source DATA; only corrected grammar receives a fresh full CST.
  const concrete=transportConcreteSyntaxSource(after,{language:'JavaScript'});need(transportConcreteSyntaxMeta(concrete.meta).source===after,'complete corrected case CST differs');
  const slash=String.fromCharCode(92),original='/authored/unmanaged/u',replacement='/authored'+slash+'/unmanaged/u';need(before.split(original).length===4&&before.replaceAll(original,replacement)===after,'exact three reviewed regexp delimiter corrections required');
  // Raw source substitutions retain the malformed predecessor, its exact full
  // inverse and both fixed phases, without claiming predecessor parser validity.
  const run=createRulePipeline([{phase:'language',rules:[{id:'javascript:retain-malformed-prior-case-as-raw-source-data',apply:value=>{need(value===before,'whole original malformed case source required');return value;}}]},{phase:'repository',rules:[countedLiteralSubstitutionRule('router:repair-three-exact-prior-case-regexp-delimiters',before,after,1,'whole prior-case original source differs')]}]).run(before);need(run.value===after,'exact complete corrected case source equation differs');const phases=[{phase:'language',before,after:before,inverse:before},{phase:'repository',before,after,inverse:before}];
  const inverse=after.replaceAll(replacement,original);need(inverse===before,'complete prior-case raw inverse differs');
  answer={schema:'protected-unit-variant-prior-case-source-20261102-v1',path:PATH,before,language:before,after,current,currentAfter:current,inverse,phases,trace:run.trace,correctedConcreteSyntax:concrete.meta,originalGrammar:'MALFORMED_REGEXP_DELIMITER',sourceInstalled:false,sourceAuthority:false,semanticAuthority:false,verification:'UNRUN'};boundedReconcileWireBytes(answer);
 }catch(error){failed=true;primary=error;}try{capture.close();}catch(error){if(!failed)throw error;}if(failed)throw primary;return answer;
}
