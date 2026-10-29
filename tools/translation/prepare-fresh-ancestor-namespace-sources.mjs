import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy,withNativeSubstitutionOperation,nativeSubstitutionCopyHasChanges} from './prepare-native-substitution-copy.mjs';
import {prepareVectorAssociatedNamespaceSources} from './prepare-vector-associated-namespace-sources.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareFreshAncestorNamespaceSources({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/fresh-ancestor-namespace/complete-originals-and-rules.json.gz',pin:'e230231ea56ce25423d39bccd46b864e835ef37c9f58bff6bfb5ec9e214b2367',id:'router:fresh-ancestor-namespace-complete-source-substitutions-v1',laterPlans:[prepareVectorAssociatedNamespaceSources({root})]}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareFreshAncestorNamespaceSources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&nativeSubstitutionCopyHasChanges(plan))throw new TypeError('Fresh ancestor namespace source differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
