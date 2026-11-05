import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareMixedNativeSubstitutionCopy as prepareNativeSubstitutionCopy,writeMixedNativeSubstitutionCopy as writeNativeSubstitutionCopy,withMixedNativeSubstitutionOperation as withNativeSubstitutionOperation,mixedNativeSubstitutionCopyHasChanges as nativeSubstitutionCopyHasChanges} from './failure-aware-mixed-native-substitution-copy.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareOwnedTextVectorCoreSources({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/owned-text-vector-core/complete-originals-and-rules.json.gz',pin:'8f5f521521f5a694c52b4f0ecf1dad10fe02d3698a9a7b9342056cf07c1c2e71',id:'router:owned-text-vector-core-complete-source-substitutions-v1'}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareOwnedTextVectorCoreSources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&nativeSubstitutionCopyHasChanges(plan))throw new TypeError('Owned text vector core source differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
