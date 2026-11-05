import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareMixedNativeSubstitutionCopy as prepareNativeSubstitutionCopy,writeMixedNativeSubstitutionCopy as writeNativeSubstitutionCopy,withMixedNativeSubstitutionOperation as withNativeSubstitutionOperation,mixedNativeSubstitutionCopyHasChanges as nativeSubstitutionCopyHasChanges} from './failure-aware-mixed-native-substitution-copy.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareOwnedTextVectorJoinKernelSources({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/owned-text-vector-join-kernel/complete-originals-and-rules.json.gz',pin:'69f174c49efb300c7045df28f2c5c602b62b04a42c05d415c207d0881ce65db1',id:'router:owned-text-vector-join-kernel-complete-source-substitutions-v1'}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareOwnedTextVectorJoinKernelSources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&nativeSubstitutionCopyHasChanges(plan))throw new TypeError('Owned text vector join kernel source differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
