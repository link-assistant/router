// Complete source equations only; native copies and semantic checks stay separate.
import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {ownershipCompiler} from './js-to-rust/vendor/module-syntax.mjs';
import {transportConcreteNamedSourcePhases} from './concrete-named-phases.mjs';

const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const PATH='tools/translation/prepare-core-ascii-sources.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
const fail=message=>{throw TypeError('Named core ASCII producer: '+message);};
const once=(source,before,after)=>{if(source.split(before).length!==2)fail('unique complete native selection differs');return source.replace(before,()=>after);};
function original(){
 const packed=readFileSync(new URL('./source-profiles/named-core-ascii-producer/original.mjs.gz',import.meta.url));
 if(packed.length!==4215||hash(packed)!=='d272e0773fe1864ec6dc0cebe015325763f17de92d70df2089dfb13c1b6a8b22')fail('complete original archive differs');
 const raw=gunzipSync(packed,{maxOutputLength:16384});
 if(raw.length!==11398||hash(raw)!=='e61113f9a6c2069527b6b1a7a9a595fa58db7310edc4f1d5dff137ef67eae157')fail('complete original source differs');
 return new TextDecoder('utf8',{fatal:true,ignoreBOM:true}).decode(raw);
}
function grammar(ts,source){const file=ts.createSourceFile(PATH,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);if(file.parseDiagnostics.length)fail('complete native grammar differs');return file;}
export function prepareNamedCoreAsciiProducer({root=ROOT}={}){
 root=resolve(root);const ts=ownershipCompiler();if(ts.version!=='5.9.3')fail('installed TypeScript 5.9.3 required');
 const before=original(),file=grammar(ts,before);
 const fn=name=>{const rows=file.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text===name);if(rows.length!==1)fail('one complete native function required: '+name);return rows[0];};
 const helper=fn('prepare'),text=helper.getText(file),at=text.indexOf(' let current=null;');
 if(at<0)fail('complete current-source read required');
 const tail=once(text.slice(at),'afterMeta:serializeConcreteSyntaxMeta(document)','afterMeta');
 const helperAfter="function prepare(row,after,root,ts,equation){\n const before=row.source,language=row.path.endsWith('.rs')?'Rust':'JavaScript';\n if(equation.before!==before||equation.middle!==before||equation.after!==after||equation.inverse!==before)fail('complete named source equation differs');\n const beforeMeta=equation.beforeMeta,afterMeta=equation.afterMeta,stages=equation.stages.map(({phase,before,after,beforeMeta,afterMeta,trace})=>({phase,before,after,beforeMeta,afterMeta,trace,completeInverse:true}));\n "+tail;
 const names=['owned-ascii:retain-complete-inputs','router-core:explicit-ascii-membership','owned-ascii:restore-language-input','router-core:restore-complete-before-ascii'];
 const entry=fn('prepareCoreAsciiSources');let entryAfter=entry.getText(file);
 const equations='const equations=transportConcreteNamedSourcePhases(rows.map(row=>({before:row.source,middle:row.source,after:after[row.path],language:row.path.endsWith(\'.rs\')?\'Rust\':\'JavaScript\',rules:'+JSON.stringify(names)+'})));';
 entryAfter=once(entryAfter,'after=afterSources(rows);','after=afterSources(rows);'+equations);
 entryAfter=once(entryAfter,'rows.map(row=>prepare(row,after[row.path],root,ts))','rows.map((row,at)=>prepare(row,after[row.path],root,ts,equations[at]))');
 const nativeEdits=[[helper,helperAfter],[entry,entryAfter]].map(([node,replacement])=>({span:[node.getStart(file),node.end],expected:node.getText(file),replacement}));
 let middle=before;for(const edit of [...nativeEdits].sort((a,b)=>b.span[0]-a.span[0])){
  if(middle.slice(...edit.span)!==edit.expected)fail('complete native span changed');
  middle=middle.slice(0,edit.span[0])+edit.replacement+middle.slice(edit.span[1]);
 }
 const after=once(middle,"import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,serializeConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions} from './concrete-syntax-meta.mjs';","import {transportConcreteNamedSourcePhases} from './concrete-named-phases.mjs';");
 grammar(ts,middle);grammar(ts,after);const current=readFileSync(resolve(root,PATH),'utf8');
 if(current!==before&&current!==after)fail('unknown complete physical source');
 const [equation]=transportConcreteNamedSourcePhases([{before,middle,after,language:'JavaScript',rules:['language:batch-complete-original-core-ascii-equations','repository:import-named-core-ascii-source-transaction','language:restore-complete-original-core-ascii-producer','repository:restore-complete-original-core-ascii-imports']}]);
 if(equation.inverse!==before||original()!==before)fail('complete original source or inverse differs');
 return {schema:'named-core-ascii-source-producer-v1',path:PATH,before,middle,after,current,nativeEdits,equation,originalRuleNames:names,typescriptVersion:ts.version,newVerdictCaches:false,nativeRustExecuted:false,semanticAuthority:false};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const mode=process.argv.slice(2).join(' ');if(!['--write','--check'].includes(mode))fail('use --write|--check');
 const plan=prepareNamedCoreAsciiProducer();
 if(mode==='--write'){if(readFileSync(resolve(ROOT,PATH),'utf8')!==plan.current)fail('physical source changed before installation');writeFileSync(resolve(ROOT,PATH),plan.after);}
 else if(plan.current!==plan.after)fail('complete named core ASCII producer is stale');
 console.log(JSON.stringify({path:PATH,sha256:hash(plan.after),semanticAuthority:false}));
}
