import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy,withNativeSubstitutionOperation,nativeSubstitutionCopyHasChanges} from './prepare-native-substitution-copy.mjs';
import {prepareCarrierBindingTrySources} from './prepare-carrier-binding-try-sources.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareCallbackCoreBodySources({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/callback-core-body-source/complete-originals-and-rules.json.gz',pin:'ded21650c463fd6bf52c829510bc5c0733b89f095f9298724ef95ae3119ecf09',id:'router:callback-core-body-source-complete-source-substitutions-v1',laterPlans:[prepareCarrierBindingTrySources({root})]}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareCallbackCoreBodySources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&nativeSubstitutionCopyHasChanges(plan))throw new TypeError('Callback core body source copy differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
