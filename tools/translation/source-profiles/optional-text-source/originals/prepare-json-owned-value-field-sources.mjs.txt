import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy,withNativeSubstitutionOperation,nativeSubstitutionCopyHasChanges} from './prepare-native-substitution-copy.mjs';
import {prepareNativeRustFunctionCopies} from './native-rust-function-copies.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareJsonOwnedValueFieldNativeSource({root=ROOT}={}){return prepareNativeRustFunctionCopies({root,archive:'tools/translation/source-profiles/json-owned-value-field-source/complete-native-template-rules.json.gz',pin:'a0bc0395e0682ee52d4e89c55662ebcc7fbe515a8a751939eae4e6a884d29e84',id:'router:json-owned-value-field-native-function-copies-v1'});}
export function prepareJsonOwnedValueFieldSources({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/json-owned-value-field-source/complete-originals-and-rules.json.gz',pin:'c1912fa4e12b2d367f7cc687921a31396d09b7cd9ef6080393a29a606a6695c3',id:'router:json-owned-value-field-source-complete-source-substitutions-v1',laterPlans:[prepareJsonOwnedValueFieldNativeSource({root})]}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareJsonOwnedValueFieldSources();if(args[0]==='--write'){const native=prepareJsonOwnedValueFieldNativeSource();writeNativeSubstitutionCopy(native,{root:ROOT});writeNativeSubstitutionCopy(plan,{root:ROOT});}if(args[0]==='--check'&&nativeSubstitutionCopyHasChanges(plan))throw new TypeError('JSON owned value field source copy differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),nativeFiles:plan.descendantFiles.map(row=>row.path),receivingExecuted:false,rustExecuted:false}));
}
