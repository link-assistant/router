import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy,withNativeSubstitutionOperation} from './prepare-native-substitution-copy.mjs';
import {prepareJsonOptionTerminalSources} from './prepare-json-option-terminal-sources.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareConditionPatternSources({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/condition-patterns/complete-originals-and-rules.json.gz',pin:'9853998c1074caabbdf33c7c00dadc719d502478d0ea1dc61a9c430768fb54d7',id:'router:condition-patterns-complete-source-substitutions-v1',laterPlans:[prepareJsonOptionTerminalSources({root})]}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareConditionPatternSources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&plan.files.some(row=>row.current!==row.currentAfter))throw new TypeError('Condition patterns source copy differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
