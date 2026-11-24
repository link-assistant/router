import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy,withNativeSubstitutionOperation,nativeSubstitutionCopyHasChanges} from './prepare-native-substitution-copy.mjs';
import {prepareNativeRustFunctionCopies} from './native-rust-function-copies.mjs';
import {prepareRustTryTokenSources} from './prepare-rust-try-token-sources.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareJsonOwnedTextFieldNativeSource({root=ROOT}={}){return prepareNativeRustFunctionCopies({root,archive:'tools/translation/source-profiles/json-owned-text-field-source/complete-native-template-rules.json.gz',pin:'62f486435a338b77402e072c355dda92a0a75249c83d4de1059160d4580402d0',id:'router:json-owned-text-field-native-function-copies-v1'});}
export function prepareJsonOwnedTextFieldSources({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/json-owned-text-field-source/complete-originals-and-rules.json.gz',pin:'86e1a7e4a472837c440515f6cf6ab832c6ec4c5a208f1c5e3dc811c6e5e942bc',id:'router:json-owned-text-field-source-complete-source-substitutions-v1',laterPlans:[prepareJsonOwnedTextFieldNativeSource({root}),prepareRustTryTokenSources({root})]}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareJsonOwnedTextFieldSources();if(args[0]==='--write'){const native=prepareJsonOwnedTextFieldNativeSource();writeNativeSubstitutionCopy(native,{root:ROOT});writeNativeSubstitutionCopy(plan,{root:ROOT});}if(args[0]==='--check'&&nativeSubstitutionCopyHasChanges(plan))throw new TypeError('JSON owned text field source copy differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),nativeFiles:plan.descendantFiles.map(row=>row.path),receivingExecuted:false,rustExecuted:false}));
}
