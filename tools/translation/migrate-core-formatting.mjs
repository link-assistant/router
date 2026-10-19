import {rustPackageSourcePath} from './repository-layout.mjs';
// Propose an explicit repository adoption of the owned compatibility facade.
// This changes application source; it is not standard-library owner inference.
import {readFileSync,writeFileSync,mkdirSync,realpathSync,lstatSync,rmdirSync} from 'node:fs';
import {resolve,join,dirname,basename} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {types} from 'node:util';
import {rustTokens,sourceItems} from './rust-structure.mjs';
import {macroProvenance} from './macro-provenance.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions,serializeConcreteSyntaxMeta} from './concrete-syntax-meta.mjs';

const hash=source=>createHash('sha256').update(source).digest('hex');
const fail=message=>{throw new TypeError('Core formatting migration: '+message);};
const attributeNames=new Set(['doc','must_use','cfg','allow','warn','deny','forbid','inline','cold','test']);
function attributes(tokens,{macroUse=false}={}){
  for(let at=0;at<tokens.length;at++)if(tokens[at].text==='#'&&(tokens[at+1]?.text==='['||tokens[at+1]?.text==='!')){
    const open=at+(tokens[at+1].text==='!'?2:1),name=tokens[open+1]?.text;
    if(!attributeNames.has(name)&&!(macroUse&&name==='macro_use'))fail('unknown attribute producer '+name);
    let depth=1;at=open+1;for(;at<tokens.length&&depth;at++){if(tokens[at].text==='[')depth++;if(tokens[at].text===']')depth--;}
    if(depth)fail('unclosed attribute');at--;
  }
}
function sourceMap(value){
  if(!value||typeof value!=='object'||types.isProxy(value)||Array.isArray(value)||![null,Object.prototype].includes(Object.getPrototypeOf(value)))fail('macro sources require own primitive data');
  const result=Object.create(null),keys=Reflect.ownKeys(value);let size=0;
  if(keys.length>64)fail('too many imported macro source modules');
  for(const key of keys){
    if(typeof key!=='string'||!/^[A-Za-z_][A-Za-z0-9_]*$/u.test(key))fail('invalid macro module name');
    const row=Object.getOwnPropertyDescriptor(value,key);if(!row||!Object.hasOwn(row,'value')||typeof row.value!=='string')fail('macro sources require own primitive data');size+=row.value.length;if(size>2_000_000)fail('imported macro source budget exceeded');result[key]=row.value;
  }
  return result;
}
function binding(source,rootSource,macroSources){
  attributes(rustTokens(source));
  const evidence=macroProvenance(source);
  if(evidence.unresolvedImportScope||evidence.shadowedNames.includes('format')||evidence.importedNames.includes('format'))fail('format binding is ambiguous in the complete module');
  // A textual macro_use parent is resolved from its actual complete source.
  // Unknown producer attributes/globs remain refusals instead of a spelling grant.
  let root=rootSource;
  const imports=[];
  for(const item of sourceItems(rootSource)){
    const tokens=item.tokens.filter(token=>token.type!=='comment');attributes(tokens,{macroUse:true});
    if(tokens.some(token=>token.text==='macro_use')){
      if(tokens.map(token=>token.text).join('')!=='#[macro_use]mod'+item.name+';'||!Object.hasOwn(macroSources,item.name))fail('unresolved parent macro_use producer');
      const original=macroSources[item.name],facts=macroProvenance(original);attributes(rustTokens(original));
      if(facts.unresolvedImportScope||facts.shadowedNames.includes('format')||facts.importedNames.includes('format'))fail('parent imports a competing format macro');
      for(const producer of sourceItems(original))if(!['comment','macro_rules!','fn','struct','impl','use','type','enum','const','static'].includes(producer.term))fail('unknown imported macro producer');
      imports.push({name:item.name,source:original,sha256:hash(original)});
      root=root.slice(0,item.start)+' '.repeat(item.end-item.start)+root.slice(item.end);
    }else if(item.term==='opaque'&&tokens.some(token=>token.text==='!'||token.text.endsWith('!')))fail('unknown parent macro producer');
  }
  const parent=macroProvenance(root);
  if(parent.unresolvedImportScope||parent.shadowedNames.includes('format')||parent.importedNames.includes('format'))fail('parent format binding is ambiguous');
  return {module:evidence,parent,imports};
}
export function migrateCoreFormatting(source,{rootSource='',macroUseSources={}}={}){
  if(typeof source!=='string'||typeof rootSource!=='string'||source.length>2_000_000||rootSource.length>2_000_000)fail('bounded primitive complete source required');
  const macroSources=sourceMap(macroUseSources),before=transportConcreteSyntaxSource(source,{language:'Rust'}),scope=binding(source,rootSource,macroSources),tokens=rustTokens(source).filter(token=>token.type!=='comment');
  const edits=[],functions=[],skipped=[];
  const shadows=name=>scope.module.importedNames.includes(name)||tokens.some((token,index)=>['type','struct','enum','trait','mod'].includes(token.text)&&tokens[index+1]?.text===name);
  const stringShadow=shadows('String'),strShadow=shadows('str');
  for(const item of sourceItems(source)){
    if(item.term!=='fn')continue;
    const rows=item.tokens.filter(token=>token.type!=='comment'),fn=rows.findIndex(token=>token.text==='fn');
    let parameters=0,body=-1;
    for(let at=fn+2;at<rows.length;at++){
      if(rows[at].text==='(')parameters++;if(rows[at].text===')')parameters--;
      if(!parameters&&rows[at].text==='{'){body=at;break;}
    }
    if(body<0){skipped.push({span:[item.start,item.end],reason:'function body unavailable'});continue;}
    const selected=[];
    for(let at=body+1;at<rows.length-1;at++){
      const token=rows[at],next=rows[at+1],previous=rows[at-1];
      if((token.text==='format!'||token.text==='format'&&next.text==='!')&&previous?.text!=='::'&&previous?.text!=='#'){const end=token.text==='format!'?token.end:next.end;selected.push({span:[token.start,end],expected:source.slice(token.start,end),replacement:'crate::translation_core::format!'});}
    }
    if(!selected.length)continue;
    if(!strShadow)for(let at=fn+2;at<body;at++)if(rows[at].text==='str'&&(rows[at-1]?.text==='&'||rows[at-1]?.text==="'static"&&rows[at-2]?.text==='&'))selected.push({span:[rows[at].start,rows[at].end],expected:'str',replacement:'crate::translation_core::Str'});
    // Only the actual simple return token is adopted. Complex/borrowed/aliased
    // types keep their ordinary checker obligations and are never erased.
    const arrow=rows.findIndex((token,index)=>index<body&&(token.text==='->'||token.text==='-'&&rows[index+1]?.text==='>'));
    const result=arrow<0?-1:arrow+(rows[arrow].text==='->'?1:2);
    if(!stringShadow&&result>=0&&rows[result]?.text==='String'&&result+1===body)selected.push({span:[rows[result].start,rows[result].end],expected:'String',replacement:'crate::translation_core::Text'});
    edits.push(...selected);functions.push({name:item.name,span:[item.start,item.end],edits:selected.length});
  }
  edits.sort((a,b)=>a.span[0]-b.span[0]);
  const applied=applyConcreteSyntaxSubstitutions(before.document,{languageRules:[{id:'format-adoption:retain-primitive-language-source',edits:[]}],repositoryRules:[{id:'router-core:qualify-formatting-interface',edits}]}),after=transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(applied.value));
  const mapping=[];let old=0,current=0;
  for(const edit of edits){
    if(edit.span[0]>old){const size=edit.span[0]-old;mapping.push({kind:'unchanged',before:[old,edit.span[0]],after:[current,current+size]});current+=size;}
    mapping.push({kind:'substitution',before:[...edit.span],after:[current,current+edit.replacement.length],expected:edit.expected,replacement:edit.replacement});current+=edit.replacement.length;old=edit.span[1];
  }
  if(old<source.length)mapping.push({kind:'unchanged',before:[old,source.length],after:[current,current+source.length-old]});
  let reverse=after.source;for(let at=mapping.length-1;at>=0;at--){const row=mapping[at];if(row.kind==='substitution'){if(reverse.slice(...row.after)!==row.replacement)fail('inverse source association changed');reverse=reverse.slice(0,row.after[0])+row.expected+reverse.slice(row.after[1]);}}
  if(reverse!==source)fail('complete inverse differs');
  return {schema:'router-core-formatting-migration-v1',before:{source,meta:before.meta,sha256:hash(source)},after:{source:after.source,meta:after.meta,sha256:hash(after.source)},rootSource,scope,functions,skipped,edits,mapping,trace:applied.trace,libraryImplementation:'untranslated-rust-std-format',migrationSemantics:'explicit-owned-API-adoption; implicit standard-library implementation is not translated or proved',executableAdmission:false};
}
// A proposal only: the coordinator reviews and installs actual producer bytes.
function freshOutput(root,output){
  const source=realpathSync(root),parent=realpathSync(dirname(output)),target=join(parent,basename(output)),inside=(left,right)=>left===right||left.startsWith(right+'/');
  if(inside(target,source)||inside(source,target))fail('physical proposal overlaps source root');
  const before=lstatSync(parent);if(!before.isDirectory()||before.isSymbolicLink())fail('physical proposal parent must be a directory');
  mkdirSync(output,{recursive:false});
  try{
    const after=lstatSync(parent),created=lstatSync(output);
    if(after.dev!==before.dev||after.ino!==before.ino||after.mode!==before.mode||!created.isDirectory()||created.isSymbolicLink()||realpathSync(output)!==target||realpathSync(root)!==source)fail('proposal path identity changed');
    return output;
  }catch(error){try{rmdirSync(output);}catch{}throw error;}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const args=process.argv.slice(2);
  if(args.length!==4||args[0]!=='--root'||args[2]!=='--output')fail('usage: --root SOURCE_ROOT --output FRESH_PROPOSAL_DIRECTORY');
  const root=resolve(args[1]),output=resolve(args[3]);if(output===root||output.startsWith(root+'/'))fail('proposal must be outside source root');
  const source=readFileSync(join(root,rustPackageSourcePath(root,'src/accounts_cli.rs')),'utf8'),rootSource=readFileSync(join(root,rustPackageSourcePath(root,'src/lib.rs')),'utf8'),operation=readFileSync(join(root,rustPackageSourcePath(root,'src/operation_output.rs')),'utf8');
  const proposal=migrateCoreFormatting(source,{rootSource,macroUseSources:{operation_output:operation}});
  freshOutput(root,output);writeFileSync(join(output,'accounts_cli.rs'),proposal.after.source,{flag:'wx'});writeFileSync(join(output,'proposal.json'),JSON.stringify(proposal,null,2)+'\n',{flag:'wx'});
}
