import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy,withNativeSubstitutionOperation,nativeSubstitutionCopyHasChanges} from './prepare-native-substitution-copy.mjs';
import {prepareNativeCodexBridgeSources} from './prepare-native-codex-bridge-sources.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareNativeClientGlobalSources({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>{const inputs=readNativeInputs(root),plan=prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/native-client-global/complete-originals-and-rules.json.gz',pin:'49092a69f4dc525a07df060e9674f5bf4ad743189dfae39c0deb25c71107d430',id:'router:native-client-global-complete-source-substitutions-v1',laterPlans:[prepareNativeCodexBridgeSources({root})]});for(const row of inputs)assertNativeSourceProvenanceCurrent(root,row);return {...plan,nativeInputs:inputs,rustExecuted:false};});
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareNativeClientGlobalSources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&nativeSubstitutionCopyHasChanges(plan))throw new TypeError('Native client global source differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}

import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta} from './concrete-syntax-meta.mjs';
function readNativeInputs(root){
 const bytes=readFileSync(resolve(root,'tools/translation/source-profiles/native-client-global/native-inputs.json'));if(createHash('sha256').update(bytes).digest('hex')!=='c75d8e390cd2ae33a5eccaf21a6e2fe8e9777a6eba50e2d346ebaef83719c53a')throw new TypeError('Complete native client source provenance differs');const data=JSON.parse(bytes);return data.files.map(row=>{const originalSource=readFileSync(resolve(root,row.originalPath),'utf8');if(Buffer.byteLength(originalSource)!==row.bytes||createHash('sha256').update(originalSource).digest('hex')!==row.sha256)throw new TypeError('Actual complete native original input differs');const joined=currentNativeSourceProvenance(root,{...row,source:originalSource}),source=joined.source;const concrete=transportConcreteSyntaxSource(source,{language:joined.language});if(transportConcreteSyntaxMeta(concrete.meta).source!==source)throw new TypeError('Complete native client CST inverse differs');return {...row,...joined,originalBytes:row.bytes,originalSha256:row.sha256,bytes:Buffer.byteLength(source),sha256:createHash('sha256').update(source).digest('hex'),source,concreteSyntax:concrete.meta,sourceAuthority:false,semanticAuthority:false};});
}

import {currentNativeSourceProvenance,assertNativeSourceProvenanceCurrent} from './native-source-history.mjs';
