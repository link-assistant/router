import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy,withNativeSubstitutionOperation,nativeSubstitutionCopyHasChanges} from './prepare-native-substitution-copy.mjs';
import {preparePrimitiveOwnedVectorHelperInputsSources} from './prepare-primitive-owned-vector-helper-inputs-sources.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function preparePrimitiveOwnedVectorEntryInputsSources({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/primitive-owned-vector-entry-inputs/complete-originals-and-rules.json.gz',pin:'d8afe15d2cd921f42ae950e665d8cf436723e9455f01e388effe6520bd9e23fe',id:'router:primitive-owned-vector-entry-inputs-complete-source-substitutions-v1',laterPlans:[preparePrimitiveOwnedVectorHelperInputsSources({root})]}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=preparePrimitiveOwnedVectorEntryInputsSources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&nativeSubstitutionCopyHasChanges(plan))throw new TypeError('Primitive owned vector entry inputs source differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
