import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {withNativeSubstitutionOperation,nativeSubstitutionCopyHasChanges,prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy} from './prepare-native-substitution-copy.mjs';
import {prepareTypedScalarAbsence} from './prepare-typed-scalar-absence.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareGenericScalarAliases({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/generic-scalar-aliases/complete-originals-and-rules.json.gz',pin:'f3598973d39c268e7e9c0bb54812636668ba8975e869265c14f4415ca028df5b',id:'router:generic-scalar-aliases-source-copy-v1',laterPlans:[prepareTypedScalarAbsence({root})]}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');
 const plan=prepareGenericScalarAliases();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});
 if(args[0]==='--check'&&nativeSubstitutionCopyHasChanges(plan))throw new TypeError('Generic scalar alias source copy is stale');
 console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
