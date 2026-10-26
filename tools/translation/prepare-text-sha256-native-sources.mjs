// Native source construction only; all Rust checks remain CI-only and unrun.
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {sourceItems} from './rust-structure.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
import {transportConcreteSourceEquations} from './concrete-source-equations.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url)),ARCHIVE='tools/translation/source-profiles/text-sha256/complete-native-original.json.gz',PIN='e9f8abf74f86ea1d450797bac28e088a7b462d945de5bda054a51df091bc1884',ADDITION="\n/// SHA-256 of scalar UTF-8 text, encoded with the unpadded URL alphabet.\n/// Native dependency internals remain outside application translation.\n#[must_use]\npub fn sha256_base64_url_no_pad(value: &str) -> String {\n    use ::sha2::Digest as _;\n    ::base64::Engine::encode(\n        &::base64::engine::general_purpose::URL_SAFE_NO_PAD,\n        ::sha2::Sha256::digest(value.as_bytes()),\n    )\n}\n";
const hash=value=>createHash('sha256').update(value).digest('hex'),need=(value,message)=>{if(!value)throw new TypeError('Text SHA256 native source: '+message);};
export function prepareTextSha256NativeSources({root=ROOT}={}){
 root=resolve(root);const packed=readFileSync(resolve(root,ARCHIVE));need(packed.length<=1048576&&hash(packed)===PIN,'complete native original archive differs');const original=JSON.parse(gunzipSync(packed,{maxOutputLength:2097152}).toString('utf8'));
 need(original.schema==='text-sha256-native-original-v1'&&original.path==='rust/src/translation_text_core.rs'&&typeof original.source==='string'&&hash(original.source)===original.sha256,'complete native original source differs');const before=original.source;need(!sourceItems(before).some(item=>item.name==='sha256_base64_url_no_pad'),'new operation must be absent from complete original');
 const language=before+ADDITION.replace('pub fn sha256_base64_url_no_pad','fn sha256_base64_url_no_pad'),after=before+ADDITION;
 const run=createRulePipeline([{phase:'language',rules:[{id:'rust:text-sha256-private-library-operation',apply:value=>{need(value===before,'whole original join');return language;}}]},{phase:'repository',rules:[{id:'router:publish-concrete-text-sha256-operation',apply:value=>{need(value===language,'whole language join');return after;}}]}]).run(before);
 const stages=transportConcreteSourceEquations([{before,after:language,language:'Rust'},{before:language,after,language:'Rust'}]).map((row,at)=>({...row,phase:at?'repository':'language'})),current=readFileSync(resolve(root,original.path),'utf8');need(run.value===after&&(current===before||current===after),'complete current native source differs');need(stages[0].inverse===before&&stages[1].inverse===language,'complete native CST inverse differs');
 const actual=sourceItems(after).filter(item=>item.term==='fn'&&item.name==='sha256_base64_url_no_pad');need(actual.length===1,'one concrete native operation required');need(readFileSync(resolve(root,ARCHIVE)).equals(packed)&&readFileSync(resolve(root,original.path),'utf8')===current,'original native inputs changed during construction');return {path:original.path,before,language,after,current,stages,trace:run.trace,inverse:before,nativeRustGrammarChecked:false,sourceAuthority:false,semanticAuthority:false,rustExecuted:false,receivingExecuted:false};
}
