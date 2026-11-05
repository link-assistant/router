import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy,withNativeSubstitutionOperation,nativeSubstitutionCopyHasChanges} from './prepare-native-substitution-copy.mjs';
import {prepareNativeSourceHistory} from './native-source-history.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareNativeChildEnvironmentSources({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>{const native=prepareNativeSourceHistory({root}),plan=prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/native-child-environment/complete-originals-and-rules.json.gz',pin:'2876a3298ebb2f07b441d3d7e3385a6f267a1e202380b18d872ef669f8aec58f',id:'router:native-child-environment-complete-source-substitutions-v1'}),current=prepareNativeSourceHistory({root});if(JSON.stringify(native)!==JSON.stringify(current))throw new TypeError('Complete native history changed during source construction');return {...plan,nativeInputs:native,rustExecuted:false};});
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareNativeChildEnvironmentSources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&nativeSubstitutionCopyHasChanges(plan))throw new TypeError('Native child environment source differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
