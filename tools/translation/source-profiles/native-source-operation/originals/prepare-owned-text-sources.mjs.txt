import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy} from './prepare-native-substitution-copy.mjs';
import {prepareOwnedTextFlowSources} from './prepare-owned-text-flow-sources.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareOwnedTextSources({root=ROOT}={}){
 return prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/owned-text/complete-originals-and-rules.json.gz',pin:'f487452e94a6d218f7577b7900830abfff3840bf1df162fd0e2f095b3e807178',id:'router:owned-text-complete-source-substitutions-v1',laterPlans:[prepareOwnedTextFlowSources({root})]});
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareOwnedTextSources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&plan.files.some(row=>row.current!==row.currentAfter))throw new TypeError('Owned text source draft differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
