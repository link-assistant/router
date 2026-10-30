import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy,withNativeSubstitutionOperation,nativeSubstitutionCopyHasChanges} from './prepare-native-substitution-copy.mjs';
import {prepareGuardedPrimitiveFailureSources} from './prepare-guarded-primitive-failure-sources.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareOrderedPrimitiveFailureSources({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/ordered-primitive-failures/complete-originals-and-rules.json.gz',pin:'8c2639cec914392378d5ce460ed5c5b41d2628ddf3bd3fcfe9ec1a901ddf1ca1',id:'router:ordered-primitive-failures-complete-source-substitutions-v1',laterPlans:[prepareGuardedPrimitiveFailureSources({root})]}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareOrderedPrimitiveFailureSources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&nativeSubstitutionCopyHasChanges(plan))throw new TypeError('Ordered primitive failure source differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
