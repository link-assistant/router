import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {withNativeSubstitutionOperation,nativeSubstitutionCopyHasChanges,prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy} from './prepare-native-substitution-copy.mjs';
import {prepareNativeSourceOperationPart1} from './prepare-native-source-operation-part-1.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareTypedScalarOptional({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/typed-scalar-optional/complete-originals-and-rules.json.gz',pin:'92f77ff6561a1efa8577c1cd87d5601b36d29427c887a10472e95d53d3e6cba4',id:'router:typed-scalar-optional-source-copy-v1',laterPlans:[prepareNativeSourceOperationPart1({root})]}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');
 const plan=prepareTypedScalarOptional();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});
 if(args[0]==='--check'&&nativeSubstitutionCopyHasChanges(plan))throw new TypeError('Typed scalar optional source copy is stale');
 console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
