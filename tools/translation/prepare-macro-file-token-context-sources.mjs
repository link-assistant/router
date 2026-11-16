import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy,withNativeSubstitutionOperation} from './prepare-native-substitution-copy.mjs';
import {prepareArchitectureDocFileTokenSources} from './prepare-architecture-doc-file-token-sources.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareMacroFileTokenContextSources({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/macro-file-token-context/complete-originals-and-rules.json.gz',pin:'bc11bc35b7f69b7adf4db5e789bba7323ad3ba727a71049cc01d2c9a20e7b3b0',id:'router:macro-file-token-context-complete-source-substitutions-v1',laterPlans:[prepareArchitectureDocFileTokenSources({root})]}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareMacroFileTokenContextSources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&plan.files.some(row=>row.current!==row.currentAfter))throw new TypeError('Macro file token context source copy differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
