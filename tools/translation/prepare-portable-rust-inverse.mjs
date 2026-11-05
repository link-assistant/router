import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {withNativeSubstitutionOperation,nativeSubstitutionCopyHasChanges,prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy} from './prepare-native-substitution-copy.mjs';
import {preparePortableRustAbsenceInverse} from './prepare-portable-rust-absence-inverse.mjs';
import {preparePairedTypeScriptAPI} from './prepare-paired-typescript-api.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function preparePortableRustInverse({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/portable-rust-inverse/complete-originals-and-rules.json.gz',pin:'c367b3557fe74ee78de7f22edc24864cf4c0e09ee90e9bdf2094a8681aaec7cb',id:'router:portable-rust-inverse-source-copy-v1',laterPlans:[preparePortableRustAbsenceInverse({root}),preparePairedTypeScriptAPI({root})]}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');
 const plan=preparePortableRustInverse();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});
 if(args[0]==='--check'&&nativeSubstitutionCopyHasChanges(plan))throw new TypeError('Portable Rust inverse source copy is stale');
 console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
