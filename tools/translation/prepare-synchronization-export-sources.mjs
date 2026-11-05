import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {withNativeSubstitutionOperation,nativeSubstitutionCopyHasChanges,prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy} from './prepare-native-substitution-copy.mjs';
import {prepareOwnedLoopCallbackSources} from './prepare-owned-loop-callback-sources.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareSynchronizationExportSources({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/synchronization-exports/complete-originals-and-rules.json.gz',pin:'04e1fb21fc84e81a04f1fce3ffde269c536257fcbce319bc1fd4373bc28c349d',id:'router:synchronization-exports-complete-source-substitutions-v1',laterPlans:[prepareOwnedLoopCallbackSources({root})]}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareSynchronizationExportSources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&nativeSubstitutionCopyHasChanges(plan))throw new TypeError('Synchronization export source copy differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
