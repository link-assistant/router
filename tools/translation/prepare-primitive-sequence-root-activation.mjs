// Exact original-root source proposal only. No native caller/type authority.
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {proposePrimitiveSequenceRootSource} from './primitive-sequence-root-source.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url)),ORIGINAL="tools/translation/source-profiles/primitive-sequence-root-activation/originals/rust__src__lib.rs.txt",PIN="4796438fde2a07d9a2549727fc4a683560ca2e0f99c8172cf68e2299b68a7b2b";
export function primitiveSequenceRootActivationSourcePlan({root=ROOT}={}){
 root=resolve(root);const before=readFileSync(resolve(root,ORIGINAL),'utf8');if(Buffer.byteLength(before)>2097152||createHash('sha256').update(before).digest('hex')!==PIN)throw new TypeError('Complete primitive sequence original root differs');const proposal=proposePrimitiveSequenceRootSource(before,{sourcePath:'rust/src/lib.rs'}),row=proposal.files[0],current=readFileSync(resolve(root,row.path),'utf8');if(readFileSync(resolve(root,ORIGINAL),'utf8')!==before||readFileSync(resolve(root,row.path),'utf8')!==current)throw new TypeError('Primitive sequence root source changed');const history=composeConcreteSourceHistory({path:row.path,before,after:row.after,language:'Rust',laterPlans:[primitiveOwnedVectorRootActivationSourcePlan({root})]});return {schema:'primitive-sequence-native-root-source-plan-v1',id:'router:primitive-sequence-native-root-v1',files:[{path:row.path,before,after:row.after,current,...history,inverse:before,stages:row.histories.map((stage,index)=>({...stage,phase:index?'repository':'language'})),trace:proposal.ruleTrace}],sourceAuthority:false,semanticAuthority:false,namespaceAuthority:false,sourceInstalled:false,nativeRustGrammarChecked:false,receivingExecuted:false,rustExecuted:false};
}
export function preparePrimitiveSequenceRootActivation(options){const plan=primitiveSequenceRootActivationSourcePlan(options),row=plan.files[0];if(row.current!==row.before&&row.current!==row.after&&row.current!==row.currentAfter)throw new TypeError('Unknown complete native primitive sequence root');return plan;}

import {primitiveOwnedVectorRootActivationSourcePlan} from './prepare-primitive-owned-vector-root-activation.mjs';
import {composeConcreteSourceHistory} from './compose-concrete-source-history.mjs';
