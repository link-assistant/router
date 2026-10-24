import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy} from './prepare-native-substitution-copy.mjs';
import {prepareOwnedNumericAbi} from './prepare-owned-numeric-abi.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareJsonFieldSources({root=ROOT}={}){
 return prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/json-fields/complete-originals-and-rules.json.gz',pin:'f2b286c20b76d847f3896b574b70f121822821c35ea98ba28e7b1d79b00d8a30',id:'router:json-field-source-substitutions-v1',laterPlans:[prepareOwnedNumericAbi({root})]});
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareJsonFieldSources();
 if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&plan.files.some(row=>row.current!==row.currentAfter))throw new TypeError('JSON field source substitutions are stale');
 console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
