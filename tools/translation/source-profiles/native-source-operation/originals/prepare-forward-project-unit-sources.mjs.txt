import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy} from './prepare-native-substitution-copy.mjs';
import {prepareEnclosingToolContextSources} from './prepare-enclosing-tool-context-sources.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareForwardProjectUnitSources({root=ROOT}={}){
 return prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/forward-project-unit/complete-originals-and-rules.json.gz',pin:'177fc475e67aa839f82e28a50873bc868a96630d2eb0172e191e3135cdab6d57',id:'router:forward-project-unit-complete-source-substitutions-v1',laterPlans:[prepareEnclosingToolContextSources({root})]});
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareForwardProjectUnitSources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&plan.files.some(row=>row.current!==row.currentAfter))throw new TypeError('Forward project unit source copy differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
