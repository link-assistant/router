import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy,withNativeSubstitutionOperation,nativeSubstitutionCopyHasChanges} from './prepare-native-substitution-copy.mjs';
import {prepareNativeSourceHistory} from './native-source-history.mjs';
import {prepareNativeInputProvenanceSources} from './prepare-native-input-provenance-sources.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareNativeCatalogAlignmentSources({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>{const native=prepareNativeSourceHistory({root}),plan=prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/native-catalog-alignment/complete-originals-and-rules.json.gz',pin:'3bea5192396a1ea41bc3c2f729ad854e06697d3952d337ef5c361361eaf5aefd',id:'router:native-catalog-alignment-complete-source-substitutions-v1',laterPlans:[prepareNativeInputProvenanceSources({root})]}),current=prepareNativeSourceHistory({root});if(JSON.stringify(native)!==JSON.stringify(current))throw new TypeError('Complete native history changed during source construction');return {...plan,nativeInputs:native,rustExecuted:false};});
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareNativeCatalogAlignmentSources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&nativeSubstitutionCopyHasChanges(plan))throw new TypeError('Native catalog alignment source differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
