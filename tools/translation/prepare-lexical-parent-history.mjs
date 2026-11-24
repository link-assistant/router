// Copy the complete already-qualified Git/CST fixture implementation through
// ordered source rules. These are test DATA, never compiler admission facts.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {ownershipCompiler} from './js-to-rust/vendor/module-syntax.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,serializeConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions} from './concrete-syntax-meta.mjs';
export const LEXICAL_PARENT_REVISION='5de1dea8b777dcd6e637758efc2c260150735af5';
export const LEXICAL_PARENT_PATHS=Object.freeze(['src/bridge_request.rs','src/chat_admin.rs','src/login_pty_backend.rs','src/mpp.rs','src/provider_import.rs']);
const hash=value=>createHash('sha256').update(value).digest('hex');
const fail=message=>{throw new TypeError('Lexical parent history source: '+message);};
function copy(template,expectedSha256,language,repository,path){
 if(hash(template)!==expectedSha256)fail('complete qualified original template changed');const ts=ownershipCompiler();if(ts.version!=='5.9.3')fail('installed TypeScript5.9.3 required');
 const changes=[];function substitute(source,rules,phase){for(const [before,after]of rules){const count=source.split(before).length-1;if(count<1)fail('complete copy rule has no source preimage');source=source.split(before).join(after);changes.push({phase,before,after,count});}return source;}
 const pipeline=createRulePipeline([{phase:'language',rules:[{id:'javascript:copy-complete-owned-helper-bindings-and-Rust-CST-domain',apply:source=>substitute(source,language,'language')}]},{phase:'repository',rules:[{id:'receiving:fixed-five-parent-Git-source-domain-and-pins',apply:source=>substitute(source,repository,'repository')}]}]),run=pipeline.run(template),source=run.value;
 if(ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS).parseDiagnostics.length||source.split('\n').length>=1000)fail('complete native copied source grammar and size');
 const first=transportConcreteSyntaxSource(template,{language:'JavaScript'}),copied=applyConcreteSyntaxSubstitutions(first.document,{languageRules:[{id:'javascript:complete-qualified-template-source',edits:[]}],repositoryRules:[{id:'receiving:whole-native-copy-and-exact-source-inverse',edits:[{span:[0,template.length],expected:template,replacement:source}]}]}),beforeMeta=serializeConcreteSyntaxMeta(first.document),afterMeta=serializeConcreteSyntaxMeta(copied.value);if(transportConcreteSyntaxMeta(afterMeta).source!==source)fail('whole copied source reparse');
 const reversed=applyConcreteSyntaxSubstitutions(copied.value,{languageRules:[],repositoryRules:[{id:'receiving:restore-whole-qualified-template',edits:[{span:[0,source.length],expected:source,replacement:template}]}]});if(transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(reversed.value)).source!==template)fail('complete qualified source inverse');
 return {path,template,source,beforeMeta,afterMeta,inverse:template,changes,trace:run.trace,sourceSha256:expectedSha256,sha256:hash(source),compilerAuthority:false};
}
export function prepareLexicalParentHistorySources({archiveSha256,objectCount}={}){
 if(typeof archiveSha256!=='string'||!/^[a-f0-9]{64}$/u.test(archiveSha256)||!Number.isSafeInteger(objectCount)||objectCount<1||objectCount>32)fail('complete captured archive SHA and original object bound required');
 const shared=[['NAMED_HOST','LEXICAL_PARENT'],['NamedHost','LexicalParent'],['named-host','lexical-parent'],['named host','lexical parent'],['Named host','Lexical parent']];
 const helper=readFileSync(new URL('./test/portable-named-host-history.mjs',import.meta.url),'utf8'),unit=readFileSync(new URL('./test/portable-named-host-history.test.mjs',import.meta.url),'utf8');
 const helperRules=[...shared.filter(([before])=>helper.includes(before)),["language:'JavaScript'","language:'Rust'"]],helperRepository=[['077889e3fb2ad2d4f3a96c756bf6087ef17678b1',LEXICAL_PARENT_REVISION],["['tools/translation/host-assets.mjs','tools/translation/js-to-rust/owned-core-source.mjs']",JSON.stringify(LEXICAL_PARENT_PATHS)],['2555cc68b267efdcbc0f45eaf9a2ed9ffcd492bec5d5c6baf7374e1ab2a96cd7',archiveSha256],['select-two-genuine-lexical-parent-history-sources','select-five-genuine-lexical-parent-history-sources']];
 // Every retained shared substitution must actually occur in each template.
 const unitShared=shared.filter(([before])=>unit.includes(before)),unitRepository=[['keeps both complete original Git source bodies and native CSTs','keeps all five complete original Git source bodies and Rust CSTs'],['record.objects.size,8','record.objects.size,'+objectCount],["assert.deepEqual(ts.createSourceFile(row.path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS).parseDiagnostics,[])","assert.equal(transportConcreteSyntaxMeta(row.meta).document.language,'Rust')"]];
 return {schema:'complete-copied-lexical-parent-history-source-proposal-v1',files:[copy(helper,'8ecbf62f51b2f67ff06daadc7753e3414d4082bfe68e03b87934253f480c43c9',helperRules,helperRepository,'tools/translation/test/portable-lexical-parent-history.mjs'),copy(unit,'39050f6a72fe54940cfd04ce14270f3987395afc5493d38edcdff26a234d16b0',unitShared,unitRepository,'tools/translation/test/portable-lexical-parent-history.test.mjs')],archiveSha256,objectCount,originalObjectAndSourceBoundsUnchanged:true,sourceInstalled:false,runtimeAuthority:false,rustExecuted:false};
}
