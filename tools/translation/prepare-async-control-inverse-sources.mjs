import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {withNativeSubstitutionOperation,nativeSubstitutionCopyHasChanges,prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy} from './prepare-native-substitution-copy.mjs';
import {prepareAsyncControlUnitSources} from './prepare-async-control-unit-sources.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareAsyncControlInverseSources({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/async-control-inverse/complete-originals-and-rules.json.gz',pin:'8f66a63bfe984e86be8c24c869d650dc2185ab76c1fd8b6d1540732ee445d3cc',id:'router:async-control-inverse-complete-source-substitutions-v1',laterPlans:[prepareAsyncControlUnitSources({root})]}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareAsyncControlInverseSources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&nativeSubstitutionCopyHasChanges(plan))throw new TypeError('Async control inverse source copy differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
