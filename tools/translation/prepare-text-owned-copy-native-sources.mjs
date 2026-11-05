// Native source construction only; all Rust checks remain CI-only and unrun.
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {sourceItems} from './rust-structure.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
import {transportConcreteSourceEquations} from './concrete-source-equations.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url)),ARCHIVE='tools/translation/source-profiles/text-owned-copy/complete-native-original.json.gz',PIN='a728c931d17fd3b166146d17c437f1468b88b2973d12ff12c96bcdb247fb8870',ADDITION="\n/// Copy a bounded UTF-8 value into independent owned String storage.\n#[must_use]\npub fn to_owned(value: &str) -> String {\n    checked(value);\n    value.to_owned()\n}\n";
const hash=value=>createHash('sha256').update(value).digest('hex'),need=(value,message)=>{if(!value)throw new TypeError('Text owned copy native source: '+message);};
export function prepareTextOwnedCopyNativeSources({root=ROOT}={}){
 root=resolve(root);const packed=readFileSync(resolve(root,ARCHIVE));need(packed.length<=1048576&&hash(packed)===PIN,'complete native original archive differs');const original=JSON.parse(gunzipSync(packed,{maxOutputLength:2097152}).toString('utf8'));
 need(original.schema==='text-owned-copy-native-original-v1'&&original.path==='rust/src/translation_text_core.rs'&&typeof original.source==='string'&&hash(original.source)===original.sha256,'complete native original source differs');const before=original.source;need(!sourceItems(before).some(item=>TEXT_OWNED_COPY_NAMES.includes(item.name)),'new operation must be absent from complete original');
 const language=before+ADDITION.replaceAll('pub fn ','fn '),after=before+ADDITION;
 const run=createRulePipeline([{phase:'language',rules:[{id:'rust:text-owned-copy-private-library-operation',apply:value=>{need(value===before,'whole original join');return language;}}]},{phase:'repository',rules:[{id:'router:publish-concrete-text-owned-copy-operation',apply:value=>{need(value===language,'whole language join');return after;}}]}]).run(before);
 const stages=transportConcreteSourceEquations([{before,after:language,language:'Rust'},{before:language,after,language:'Rust'}]).map((row,at)=>({...row,phase:at?'repository':'language'})),current=readFileSync(resolve(root,original.path),'utf8'),later=prepareTextConsumingNativeSources({root,source:current===before?after:null});need(after===later.before,'complete later native source join');need(run.value===after&&(current===before||current===after||current===later.after),'complete current native source differs');need(stages[0].inverse===before&&stages[1].inverse===language,'complete native CST inverse differs');
 const actual=sourceItems(after).filter(item=>item.term==='fn'&&TEXT_OWNED_COPY_NAMES.includes(item.name));need(actual.length===TEXT_OWNED_COPY_NAMES.length&&TEXT_OWNED_COPY_NAMES.every(name=>actual.filter(item=>item.name===name).length===1),'all concrete native text operations required');need(readFileSync(resolve(root,ARCHIVE)).equals(packed)&&readFileSync(resolve(root,original.path),'utf8')===current,'original native inputs changed during construction');return {path:original.path,before,language,after:later.after,originalAfter:after,current,stages,laterHistories:[later],trace:run.trace,inverse:before,nativeRustGrammarChecked:false,sourceAuthority:false,semanticAuthority:false,rustExecuted:false,receivingExecuted:false};
}

const TEXT_OWNED_COPY_NAMES=["to_owned"];

import {prepareTextConsumingNativeSources} from './prepare-text-consuming-native-sources.mjs';
