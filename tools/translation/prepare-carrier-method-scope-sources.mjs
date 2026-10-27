import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy,withNativeSubstitutionOperation,nativeSubstitutionCopyHasChanges} from './prepare-native-substitution-copy.mjs';
import {prepareCallbackCoreBodySources} from './prepare-callback-core-body-sources.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareCarrierMethodScopeSources({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/carrier-method-scope-source/complete-originals-and-rules.json.gz',pin:'fbbf1fdf0c3dc38d4883e9bff1f985fe1214eae89acad5d06fc6dace1c40f4fe',id:'router:carrier-method-scope-source-complete-source-substitutions-v1',laterPlans:[prepareCallbackCoreBodySources({root})]}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareCarrierMethodScopeSources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&nativeSubstitutionCopyHasChanges(plan))throw new TypeError('Carrier method scope source copy differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
