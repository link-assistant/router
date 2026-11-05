import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy} from './prepare-native-substitution-copy.mjs';
import {prepareOwnedControlSources} from './prepare-owned-control-sources.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareFilesystemControlSources({root=ROOT}={}){
 return prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/filesystem-control/complete-originals-and-rules.json.gz',pin:'a9c08e5263fa5adb2fbc2b42fc5b44900bfc25259fc9e0f58521701a749dc555',id:'router:filesystem-control-complete-source-substitutions-v1',laterPlans:[prepareOwnedControlSources({root})]});
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareFilesystemControlSources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&plan.files.some(row=>row.current!==row.currentAfter))throw new TypeError('Filesystem control sources are stale');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
