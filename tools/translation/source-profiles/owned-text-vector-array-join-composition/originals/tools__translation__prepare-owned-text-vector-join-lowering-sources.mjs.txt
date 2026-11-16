import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareMixedNativeSubstitutionCopy as prepareNativeSubstitutionCopy,writeMixedNativeSubstitutionCopy as writeNativeSubstitutionCopy,withMixedNativeSubstitutionOperation as withNativeSubstitutionOperation,mixedNativeSubstitutionCopyHasChanges as nativeSubstitutionCopyHasChanges} from './failure-aware-mixed-native-substitution-copy.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareOwnedTextVectorJoinLoweringSources({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/owned-text-vector-join-lowering/complete-originals-and-rules.json.gz',pin:'f8e88e406fe38dbcd3705d6eccbd1a8706bfdef2848d4a380513c29571d03d08',id:'router:owned-text-vector-join-lowering-complete-source-substitutions-v1'}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareOwnedTextVectorJoinLoweringSources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&nativeSubstitutionCopyHasChanges(plan))throw new TypeError('Owned text vector join lowering source differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
