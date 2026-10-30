import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy,withNativeSubstitutionOperation,nativeSubstitutionCopyHasChanges} from './prepare-native-substitution-copy.mjs';
import {prepareOwnedCompositeSources} from './prepare-owned-composite-sources.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareForwardOwnedFormatSources({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/forward-owned-format-source/complete-originals-and-rules.json.gz',pin:'c8fe7958a650b157a20dc471a635c3fd202f389d7b851f1fc1198f9025cf4f81',id:'router:forward-owned-format-source-complete-source-substitutions-v1',laterPlans:[prepareOwnedCompositeSources({root})]}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareForwardOwnedFormatSources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&nativeSubstitutionCopyHasChanges(plan))throw new TypeError('Forward owned format source differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
