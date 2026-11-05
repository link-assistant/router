import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {withNativeSubstitutionOperation,nativeSubstitutionCopyHasChanges,prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy} from './prepare-native-substitution-copy.mjs';
import {prepareAsyncControlU64Sources} from './prepare-async-control-u64-sources.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareTransitiveSourceHistory({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/transitive-source-history/complete-originals-and-rules.json.gz',pin:'83d35f1a41f9b71181c01a5b1c40d9048726d65d73eff7a94886609b0f90f5d4',id:'router:transitive-source-history-complete-source-substitutions-v1',laterPlans:[prepareAsyncControlU64Sources({root})]}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareTransitiveSourceHistory();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&nativeSubstitutionCopyHasChanges(plan))throw new TypeError('Transitive source history copy differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
