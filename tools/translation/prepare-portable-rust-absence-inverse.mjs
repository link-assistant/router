import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {withNativeSubstitutionOperation,nativeSubstitutionCopyHasChanges,prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy} from './prepare-native-substitution-copy.mjs';
import {prepareRustSyntaxCells} from './prepare-rust-syntax-cells.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function preparePortableRustAbsenceInverse({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/portable-rust-absence-inverse/complete-originals-and-rules.json.gz',pin:'3cb26465d3657876c8f9fdd424193c2f04d2419354db667fa0938f182fa02975',id:'router:portable-rust-absence-inverse-source-copy-v1',laterPlans:[prepareRustSyntaxCells({root})]}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');
 const plan=preparePortableRustAbsenceInverse();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});
 if(args[0]==='--check'&&nativeSubstitutionCopyHasChanges(plan))throw new TypeError('Portable Rust absence inverse source copy is stale');
 console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
