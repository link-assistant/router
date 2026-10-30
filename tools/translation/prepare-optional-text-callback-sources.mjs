import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy,withNativeSubstitutionOperation,nativeSubstitutionCopyHasChanges} from './prepare-native-substitution-copy.mjs';
import {prepareNativeRustFunctionCopies} from './native-rust-function-copies.mjs';
import {prepareOptionLazyErrorNativeSource} from './prepare-option-lazy-error-sources.mjs';
import {prepareCallbackTextBodySources} from './prepare-callback-text-body-sources.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareOptionalTextCallbackNativeSource({root=ROOT,source=null}={}){return prepareNativeRustFunctionCopies({root,archive:'tools/translation/source-profiles/optional-text-callback-source/complete-native-template-rules.json.gz',pin:'ce9a2a8218ddad40980c50b60fdd0acbdfa62514d5748db4f96c5fe30e7eece2',id:'router:optional-text-callback-native-function-copies-v1',source,laterPlans:[prepareOptionLazyErrorNativeSource({root,source})]});}
export function prepareOptionalTextCallbackSources({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/optional-text-callback-source/complete-originals-and-rules.json.gz',pin:'3622e95241979d8ca3b6abb3a64b6852d42d1a5463cd8ff7a5708ce6e010328b',id:'router:optional-text-callback-source-complete-source-substitutions-v1',laterPlans:[prepareOptionalTextCallbackNativeSource({root}),prepareCallbackTextBodySources({root})]}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareOptionalTextCallbackSources();if(args[0]==='--write'){const native=prepareOptionalTextCallbackNativeSource();writeNativeSubstitutionCopy(native,{root:ROOT});writeNativeSubstitutionCopy(plan,{root:ROOT});}if(args[0]==='--check'&&nativeSubstitutionCopyHasChanges(plan))throw new TypeError('Optional text callback source copy differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),nativeFiles:plan.descendantFiles.map(row=>row.path),receivingExecuted:false,rustExecuted:false}));
}
