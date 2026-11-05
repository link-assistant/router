import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy,withNativeSubstitutionOperation,nativeSubstitutionCopyHasChanges} from './prepare-native-substitution-copy.mjs';
import {prepareNativeRustFunctionCopies} from './native-rust-function-copies.mjs';
import {prepareOptionEagerErrorNativeSource} from './prepare-option-eager-error-sources.mjs';
import {prepareCoreCarrierCallSources} from './prepare-core-carrier-call-sources.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareOptionalTextNativeSource({root=ROOT,source=null}={}){return prepareNativeRustFunctionCopies({root,archive:'tools/translation/source-profiles/optional-text-source/complete-native-template-rules.json.gz',pin:'9792362b6460d303a0303ddde77ed508cf006ede2f96d16725b158bd4d420739',id:'router:optional-text-native-function-copies-v1',source,laterPlans:[prepareOptionEagerErrorNativeSource({root,source})]});}
export function prepareOptionalTextSources({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/optional-text-source/complete-originals-and-rules.json.gz',pin:'fa71ffed76a19de4acef9a80d55e254319ec5c7582827f5db9ec902097d475a7',id:'router:optional-text-source-complete-source-substitutions-v1',laterPlans:[prepareOptionalTextNativeSource({root}),prepareCoreCarrierCallSources({root})]}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareOptionalTextSources();if(args[0]==='--write'){const native=prepareOptionalTextNativeSource();writeNativeSubstitutionCopy(native,{root:ROOT});writeNativeSubstitutionCopy(plan,{root:ROOT});}if(args[0]==='--check'&&nativeSubstitutionCopyHasChanges(plan))throw new TypeError('Optional text source copy differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),nativeFiles:plan.descendantFiles.map(row=>row.path),receivingExecuted:false,rustExecuted:false}));
}
