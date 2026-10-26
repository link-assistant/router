import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy,withNativeSubstitutionOperation} from './prepare-native-substitution-copy.mjs';
import {prepareTextOwnedReceiverAdoptionSources} from './prepare-text-owned-receiver-adoption-sources.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareTextCharacterPatternAdoptionSources({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/text-character-pattern-adoption/complete-originals-and-rules.json.gz',pin:'eddf21128d47565c70d2f7221cf40a27cf62248046d4b088104f55642b848b2a',id:'router:text-character-pattern-adoption-complete-source-substitutions-v1',laterPlans:[prepareTextOwnedReceiverAdoptionSources({root})]}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareTextCharacterPatternAdoptionSources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&plan.files.some(row=>row.current!==row.currentAfter))throw new TypeError('Text character pattern adoption source copy differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
