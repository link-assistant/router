import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy,withNativeSubstitutionOperation,nativeSubstitutionCopyHasChanges} from './prepare-native-substitution-copy.mjs';
import {prepareWrappingMultiplySources} from './prepare-wrapping-multiply-sources.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareExistingHelperAppendSources({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/existing-helper-append/complete-originals-and-rules.json.gz',pin:'013df313f50b66c22dd88047d250ffc265ab5554befc2bff3b9477fc129de711',id:'router:existing-helper-append-complete-source-substitutions-v1',laterPlans:[prepareWrappingMultiplySources({root})]}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareExistingHelperAppendSources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&nativeSubstitutionCopyHasChanges(plan))throw new TypeError('Existing helper append source differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
