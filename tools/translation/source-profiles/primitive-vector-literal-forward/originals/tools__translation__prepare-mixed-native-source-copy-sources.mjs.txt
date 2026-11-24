import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareMixedNativeSubstitutionCopy as prepareNativeSubstitutionCopy,writeMixedNativeSubstitutionCopy as writeNativeSubstitutionCopy,withMixedNativeSubstitutionOperation as withNativeSubstitutionOperation,mixedNativeSubstitutionCopyHasChanges as nativeSubstitutionCopyHasChanges} from './prepare-mixed-native-substitution-copy.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareMixedNativeSourceCopySources({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/mixed-native-source-copy/complete-originals-and-rules.json.gz',pin:'7ef410694917f17546703201b7fab29ec094e2f49758606d846766a71e525a40',id:'router:mixed-native-source-copy-complete-source-substitutions-v1'}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareMixedNativeSourceCopySources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&nativeSubstitutionCopyHasChanges(plan))throw new TypeError('Mixed native source copy source differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
