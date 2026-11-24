// Exact complete-root source DATA only. No caller/type/owner authority.
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {proposeOwnedTextVectorRootSource} from './owned-text-vector-root-source.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url)),ORIGINAL="tools/translation/source-profiles/owned-text-vector-root-activation/originals/rust__src__lib.rs.txt",PIN="7a6f5e7b49263b7ffca80a1cf4f87404a7234b63a35a247433c93e74910da64a";
export function ownedTextVectorRootActivationSourcePlan({root=ROOT}={}){
 root=resolve(root);const before=readFileSync(resolve(root,ORIGINAL),'utf8');if(Buffer.byteLength(before)>2097152||createHash('sha256').update(before).digest('hex')!==PIN)throw new TypeError('Complete owned text vector original root differs');const proposal=proposeOwnedTextVectorRootSource(before,{entry:'rust/src/lib.rs'}),row=proposal.files[0],current=readFileSync(resolve(root,row.path),'utf8');if(proposal.missingModules.length!==1||proposal.missingModules[0]!=='translation_owned_text_vectors_core'||readFileSync(resolve(root,ORIGINAL),'utf8')!==before||readFileSync(resolve(root,row.path),'utf8')!==current)throw new TypeError('Primitive vector root source changed');return {schema:'owned-text-vector-native-root-source-plan-v1',id:'router:owned-text-vector-native-root-v1',files:[{path:row.path,before,after:row.after,current,currentAfter:row.after,inverse:before,stages:row.histories.map((stage,index)=>({...stage,phase:index?'repository':'language'})),trace:proposal.ruleTrace}],sourceAuthority:false,semanticAuthority:false,namespaceAuthority:false,sourceInstalled:false,nativeRustGrammarChecked:false,receivingExecuted:false,rustExecuted:false};
}
export function prepareOwnedTextVectorRootActivation(options){const plan=ownedTextVectorRootActivationSourcePlan(options),row=plan.files[0];if(row.current!==row.before&&row.current!==row.after)throw new TypeError('Unknown complete native owned text vector root');return plan;}
