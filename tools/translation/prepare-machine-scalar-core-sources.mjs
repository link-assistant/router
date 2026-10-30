import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy,withNativeSubstitutionOperation,nativeSubstitutionCopyHasChanges} from './prepare-native-substitution-copy.mjs';
import {prepareFixedTypeCoreNativeSources} from './prepare-fixed-type-core-native-sources.mjs';
import {prepareFixedCastTypeSources} from './prepare-fixed-cast-type-sources.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareMachineScalarCoreSources({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>{const native=prepareFixedTypeCoreNativeSources({root}),plan=prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/machine-scalar-core/complete-originals-and-rules.json.gz',pin:'bba0bc7865d487b24255ae218c16c6db8f337a18624c91417cc8a360dc7f4835',id:'router:machine-scalar-core-complete-source-substitutions-v1',laterPlans:[prepareFixedCastTypeSources({root})]}),current=prepareFixedTypeCoreNativeSources({root});if(JSON.stringify(native)!==JSON.stringify(current))throw new TypeError('Complete native scalar inputs changed during source construction');return {...plan,nativeInputs:native,rustExecuted:false};});
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareMachineScalarCoreSources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&nativeSubstitutionCopyHasChanges(plan))throw new TypeError('Machine scalar source differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
