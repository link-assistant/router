import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {withNativeSubstitutionOperation,nativeSubstitutionCopyHasChanges,prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy} from './prepare-native-substitution-copy.mjs';
import {prepareTypedScalarDefaults} from './prepare-typed-scalar-defaults.mjs';
import {prepareTypedAbsenceLibraryTypes} from './prepare-typed-absence-library-types.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareTypedScalarAbsence({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/typed-scalar-absence/complete-originals-and-rules.json.gz',pin:'d2eb954792e239852a6fb7dba89e1350040ca494586289379a302dc5bf0d71c3',id:'router:typed-scalar-absence-source-copy-v1',laterPlans:[prepareTypedScalarDefaults({root}),prepareTypedAbsenceLibraryTypes({root})]}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');
 const plan=prepareTypedScalarAbsence();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});
 if(args[0]==='--check'&&nativeSubstitutionCopyHasChanges(plan))throw new TypeError('Typed scalar absence source copy is stale');
 console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
