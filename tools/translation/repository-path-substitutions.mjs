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
  const ts=ownershipCompiler();
  const file=ts.createSourceFile('migration.mjs',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
  if(file.parseDiagnostics.length)throw Error('Original migration source syntax is invalid');
  const helperPresent=file.statements.some(node=>ts.isImportDeclaration(node)&&node.moduleSpecifier.text===helperImport&&node.importClause?.namedBindings&&ts.isNamedImports(node.importClause.namedBindings)&&node.importClause.namedBindings.elements.some(entry=>entry.name.text==='repositorySourceURL'&&(entry.propertyName?.text??entry.name.text)==='repositorySourceURL'));
  const edits=[];
  function visit(node) {
    if(ts.isNewExpression(node)&&ts.isIdentifier(node.expression)&&node.expression.text==='URL'&&node.arguments?.length===2) {
      const [path,root]=node.arguments;
      const variable=ts.isIdentifier(path)&&['path','name','p','file'].includes(path.text);
      const literal=ts.isStringLiteral(path)&&(path.text==='Cargo.toml'||path.text==='Cargo.lock'||/^(?:src|tests|benches|examples|fixtures)(?:\/|$)/u.test(path.text));
      if((variable||literal)&&ts.isIdentifier(root)&&['root','ROOT'].includes(root.text)) {
        const span=[node.getStart(file),node.end];
        edits.push({span,expected:source.slice(...span),replacement:`repositorySourceURL(${source.slice(path.getStart(file),path.end)},${root.text})`});
      }
    }
    // Template contents are source DATA, not child executable syntax nodes.
    ts.forEachChild(node,visit);
  }
  visit(file);
  if(edits.length>512)throw Error('Migration candidate bound');
  if(!edits.length)return {source,edits:[],changed:false};
  const before=roundtrip(source);
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
      const text=helperPresent?'':`import {repositorySourceURL} from ${JSON.stringify(helperImport)};\n`;
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

// Local adapter initialization only; historical source records remain intact.
export function substituteTypeScriptPackageLayout(source) {
  if(typeof source!=='string'||Buffer.byteLength(source)>1024*1024)throw TypeError('Bounded adapter source required');
  const ts=ownershipCompiler(),file=ts.createSourceFile('adapter.mjs',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
  if(file.parseDiagnostics.length)throw Error('Original adapter source syntax is invalid');
  const options={allowJs:true,noResolve:true,noLib:true,noEmit:true},host=ts.createCompilerHost(options);host.getSourceFile=name=>name==='adapter.mjs'?file:undefined;host.fileExists=name=>name==='adapter.mjs';host.readFile=()=>undefined;
  const checker=ts.createProgram(['adapter.mjs'],options,host).getTypeChecker();
  const importedRequire=node=>{if(!ts.isIdentifier(node))return false;const declarations=checker.getSymbolAtLocation(node)?.declarations;if(declarations?.length!==1||!ts.isImportSpecifier(declarations[0])||(declarations[0].propertyName??declarations[0].name).text!=='createRequire')return false;let owner=declarations[0];while(owner&&!ts.isImportDeclaration(owner))owner=owner.parent;return owner?.moduleSpecifier.text==='node:module';};
  const edits=[];
  function visit(node){
    const join=node.parent,require=join?.parent;
    if(ts.isStringLiteral(node)&&node.text==='packages/javascript/package.json'&&ts.isCallExpression(join)&&ts.isIdentifier(join.expression)&&join.expression.text==='join'&&join.arguments.length===2&&join.arguments[1]===node&&ts.isCallExpression(require)&&ts.isIdentifier(require.expression)&&require.expression.text==='createRequire'&&require.arguments.length===1&&require.arguments[0]===join){
      const span=[node.getStart(file),node.end],quote=source[span[0]];
      edits.push({span,expected:source.slice(...span),replacement:quote+'js/package.json'+quote});
    }
    if(ts.isStringLiteral(node)&&/^(?:\.\.\/){1,32}packages\/javascript\/package\.json$/u.test(node.text)&&ts.isNewExpression(join)&&ts.isIdentifier(join.expression)&&join.expression.text==='URL'&&!checker.getSymbolAtLocation(join.expression)&&join.arguments?.length===2&&join.arguments[0]===node&&join.arguments[1].getText(file)==='import.meta.url'&&ts.isCallExpression(require)&&importedRequire(require.expression)&&require.arguments.length===1&&require.arguments[0]===join){
      const span=[node.getStart(file),node.end],quote=source[span[0]];edits.push({span,expected:source.slice(...span),replacement:quote+node.text.replace('packages/javascript/package.json','js/package.json')+quote});
    }
    ts.forEachChild(node,visit);
  }
  visit(file);if(!edits.length)return {source,changed:false,edits:[]};
  if(edits.length!==1)throw Error('One complete local TypeScript package initialization required');
  const initial=roundtrip(source);
  let languageWire,afterWire;
  const result=createRulePipeline([
    {phase:'language',rules:[{id:'javascript:parsed-require-package-literal',apply:()=>{languageWire=initial.wire;return transportConcreteSyntaxMeta(languageWire);}}]},
    {phase:'repository',rules:[{id:'router:physical-javascript-package',apply:input=>{
      const edit=edits[0],after=source.slice(0,edit.span[0])+edit.replacement+source.slice(edit.span[1]);
      const applied=applyConcreteSyntaxSubstitutions(input.document,{languageRules:[],repositoryRules:[{id:'router:require-package-path',edits:[{span:[0,source.length],expected:source,replacement:after}]}]});
      afterWire=serializeConcreteSyntaxMeta(applied.value);return transportConcreteSyntaxMeta(afterWire).source;
    }}]},
  ]).run(source);
  const after=result.value;
  if(ts.createSourceFile('adapter.mjs',after,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS).parseDiagnostics.length)throw Error('Translated adapter syntax is invalid');
  const inverse=applyConcreteSyntaxSubstitutions(roundtrip(after).document,{languageRules:[],repositoryRules:[{id:'router:complete-package-layout-inverse',edits:[{span:[0,after.length],expected:after,replacement:source}]}]});
  if(transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(inverse.value)).source!==source)throw Error('Complete adapter source inverse differs');
  return {source:after,changed:true,edits,beforeWire:initial.wire,languageWire,afterWire,trace:result.trace,wholeInverse:true};
}

// Crate-relative labels in receiving fixtures stay logical. Select executable
// filesystem reads with the JavaScript parser; never rewrite embedded sources.
export function substituteRustPackageReads(source,helperImport) {
  if(typeof source!=='string'||Buffer.byteLength(source)>1024*1024||typeof helperImport!=='string'||!helperImport.startsWith('.')||helperImport.includes('\n'))throw TypeError('Bounded source and relative layout import required');
  const ts=ownershipCompiler(),file=ts.createSourceFile('reads.mjs',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS),edits=[];
  if(file.parseDiagnostics.length)throw Error('Original source read syntax is invalid');
  function visit(node){
    if(ts.isCallExpression(node)&&ts.isIdentifier(node.expression)&&node.expression.text==='join'&&node.arguments.length===2){
      const [root,path]=node.arguments,reader=node.parent;
      const name=ts.isCallExpression(reader)?(ts.isIdentifier(reader.expression)?reader.expression.text:ts.isPropertyAccessExpression(reader.expression)?reader.expression.name.text:null):null;
      if(['readFileSync','readdirSync','lstatSync','existsSync'].includes(name)&&reader.arguments[0]===node&&ts.isIdentifier(root)&&['root','ROOT'].includes(root.text)&&(ts.isIdentifier(path)||ts.isStringLiteral(path))){
        const span=[path.getStart(file),path.end],expected=source.slice(...span);
        edits.push({span,expected,replacement:`rustPackageSourcePath(${root.text},${expected})`});
      }
    }
    ts.forEachChild(node,visit);
  }
  visit(file);if(!edits.length)return {source,changed:false,edits:[]};
  if(edits.length>512)throw Error('Source read substitution bound');
  const before=roundtrip(source);
  let languageWire,afterWire;
  const result=createRulePipeline([
    {phase:'language',rules:[{id:'javascript:parsed-filesystem-read-paths',apply:()=>{languageWire=before.wire;return transportConcreteSyntaxMeta(languageWire);}}]},
    {phase:'repository',rules:[{id:'router:physical-rust-package-reads',apply:input=>{
      let after=source;
      for(const edit of [...edits].sort((a,b)=>b.span[0]-a.span[0]))after=after.slice(0,edit.span[0])+edit.replacement+after.slice(edit.span[1]);
      const at=after.startsWith('#!')?after.indexOf('\n')+1:0;
      after=after.slice(0,at)+`import {rustPackageSourcePath} from ${JSON.stringify(helperImport)};\n`+after.slice(at);
      const applied=applyConcreteSyntaxSubstitutions(input.document,{languageRules:[],repositoryRules:[{id:'router:complete-physical-read-substitution',edits:[{span:[0,source.length],expected:source,replacement:after}]}]});
      afterWire=serializeConcreteSyntaxMeta(applied.value);return transportConcreteSyntaxMeta(afterWire).source;
    }}]},
  ]).run(source),after=result.value;
  if(ts.createSourceFile('reads.mjs',after,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS).parseDiagnostics.length)throw Error('Translated source read syntax is invalid');
  const inverse=applyConcreteSyntaxSubstitutions(roundtrip(after).document,{languageRules:[],repositoryRules:[{id:'router:complete-read-layout-inverse',edits:[{span:[0,after.length],expected:after,replacement:source}]}]});
  if(transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(inverse.value)).source!==source)throw Error('Complete source read inverse differs');
  return {source:after,changed:true,edits,beforeWire:before.wire,languageWire,afterWire,trace:result.trace,wholeInverse:true};
}

