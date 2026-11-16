import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy} from './prepare-native-substitution-copy.mjs';
import {prepareScalarBodySources} from './prepare-scalar-body-sources.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareReturnCallSources({root=ROOT}={}){
 return prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/return-calls/complete-originals-and-rules.json.gz',pin:'2979aedc0b5e8a4f7bba1ae729ccbe978fd21a50e3f417513f81e7445410f040',id:'router:return-calls-complete-source-substitutions-v1',laterPlans:[prepareScalarBodySources({root})]});
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareReturnCallSources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&plan.files.some(row=>row.current!==row.currentAfter))throw new TypeError('Return call source copy differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
