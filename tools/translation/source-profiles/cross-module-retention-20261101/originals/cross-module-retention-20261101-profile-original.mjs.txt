// Complete physical original/current source equation, SOURCE DRAFT, UNRUN.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {transportConcreteSourceEquations} from './concrete-source-equations.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
import {accountPrimitiveVectorIteratorBulkData as accountData} from './primitive-vector-iterator-bulk-20261101-accounting.mjs';
const digest=value=>createHash('sha256').update(value).digest('hex');
export function prepareCrossModuleHelperBulkSourceEquation(){
 const issuer=readFileSync(new URL('./source-profiles/cross-module-helper-bulk-20261101/originals/cross-module-helper-bulk-20261101-source-links.mjs.txt',import.meta.url),'utf8');if(issuer!==readFileSync(new URL('./extensions/source-links.mjs',import.meta.url),'utf8'))throw new TypeError('Complete app/let/borrow source issuer chronology changed');
 const before=readFileSync(new URL('./source-profiles/cross-module-helper-bulk-20261101/originals/cross-module-helper-bulk-20261101-original.mjs.txt',import.meta.url),'utf8'),after=readFileSync(new URL('./source-profiles/cross-module-helper-bulk-20261101/originals/cross-module-helper-bulk-20261101-current.mjs.txt',import.meta.url),'utf8'),current=readFileSync(new URL('./router-core-json-updates.mjs',import.meta.url),'utf8');
 if(digest(before)!=='e5afb2bda5073204f900c66269b440c6520c803c73c6281ab32ffc907874e241'||digest(after)!=='fff227513add251c33e2bb36ed84153e5729b6d138cbff53bf262b5490e38f5b')throw new TypeError('Complete cross-module helper profile source bytes changed');
 if(current!==after)throw new TypeError('Cross-module helper source profile chronology differs from the complete installed current source');
 const run=createRulePipeline([
  {phase:'language',rules:[{id:'language:transport-whole-original-current-Rust-caller-checker-source-equation',apply:()=>transportConcreteSourceEquations([{before,after,language:'JavaScript'}])[0]}]},
  {phase:'repository',rules:[{id:'repository:retain-complete-pre-opt-in-and-current-source-profile-chronology',apply:equation=>({
   schema:'router-cross-module-helper-bulk-20261101-source-profile-v1',path:'tools/translation/router-core-json-updates.mjs',before,after,beforeSha256:digest(before),afterSha256:digest(after),equation,
   issuer:{path:'tools/translation/extensions/source-links.mjs',source:issuer,sha256:digest(issuer),authority:false},
   chronology:{base:'complete physical root before opt-in addition; existing frozen preparer history remains unchanged',current:'complete physical root after opt-in-only source/namespace proof path'},
   sourceAuthority:false,semanticAuthority:false,receivingExecuted:false,
  })}]},
 ]).run(null);accountData(run);return run;
}
