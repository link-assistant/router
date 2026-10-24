import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy} from './prepare-native-substitution-copy.mjs';
import {prepareNativeClassSourceOwners} from './prepare-native-class-source-owners.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareForwardJsonIteration({root=ROOT}={}){
 const sourceOwnerLayer=prepareNativeClassSourceOwners({root});if(sourceOwnerLayer.files.some(row=>row.current!==row.currentAfter))throw new TypeError('The actual class-owner selector must be installed before the forward source proposal');const plan=prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/forward-json-iteration/complete-originals-and-rules.json.gz',pin:'0f0be3712d157f97360fdbff8db0776f2085ff0fcd7c2dbc8a648d9db47a3059',id:'router:forward-json-iteration-source-copy-v1'});return {...plan,sourceOwnerLayer};return {...plan,sourceOwnerLayer};return {...plan,sourceOwnerLayer};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');
 const plan=prepareForwardJsonIteration();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});
 if(args[0]==='--check'&&plan.files.some(row=>row.current!==row.currentAfter))throw new TypeError('Forward JSON iteration source copy is stale');
 console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
