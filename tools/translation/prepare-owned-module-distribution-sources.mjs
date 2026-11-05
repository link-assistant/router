import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {withNativeSubstitutionOperation,nativeSubstitutionCopyHasChanges,prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy} from './prepare-native-substitution-copy.mjs';
import {prepareNativeSourceOperationPart1} from './prepare-native-source-operation-part-1.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareOwnedModuleDistributionSources({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/owned-module-distribution/complete-originals-and-rules.json.gz',pin:'0779148c09ba65edaba52ddce9445ce6fadea64b215b3dbdef4d9b3f5d40d0bc',id:'router:owned-module-distribution-complete-source-substitutions-v1',laterPlans:[prepareNativeSourceOperationPart1({root})]}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareOwnedModuleDistributionSources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&nativeSubstitutionCopyHasChanges(plan))throw new TypeError('Owned module distribution source draft differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
