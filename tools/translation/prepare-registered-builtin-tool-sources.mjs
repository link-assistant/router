import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy,withNativeSubstitutionOperation} from './prepare-native-substitution-copy.mjs';
import {preparePassiveMacroAttributeSources} from './prepare-passive-macro-attribute-sources.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareRegisteredBuiltinToolSources({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/registered-builtin-tool-contexts/complete-originals-and-rules.json.gz',pin:'b250c55e7c77c98dfcf1d3fce8f0f4b6ecd5c5e8a4d5cda8246ca694a80ed82d',id:'router:registered-builtin-tool-complete-source-substitutions-v1',laterPlans:[preparePassiveMacroAttributeSources({root})]}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareRegisteredBuiltinToolSources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&[...plan.files,...plan.descendantFiles].some(row=>row.current!==row.currentAfter))throw new TypeError('Registered builtin tool source copy differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
