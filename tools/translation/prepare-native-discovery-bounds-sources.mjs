import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy,withNativeSubstitutionOperation,nativeSubstitutionCopyHasChanges} from './prepare-native-substitution-copy.mjs';
import {prepareNativeSourceHistory} from './native-source-history.mjs';
import {prepareFixedIntegerBitsSources} from './prepare-fixed-integer-bits-sources.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareNativeDiscoveryBoundsSources({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>{const native=prepareNativeSourceHistory({root}),plan=prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/native-discovery-bounds/complete-originals-and-rules.json.gz',pin:'699abcdb6d1af14a7c0637251a014517cf3492095199d35290e438c64defddfd',id:'router:native-discovery-bounds-complete-source-substitutions-v1',laterPlans:[prepareFixedIntegerBitsSources({root})]}),current=prepareNativeSourceHistory({root});if(JSON.stringify(native)!==JSON.stringify(current))throw new TypeError('Complete native history changed during source construction');return {...plan,nativeInputs:native,rustExecuted:false};});
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareNativeDiscoveryBoundsSources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&nativeSubstitutionCopyHasChanges(plan))throw new TypeError('Native discovery bounds source differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
