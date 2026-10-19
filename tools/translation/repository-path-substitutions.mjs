// Source migration only: syntax locations confer no executable authority.
import {ownershipCompiler} from './js-to-rust/vendor/module-syntax.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,serializeConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions} from './concrete-syntax-meta.mjs';

function roundtrip(source) {
  const first=transportConcreteSyntaxSource(source,{language:'JavaScript'});
  const wire=serializeConcreteSyntaxMeta(first.document),reparsed=transportConcreteSyntaxMeta(wire);
  if(reparsed.source!==source)throw Error('Complete JavaScript CST source changed');
  if(!reparsed.document)throw Error('Reparsed CST document required');
  return {wire,document:reparsed.document};
}

export function substituteRepositorySourceURLs(source,helperImport) {
  if(typeof source!=='string'||Buffer.byteLength(source)>1024*1024||typeof helperImport!=='string'||!helperImport.startsWith('.')||helperImport.includes('\n'))throw TypeError('Bounded source and relative helper import required');
  const ts=ownershipCompiler(),before=roundtrip(source);
  const file=ts.createSourceFile('migration.mjs',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
  if(file.parseDiagnostics.length)throw Error('Original migration source syntax is invalid');
  const edits=[];
  function visit(node) {
    if(ts.isNewExpression(node)&&ts.isIdentifier(node.expression)&&node.expression.text==='URL'&&node.arguments?.length===2) {
      const [path,root]=node.arguments;
      if(ts.isIdentifier(path)&&['path','name','p'].includes(path.text)&&ts.isIdentifier(root)&&['root','ROOT'].includes(root.text)) {
        const span=[node.getStart(file),node.end];
        edits.push({span,expected:source.slice(...span),replacement:`repositorySourceURL(${path.text},${root.text})`});
      }
    }
    // Template contents are source DATA, not child executable syntax nodes.
    ts.forEachChild(node,visit);
  }
  visit(file);
  if(edits.length>512)throw Error('Migration candidate bound');
  if(!edits.length)return {source,edits:[],changed:false};
  let languageWire,afterWire;
  const pipeline=createRulePipeline([
    {phase:'language',rules:[{id:'javascript:parsed-url-constructor-locations',apply:()=>{
      // The CST may retain an opaque slash-context. Keep that refusal explicit;
      // independently selected AST spans drive one complete source substitution.
      let rewritten=source;
      for(const edit of [...edits].sort((a,b)=>b.span[0]-a.span[0])){
        if(rewritten.slice(...edit.span)!==edit.expected)throw Error('Selected source span changed');
        rewritten=rewritten.slice(0,edit.span[0])+edit.replacement+rewritten.slice(edit.span[1]);
      }
      const result=applyConcreteSyntaxSubstitutions(before.document,{languageRules:[{id:'javascript:url-constructor-call',edits:[{span:[0,source.length],expected:source,replacement:rewritten}]}],repositoryRules:[]});
      languageWire=serializeConcreteSyntaxMeta(result.value);
      return transportConcreteSyntaxMeta(languageWire);
    }}]},
    {phase:'repository',rules:[{id:'repository:physical-rust-source-url-import',apply:language=>{
      const text=`import {repositorySourceURL} from ${JSON.stringify(helperImport)};\n`;
      const at=language.source.startsWith('#!')?language.source.indexOf('\n')+1:0;
      const input=roundtrip(language.source);
      const result=applyConcreteSyntaxSubstitutions(input.document,{languageRules:[],repositoryRules:[{id:'repository:source-url-helper',edits:[{span:[at,at],expected:'',replacement:text}]}]});
      afterWire=serializeConcreteSyntaxMeta(result.value);
      return transportConcreteSyntaxMeta(afterWire).source;
    }}]},
  ]);
  const result=pipeline.run(source),after=result.value;
  if(ts.createSourceFile('migration.mjs',after,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS).parseDiagnostics.length)throw Error('Substituted migration source syntax is invalid');
  const inverseInput=roundtrip(after),inverse=applyConcreteSyntaxSubstitutions(inverseInput.document,{languageRules:[],repositoryRules:[{id:'repository:complete-source-inverse',edits:[{span:[0,after.length],expected:after,replacement:source}]}]});
  if(transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(inverse.value)).source!==source)throw Error('Complete migration source inverse differs');
  return {source:after,edits,changed:true,beforeWire:before.wire,languageWire,afterWire,trace:result.trace,wholeInverse:true};
}
