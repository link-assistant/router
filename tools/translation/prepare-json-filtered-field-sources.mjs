import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy,withNativeSubstitutionOperation,nativeSubstitutionCopyHasChanges} from './prepare-native-substitution-copy.mjs';
import {prepareNativeRustFunctionCopies} from './native-rust-function-copies.mjs';
import {prepareJsonOwnedValueFieldNativeSource,prepareJsonOwnedValueFieldSources} from './prepare-json-owned-value-field-sources.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareJsonFilteredFieldNativeSource({root=ROOT}={}){return prepareNativeRustFunctionCopies({root,archive:'tools/translation/source-profiles/json-filtered-field-source/complete-native-template-rules.json.gz',pin:'e455d1a188612afbdf94a188a39ec8495e52a65f02a11a7ac7575d836f350e5b',id:'router:json-filtered-field-native-function-copies-v1',laterPlans:[prepareJsonOwnedValueFieldNativeSource({root})]});}
export function prepareJsonFilteredFieldSources({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/json-filtered-field-source/complete-originals-and-rules.json.gz',pin:'316be64b7845a33cb42182dd9549644891d3a1c7ecf3175117157ac5618895f6',id:'router:json-filtered-field-source-complete-source-substitutions-v1',laterPlans:[prepareJsonFilteredFieldNativeSource({root}),prepareJsonOwnedValueFieldSources({root})]}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareJsonFilteredFieldSources();if(args[0]==='--write'){const native=prepareJsonFilteredFieldNativeSource();writeNativeSubstitutionCopy(native,{root:ROOT});writeNativeSubstitutionCopy(plan,{root:ROOT});}if(args[0]==='--check'&&nativeSubstitutionCopyHasChanges(plan))throw new TypeError('JSON filtered field source copy differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),nativeFiles:plan.descendantFiles.map(row=>row.path),receivingExecuted:false,rustExecuted:false}));
}
