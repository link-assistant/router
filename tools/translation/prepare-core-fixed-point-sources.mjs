import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy,withNativeSubstitutionOperation} from './prepare-native-substitution-copy.mjs';
import {preparePrimitiveCoreCallSources} from './prepare-primitive-core-call-sources.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareCoreFixedPointSources({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/core-fixed-point-source/complete-originals-and-rules.json.gz',pin:'574f3a52d441653316f07922e5063d333f728a570e8be39afda34891e098e106',id:'router:core-fixed-point-source-complete-source-substitutions-v1',laterPlans:[preparePrimitiveCoreCallSources({root})]}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareCoreFixedPointSources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&plan.files.some(row=>row.current!==row.currentAfter))throw new TypeError('Core fixed point source copy differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
