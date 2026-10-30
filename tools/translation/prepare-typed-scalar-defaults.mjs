import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {withNativeSubstitutionOperation,nativeSubstitutionCopyHasChanges,prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy} from './prepare-native-substitution-copy.mjs';
import {prepareTypedScalarOptional} from './prepare-typed-scalar-optional.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareTypedScalarDefaults({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/typed-scalar-defaults/complete-originals-and-rules.json.gz',pin:'a634257543a3a162b36118b1bdde77aad18675d382397e438bd57120a95dee66',id:'router:typed-scalar-defaults-source-copy-v1',laterPlans:[prepareTypedScalarOptional({root})]}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');
 const plan=prepareTypedScalarDefaults();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});
 if(args[0]==='--check'&&nativeSubstitutionCopyHasChanges(plan))throw new TypeError('Typed scalar default source copy is stale');
 console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
