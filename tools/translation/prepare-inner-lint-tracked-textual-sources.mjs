import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy,withNativeSubstitutionOperation} from './prepare-native-substitution-copy.mjs';
import {prepareLiteralDocumentationFoundationSources} from './prepare-literal-documentation-foundation-sources.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareInnerLintTrackedTextualSources({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/inner-lint-tracked-textual/complete-originals-and-rules.json.gz',pin:'34c3dd4ceb160f3753390c209599b940f00d472f18afc399de354a23ebe1b05e',id:'router:inner-lint-tracked-textual-complete-source-substitutions-v1',laterPlans:[prepareLiteralDocumentationFoundationSources({root})]}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareInnerLintTrackedTextualSources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&[...plan.files,...plan.descendantFiles].some(row=>row.current!==row.currentAfter))throw new TypeError('Inner lint tracked textual source copy differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
