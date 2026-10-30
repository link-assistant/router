import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy,withNativeSubstitutionOperation,nativeSubstitutionCopyHasChanges} from './prepare-native-substitution-copy.mjs';
import {prepareNativeRustFunctionCopies} from './native-rust-function-copies.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareJsonNestedFieldsNativeSource({root=ROOT}={}){return prepareNativeRustFunctionCopies({root,archive:'tools/translation/source-profiles/json-nested-fields-source/complete-native-template-rules.json.gz',pin:'1bd55eddda06be091a70c062761dc219a0eb450d4bfe2fdd535f231e8ee27c04',id:'router:json-nested-fields-native-function-copies-v1'});}
export function prepareJsonNestedFieldsSources({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/json-nested-fields-source/complete-originals-and-rules.json.gz',pin:'efe4b97ab02be5649fd7e04a743cdc0bc64d1551e29dec90dd19880e1af81e29',id:'router:json-nested-fields-source-complete-source-substitutions-v1',laterPlans:[prepareJsonNestedFieldsNativeSource({root})]}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareJsonNestedFieldsSources();if(args[0]==='--write'){const native=prepareJsonNestedFieldsNativeSource();writeNativeSubstitutionCopy(native,{root:ROOT});writeNativeSubstitutionCopy(plan,{root:ROOT});}if(args[0]==='--check'&&nativeSubstitutionCopyHasChanges(plan))throw new TypeError('JSON nested fields source copy differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),nativeFiles:plan.descendantFiles.map(row=>row.path),receivingExecuted:false,rustExecuted:false}));
}
