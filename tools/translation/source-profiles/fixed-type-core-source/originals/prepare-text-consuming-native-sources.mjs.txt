// Native source construction only; all Rust checks remain CI-only and unrun.
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {sourceItems} from './rust-structure.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
import {transportConcreteSourceEquations} from './concrete-source-equations.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url)),ARCHIVE='tools/translation/source-profiles/text-consuming-source/complete-native-original.json.gz',PIN='e2594238844890eea93cbd27ec0e61a696c9231456991121015fca59587d8838',ADDITION="\n/// Consume and append while retaining the original String allocation.\n#[must_use]\npub fn append_owned(mut value: String, suffix: &str) -> String {\n    checked(&value);\n    checked(suffix);\n    assert!(value.len() <= LIMIT - suffix.len(), \"text output bound\");\n    value.push_str(suffix);\n    value\n}\n\n/// Consume and clear while retaining the original String capacity.\n#[must_use]\npub fn clear_owned(mut value: String) -> String {\n    checked(&value);\n    value.clear();\n    value\n}\n";
const hash=value=>createHash('sha256').update(value).digest('hex'),need=(value,message)=>{if(!value)throw new TypeError('Text consuming native source: '+message);};
export function prepareTextConsumingNativeSources({root=ROOT,source=null}={}){
 need(source===null||typeof source==='string','optional current native source DATA');root=resolve(root);const packed=readFileSync(resolve(root,ARCHIVE));need(packed.length<=1048576&&hash(packed)===PIN,'complete native original archive differs');const original=JSON.parse(gunzipSync(packed,{maxOutputLength:2097152}).toString('utf8'));
 need(original.schema==='text-consuming-native-original-v1'&&original.path==='rust/src/translation_text_core.rs'&&typeof original.source==='string'&&hash(original.source)===original.sha256,'complete native original source differs');const before=original.source;need(!sourceItems(before).some(item=>TEXT_CONSUMING_NAMES.includes(item.name)),'new operation must be absent from complete original');
 const language=before+ADDITION.replaceAll('pub fn ','fn '),after=before+ADDITION;
 const run=createRulePipeline([{phase:'language',rules:[{id:'rust:text-consuming-source-private-library-operation',apply:value=>{need(value===before,'whole original join');return language;}}]},{phase:'repository',rules:[{id:'router:publish-concrete-text-consuming-source-operation',apply:value=>{need(value===language,'whole language join');return after;}}]}]).run(before);
 const stages=transportConcreteSourceEquations([{before,after:language,language:'Rust'},{before:language,after,language:'Rust'}]).map((row,at)=>({...row,phase:at?'repository':'language'})),current=(source===null?readFileSync(resolve(root,original.path),'utf8'):source);need(run.value===after&&(current===before||current===after),'complete current native source differs');need(stages[0].inverse===before&&stages[1].inverse===language,'complete native CST inverse differs');
 const actual=sourceItems(after).filter(item=>item.term==='fn'&&TEXT_CONSUMING_NAMES.includes(item.name));need(actual.length===TEXT_CONSUMING_NAMES.length&&TEXT_CONSUMING_NAMES.every(name=>actual.filter(item=>item.name===name).length===1),'all concrete native text operations required');need(readFileSync(resolve(root,ARCHIVE)).equals(packed)&&(source===null?readFileSync(resolve(root,original.path),'utf8'):source)===current,'original native inputs changed during construction');return {path:original.path,before,language,after,current,stages,trace:run.trace,inverse:before,nativeRustGrammarChecked:false,sourceAuthority:false,semanticAuthority:false,rustExecuted:false,receivingExecuted:false};
}

const TEXT_CONSUMING_NAMES=["append_owned","clear_owned"];
