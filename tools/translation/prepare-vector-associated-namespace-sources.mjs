import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy,withNativeSubstitutionOperation,nativeSubstitutionCopyHasChanges} from './prepare-native-substitution-copy.mjs';
import {preparePrimitiveVectorDefinitionSources} from './prepare-primitive-vector-definition-sources.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareVectorAssociatedNamespaceSources({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/vector-associated-namespace/complete-originals-and-rules.json.gz',pin:'f5dd806adf538b98b090dabefeada5cddb0be5c61dbe99e949fb689e2c5f6237',id:'router:vector-associated-namespace-complete-source-substitutions-v1',laterPlans:[preparePrimitiveVectorDefinitionSources({root})]}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareVectorAssociatedNamespaceSources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&nativeSubstitutionCopyHasChanges(plan))throw new TypeError('Vector associated namespace source differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
