import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy,withNativeSubstitutionOperation,nativeSubstitutionCopyHasChanges} from './prepare-native-substitution-copy.mjs';
import {prepareNativeRustFunctionCopies} from './native-rust-function-copies.mjs';
import {prepareCoreFormattingRoleSources} from './prepare-core-formatting-role-sources.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareOptionLazyErrorNativeSource({root=ROOT,source=null}={}){return prepareNativeRustFunctionCopies({root,archive:'tools/translation/source-profiles/option-lazy-error-source/complete-native-template-rules.json.gz',pin:'ea09a788fffa2f87d4035d5e91dd961ef7e7e1834ce62d1fcaba80009c521ca6',id:'router:option-lazy-error-native-function-copies-v1',source});}
export function prepareOptionLazyErrorSources({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/option-lazy-error-source/complete-originals-and-rules.json.gz',pin:'b20943c575e93a52cebd6ad8d70281314c4d814121f6e0afb9e847a1fecadcf2',id:'router:option-lazy-error-source-complete-source-substitutions-v1',laterPlans:[prepareOptionLazyErrorNativeSource({root}),prepareCoreFormattingRoleSources({root})]}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareOptionLazyErrorSources();if(args[0]==='--write'){writeNativeSubstitutionCopy(prepareOptionLazyErrorNativeSource(),{root:ROOT});writeNativeSubstitutionCopy(plan,{root:ROOT});}if(args[0]==='--check'&&nativeSubstitutionCopyHasChanges(plan))throw new TypeError('Option lazy error source copy differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
