import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {withNativeSubstitutionOperation,nativeSubstitutionCopyHasChanges,prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy} from './prepare-native-substitution-copy.mjs';
import {prepareNativeSourceOperationPart1} from './prepare-native-source-operation-part-1.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareJsonIterationAdoption({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/json-iteration-adoption/complete-originals-and-rules.json.gz',pin:'695ead63e42296513ad7289dd6c993e348f2e27083d5b55cbed066cbfa9567cc',id:'router:json-iteration-adoption-source-copy-v1',laterPlans:[prepareNativeSourceOperationPart1({root})]}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareJsonIterationAdoption();
 if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&nativeSubstitutionCopyHasChanges(plan))throw new TypeError('JSON iteration adoption sources are stale');
 console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
