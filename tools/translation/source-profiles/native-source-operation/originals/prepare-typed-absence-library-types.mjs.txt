import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy} from './prepare-native-substitution-copy.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareTypedAbsenceLibraryTypes({root=ROOT}={}){
 return prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/typed-absence-library-types/complete-originals-and-rules.json.gz',pin:'30d27cbf405f866b60a39b2675e9b14c4188acd3574f04c7fc48cca19771a58f',id:'router:typed-absence-library-types-source-copy-v1'});
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');
 const plan=prepareTypedAbsenceLibraryTypes();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});
 if(args[0]==='--check'&&plan.files.some(row=>row.current!==row.after))throw new TypeError('Typed absence library source copy is stale');
 console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
