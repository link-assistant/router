import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy,withNativeSubstitutionOperation,nativeSubstitutionCopyHasChanges} from './prepare-native-substitution-copy.mjs';
import {prepareTextBranchTargetSources} from './prepare-text-branch-target-sources.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareCallbackTextTargetSources({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/callback-text-target-source/complete-originals-and-rules.json.gz',pin:'450a9375a3703d43f89f3a5dda2a03d2d6f71c15a321e30d5b16f782e0de404c',id:'router:callback-text-target-source-complete-source-substitutions-v1',laterPlans:[prepareTextBranchTargetSources({root})]}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareCallbackTextTargetSources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&nativeSubstitutionCopyHasChanges(plan))throw new TypeError('Callback text target source differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