// Current committed-source reads in receiving tests retain logical labels.
// Historical immutable revisions and embedded child source stay untouched.
export function substituteRepositoryGitSourceReads(source,helperImport){
  if(typeof source!=='string'||Buffer.byteLength(source)>1024*1024||typeof helperImport!=='string'||!helperImport.startsWith('.')||helperImport.includes('\n'))throw TypeError('Bounded Git source and relative helper import required');
  const ts=ownershipCompiler(),file=ts.createSourceFile('git-reads.mjs',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS),edits=[];
  if(file.parseDiagnostics.length)throw Error('Original Git source read syntax is invalid');
  function visit(node){
    if(ts.isCallExpression(node)&&ts.isIdentifier(node.expression)&&node.expression.text==='execFileSync'&&node.arguments.length===3){
      const [command,args,options]=node.arguments;
      const cwd=ts.isObjectLiteralExpression(options)&&options.properties.find(row=>ts.isPropertyAssignment(row)&&row.name.getText(file)==='cwd');
      if(ts.isStringLiteral(command)&&command.text==='git'&&ts.isArrayLiteralExpression(args)&&args.elements.length===2&&ts.isStringLiteral(args.elements[0])&&args.elements[0].text==='show'&&cwd&&ts.isIdentifier(cwd.initializer)&&['root','ROOT'].includes(cwd.initializer.text)){
        const value=args.elements[1];let selected;
        if(ts.isBinaryExpression(value)&&value.operatorToken.kind===ts.SyntaxKind.PlusToken&&ts.isStringLiteral(value.left)&&value.left.text==='HEAD:'&&ts.isIdentifier(value.right))selected=source.slice(value.right.getStart(file),value.right.end);
        else if(ts.isStringLiteral(value)&&value.text.startsWith('HEAD:'))selected=JSON.stringify(value.text.slice(5));
        if(selected!==undefined){const span=[value.getStart(file),value.end];edits.push({span,expected:source.slice(...span),replacement:`'HEAD:'+repositorySourcePath(${selected},${cwd.initializer.text})`});}
      }
    }
    ts.forEachChild(node,visit);
  }
  visit(file);if(!edits.length)return {source,changed:false,edits:[]};
  if(edits.length>512)throw Error('Git read substitution bound');
  const before=roundtrip(source);let languageWire,afterWire;
  const result=createRulePipeline([
    {phase:'language',rules:[{id:'javascript:parsed-current-git-source-reads',apply:()=>{languageWire=before.wire;return transportConcreteSyntaxMeta(languageWire);}}]},
    {phase:'repository',rules:[{id:'router:physical-current-git-source-reads',apply:input=>{
      let after=source;for(const edit of [...edits].sort((a,b)=>b.span[0]-a.span[0]))after=after.slice(0,edit.span[0])+edit.replacement+after.slice(edit.span[1]);
      const at=after.startsWith('#!')?after.indexOf('\n')+1:0;
      after=after.slice(0,at)+`import {repositorySourcePath} from ${JSON.stringify(helperImport)};\n`+after.slice(at);
      const applied=applyConcreteSyntaxSubstitutions(input.document,{languageRules:[],repositoryRules:[{id:'router:complete-git-read-parent-substitution',edits:[{span:[0,source.length],expected:source,replacement:after}]}]});
      afterWire=serializeConcreteSyntaxMeta(applied.value);return transportConcreteSyntaxMeta(afterWire).source;
    }}]},
  ]).run(source),after=result.value;
  if(ts.createSourceFile('git-reads.mjs',after,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS).parseDiagnostics.length)throw Error('Translated Git source read syntax is invalid');
  const inverse=applyConcreteSyntaxSubstitutions(roundtrip(after).document,{languageRules:[],repositoryRules:[{id:'router:complete-git-read-inverse',edits:[{span:[0,after.length],expected:after,replacement:source}]}]});
  if(transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(inverse.value)).source!==source)throw Error('Complete Git source read inverse differs');
  return {source:after,changed:true,edits,beforeWire:before.wire,languageWire,afterWire,trace:result.trace,wholeInverse:true};
}
