import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy,withNativeSubstitutionOperation,nativeSubstitutionCopyHasChanges} from './prepare-native-substitution-copy.mjs';
import {prepareNativeRustFunctionCopies} from './native-rust-function-copies.mjs';
import {prepareJsonNestedFieldsNativeSource,prepareJsonNestedFieldsSources} from './prepare-json-nested-fields-sources.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareJsonScalarDefaultNativeSource({root=ROOT}={}){return prepareNativeRustFunctionCopies({root,archive:'tools/translation/source-profiles/json-scalar-default-source/complete-native-template-rules.json.gz',pin:'520b498872b25f3bc6027015fca2613af4ac4779e0e52bf88f1b4adc07eca486',id:'router:json-scalar-default-native-function-copies-v1',laterPlans:[prepareJsonNestedFieldsNativeSource({root})]});}
export function prepareJsonScalarDefaultSources({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/json-scalar-default-source/complete-originals-and-rules.json.gz',pin:'9b3fc7500675e880f21db3070f8f656282ddd4a4ede20d1f465cf3caa410b759',id:'router:json-scalar-default-source-complete-source-substitutions-v1',laterPlans:[prepareJsonScalarDefaultNativeSource({root}),prepareJsonNestedFieldsSources({root})]}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareJsonScalarDefaultSources();if(args[0]==='--write'){const native=prepareJsonScalarDefaultNativeSource();writeNativeSubstitutionCopy(native,{root:ROOT});writeNativeSubstitutionCopy(plan,{root:ROOT});}if(args[0]==='--check'&&nativeSubstitutionCopyHasChanges(plan))throw new TypeError('JSON scalar default source copy differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),nativeFiles:plan.descendantFiles.map(row=>row.path),receivingExecuted:false,rustExecuted:false}));
}
