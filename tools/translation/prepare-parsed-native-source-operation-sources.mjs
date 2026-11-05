import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy,withNativeSubstitutionOperation} from './prepare-native-substitution-copy.mjs';
import {prepareTextCharacterPatternAdoptionSources} from './prepare-text-character-pattern-adoption-sources.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareParsedNativeSourceOperationSources({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/parsed-native-source-operation/complete-originals-and-rules.json.gz',pin:'7890d1d5a249aba58ddeab82fe9e8e8d3e2462b3849978b808e886b49b208011',id:'router:parsed-native-source-operation-complete-source-substitutions-v1',laterPlans:[prepareTextCharacterPatternAdoptionSources({root})]}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareParsedNativeSourceOperationSources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&plan.files.some(row=>row.current!==row.currentAfter))throw new TypeError('Parsed native source operation source copy differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
