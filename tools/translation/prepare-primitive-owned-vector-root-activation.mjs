// Exact complete-root source DATA only. No caller/type/owner authority.
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {proposePrimitiveOwnedVectorRootSource} from './primitive-owned-vector-root-source.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url)),ORIGINAL="tools/translation/source-profiles/primitive-owned-vector-root-activation/originals/rust__src__lib.rs.txt",PIN="35533a1a53b033519f921cf1f28bc1e5db248189edc95a7a499cae9215f14195";
export function primitiveOwnedVectorRootActivationSourcePlan({root=ROOT}={}){
 root=resolve(root);const before=readFileSync(resolve(root,ORIGINAL),'utf8');if(Buffer.byteLength(before)>2097152||createHash('sha256').update(before).digest('hex')!==PIN)throw new TypeError('Complete primitive vector original root differs');const proposal=proposePrimitiveOwnedVectorRootSource(before,{sourcePath:'rust/src/lib.rs'}),row=proposal.files[0],current=readFileSync(resolve(root,row.path),'utf8');if(proposal.missingModules.length!==1||proposal.missingModules[0]!=='translation_primitive_vectors_core'||readFileSync(resolve(root,ORIGINAL),'utf8')!==before||readFileSync(resolve(root,row.path),'utf8')!==current)throw new TypeError('Primitive vector root source changed');const history=composeConcreteSourceHistory({path:row.path,before,after:row.after,language:'Rust',laterPlans:[ownedTextVectorRootActivationSourcePlan({root})]});return {schema:'primitive-owned-vector-native-root-source-plan-v1',id:'router:primitive-owned-vector-native-root-v1',files:[{path:row.path,before,after:row.after,current,...history,inverse:before,stages:row.histories.map((stage,index)=>({...stage,phase:index?'repository':'language'})),trace:proposal.ruleTrace}],sourceAuthority:false,semanticAuthority:false,namespaceAuthority:false,sourceInstalled:false,nativeRustGrammarChecked:false,receivingExecuted:false,rustExecuted:false};
}
export function preparePrimitiveOwnedVectorRootActivation(options){const plan=primitiveOwnedVectorRootActivationSourcePlan(options),row=plan.files[0];if(row.current!==row.before&&row.current!==row.after&&row.current!==row.currentAfter)throw new TypeError('Unknown complete native primitive vector root');return plan;}

import {ownedTextVectorRootActivationSourcePlan} from './prepare-owned-text-vector-root-activation.mjs';
import {composeConcreteSourceHistory} from './compose-concrete-source-history.mjs';
