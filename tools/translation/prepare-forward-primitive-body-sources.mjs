import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy,withNativeSubstitutionOperation} from './prepare-native-substitution-copy.mjs';
import {prepareForwardPrimitiveProjectSources} from './prepare-forward-primitive-project-sources.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareForwardPrimitiveBodySources({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/forward-primitive-body/complete-originals-and-rules.json.gz',pin:'ac442cdd517b8b0808dc9773edb4a37153cc61261c9730ae2c1ca2db836595d4',id:'router:forward-primitive-body-complete-source-substitutions-v1',laterPlans:[prepareForwardPrimitiveProjectSources({root})]}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareForwardPrimitiveBodySources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&plan.files.some(row=>row.current!==row.currentAfter))throw new TypeError('Forward primitive body source copy differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
