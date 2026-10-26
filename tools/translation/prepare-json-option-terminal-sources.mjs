import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy,withNativeSubstitutionOperation} from './prepare-native-substitution-copy.mjs';
import {prepareJsonPredicateSources} from './prepare-json-predicate-sources.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareJsonOptionTerminalSources({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/json-option-terminals/complete-originals-and-rules.json.gz',pin:'53e5e280d96e938e43a188829384f0c3aa0e42088991aa26c47d091f0bdd3cc7',id:'router:json-option-terminals-complete-source-substitutions-v1',laterPlans:[prepareJsonPredicateSources({root})]}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareJsonOptionTerminalSources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&plan.files.some(row=>row.current!==row.currentAfter))throw new TypeError('JSON Option terminals source copy differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
