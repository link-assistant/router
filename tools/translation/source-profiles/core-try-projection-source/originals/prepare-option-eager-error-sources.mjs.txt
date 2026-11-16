import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy,withNativeSubstitutionOperation,nativeSubstitutionCopyHasChanges} from './prepare-native-substitution-copy.mjs';
import {prepareNativeRustFunctionCopies} from './native-rust-function-copies.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareOptionEagerErrorNativeSource({root=ROOT,source=null}={}){return prepareNativeRustFunctionCopies({root,archive:'tools/translation/source-profiles/option-eager-error-source/complete-native-template-rules.json.gz',pin:'3293a39c99252c69d17f9e06a069a685e7c8efa9b4d717aa6931bb64fae73061',id:'router:option-eager-error-native-function-copies-v1',source});}
export function prepareOptionEagerErrorSources({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/option-eager-error-source/complete-originals-and-rules.json.gz',pin:'c4b5a211bf00cda82f1b2bf58b9925d21c09e44e0940e70b40129cfd880da6c4',id:'router:option-eager-error-source-complete-source-substitutions-v1',laterPlans:[prepareOptionEagerErrorNativeSource({root})]}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareOptionEagerErrorSources();if(args[0]==='--write'){writeNativeSubstitutionCopy(prepareOptionEagerErrorNativeSource(),{root:ROOT});writeNativeSubstitutionCopy(plan,{root:ROOT});}if(args[0]==='--check'&&nativeSubstitutionCopyHasChanges(plan))throw new TypeError('Option eager error source copy differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
