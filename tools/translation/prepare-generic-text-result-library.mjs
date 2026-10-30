// Fresh complete library source proposal only. No native compilation or admission.
import {readFileSync,writeFileSync,lstatSync,realpathSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRulePipeline} from './rule-pipeline.mjs';
import {transportConcreteSourceEquations} from './concrete-source-equations.mjs';
import {OWNED_RESULT_NATIVE_SOURCE,OWNED_RESULT_RUNTIME_SOURCE,OWNED_RESULT_DECLARATIONS_SOURCE} from './owned-result-native-source.mjs';
import {GENERIC_TEXT_RESULT_RUST_FRAGMENT,GENERIC_TEXT_RESULT_JAVASCRIPT_FRAGMENT,GENERIC_TEXT_RESULT_TYPESCRIPT_FRAGMENT} from './generic-text-result-source-fragments.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url)),ARCHIVE='tools/translation/source-profiles/generic-text-result-foundation/complete-library-originals.json.gz',PIN='866bc4ebac4bdb6cbd5f795702a8235c17b1376f2c0c0e59a626361f2f5a93ac';
const hash=source=>createHash('sha256').update(source).digest('hex');
function readLibrary(root,path){
 const absolute=resolve(root,path),before=lstatSync(absolute);if(!before.isFile()||before.isSymbolicLink()||before.size>2097152)throw new TypeError('Bounded ordinary generic String-error Result library input required');const raw=readFileSync(absolute),after=lstatSync(absolute);if(raw.length!==before.size||before.dev!==after.dev||before.ino!==after.ino||before.mode!==after.mode||before.size!==after.size||before.mtimeMs!==after.mtimeMs||before.ctimeMs!==after.ctimeMs)throw new TypeError('Actual generic String-error Result library input changed');return raw;
}
export function prepareGenericTextResultLibrary({root=ROOT}={}){
 root=resolve(root);if(realpathSync(root)!==root)throw new TypeError('Physical generic String-error Result source root required');const packed=readLibrary(root,ARCHIVE);if(hash(packed)!==PIN)throw new TypeError('Complete original generic String-error Result library source archive differs');const original=JSON.parse(gunzipSync(packed,{maxOutputLength:2097152}));if(original.schema!=='generic-text-result-library-originals-v1'||original.files.length!==3)throw new TypeError('Complete original three-language library required');
 const expected=[['rust/src/translation_owned_results_core.rs','Rust',GENERIC_TEXT_RESULT_RUST_FRAGMENT,OWNED_RESULT_NATIVE_SOURCE],['tools/translation/owned-result-runtime.mjs','JavaScript',GENERIC_TEXT_RESULT_JAVASCRIPT_FRAGMENT,OWNED_RESULT_RUNTIME_SOURCE],['tools/translation/owned-result-runtime.d.mts','TypeScript',GENERIC_TEXT_RESULT_TYPESCRIPT_FRAGMENT,OWNED_RESULT_DECLARATIONS_SOURCE]];
 const files=original.files.map((row,at)=>{
  const [path,language,fragment,mirror]=expected[at];if(row.path!==path||row.language!==language||row.fragment!==fragment||typeof row.source!=='string'||Buffer.byteLength(row.source)!==row.bytes||hash(row.source)!==row.sha256)throw new TypeError('Complete original library source coordinates differ');
  const run=createRulePipeline([{phase:'language',rules:[{id:'generic-text-result:add-original-unchanged-carrier-operation-'+language,apply:source=>source+fragment}]},{phase:'repository',rules:[{id:'router:join-complete-library-mirror-'+language,apply:source=>{if(language==='Rust'?source!==mirror:mirror!==row.source&&mirror!==source)throw new TypeError('Whole generic String-error Result library mirror differs');return source;}}]}]).run(row.source),current=readLibrary(root,path).toString('utf8'),equation=transportConcreteSourceEquations([{before:row.source,after:run.value,language}])[0];if(equation.inverse!==row.source||current!==row.source&&current!==run.value)throw new TypeError('Original/current complete library source or inverse differs');return {path,language,before:row.source,after:run.value,current,inverse:row.source,equation,trace:run.trace};
 });
 if(!readLibrary(root,ARCHIVE).equals(packed)||files.some(row=>readLibrary(root,row.path).toString('utf8')!==row.current))throw new TypeError('Complete original library inputs changed');return {schema:'generic-text-result-complete-library-source-proposal-v1',files,sourceAuthority:false,semanticAuthority:false,rustExecuted:false,receivingExecuted:false};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const proposal=prepareGenericTextResultLibrary();if(args[0]==='--write')for(const row of proposal.files)writeFileSync(resolve(ROOT,row.path),row.after);if(args[0]==='--check'&&proposal.files.some(row=>row.current!==row.after))throw new TypeError('Complete generic Option library source differs');console.log(JSON.stringify(args[0]==='--emit'?proposal:{schema:proposal.schema,files:proposal.files.map(row=>row.path),receivingExecuted:false}));
}
