import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {withNativeSubstitutionOperation,nativeSubstitutionCopyHasChanges,prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy} from './prepare-native-substitution-copy.mjs';
import {prepareHttpResourceRecursiveSources} from './prepare-http-resource-recursive-sources.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareHttpResourceRootSetSources({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/http-resource-root-sets/complete-originals-and-rules.json.gz',pin:'8547583edab6f3e1688ae8f3d5dae8c349266d433e22dbc25c124daaa0f3fb2b',id:'router:http-resource-root-sets-complete-source-substitutions-v1',laterPlans:[prepareHttpResourceRecursiveSources({root})]}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareHttpResourceRootSetSources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&nativeSubstitutionCopyHasChanges(plan))throw new TypeError('HTTP resource root set source copy differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
