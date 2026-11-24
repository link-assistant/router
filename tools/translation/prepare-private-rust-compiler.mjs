// Root-controlled source tool only. This code parses/transpiles source; it does
// not evaluate a compiler graph or attest historical Node/TypeScript loading.
import fs,{writeFileSync,mkdirSync,lstatSync,realpathSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {dirname,basename,resolve,relative,isAbsolute,sep,posix} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createRulePipeline} from './rule-pipeline.mjs';

const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const ROOTS=['tools/translation/extensions/host-contracts.mjs',
  'tools/translation/project.mjs','tools/translation/translate.mjs',
  'tools/translation/semantic-meta.mjs'];
const NATIVE=new Set(['node:fs','node:zlib','node:crypto','node:util','node:path','node:url']);
const RAW=['rust.js','check.js','emit-javascript.js'];
const LIMITS={modules:512,edges:4096,rawBytes:4194304,compiledBytes:16777216};
const hash=text=>createHash('sha256').update(text).digest('hex');
const pin=text=>({bytes:Buffer.byteLength(text),sha256:hash(text)});
const authority=()=>({type:false,owner:false,cfg:false,body:false,executable:false});
function fail(message){throw new TypeError('Private Rust compiler source tool: '+message);}
// New source-tool observation contract: use the actual current default fs
// reader on both Node and Bun, rather than assuming ESM export sync behavior.
function readFileSync(...args){
  const field=Object.getOwnPropertyDescriptor(fs,'readFileSync');
  if(!field||!Object.hasOwn(field,'value')||typeof field.value!=='function')fail('own-data file reader required');
  return Reflect.apply(field.value,undefined,args);
}
function pathWithin(root,path){const result=relative(root,path);return result!==''&&!result.startsWith('..'+sep)&&result!=='..'&&!isAbsolute(result);}
function primitivePath(path){
  if(typeof path!=='string'||!path||path.includes('\\')||path.includes('\0')
    ||path.startsWith('/')||posix.normalize(path)!==path||path.split('/').some(p=>p==='..'||p==='.'))fail('canonical relative source path required');
  return path;
}
function readOriginal(root,path){
  primitivePath(path);const file=resolve(root,path);if(!pathWithin(root,file))fail('source escaped root');
  // Root generator domain: complete nonlinked files and ancestors, not a
  // hostile-callback/atomic-filesystem theorem. Runtime authentication is open.
  let cursor=root;for(const part of path.split('/')){cursor=resolve(cursor,part);if(lstatSync(cursor).isSymbolicLink())fail('linked source component: '+path);}
  const before=readFileSync(file),source=before.toString('utf8');
  if(!Buffer.from(source,'utf8').equals(before))fail('source is not complete well-formed UTF8: '+path);
  return {path,source,pin:pin(source)};
}
function compiler(root){
  const installed=process.env.ROUTER_NATIVE_TS_SOURCE_ROOT??root;
  const require=createRequire(resolve(installed,'js/package.json'));
  const filename=require.resolve('typescript'),ts=require(filename);
  if(ts.version!=='5.9.3')fail('requires existing TypeScript5.9.3');
  return {ts,witness:{version:ts.version,path:filename,...pin(readFileSync(filename,'utf8')),
    bootstrap:'Trusted already-installed Root generator compiler; a later file pin is not historical execution attestation.'}};
}
function span(source,node,file){
  const start=node.getStart(file),end=node.end;
  return {start,end,utf8Start:Buffer.byteLength(source.slice(0,start)),utf8End:Buffer.byteLength(source.slice(0,end)),...pin(source.slice(start,end))};
}
function parse(ts,path,source){
  return ts.createSourceFile(path,source,ts.ScriptTarget.ES2022,true,ts.ScriptKind.JS);
}
function message(ts,entry){return ts.flattenDiagnosticMessageText(entry.messageText,'\n');}
function applyEdits(source,edits){
  let output=source,last=source.length;
  for(const edit of [...edits].sort((a,b)=>b.start-a.start)){
    if(edit.end>last||source.slice(edit.start,edit.end)!==edit.expected)fail('source edit overlap or mismatch');
    output=output.slice(0,edit.start)+edit.replacement+output.slice(edit.end);last=edit.start;
  }
  const reverse=[];let delta=0;
  for(const edit of [...edits].sort((a,b)=>a.start-b.start)){
    const start=edit.start+delta;reverse.push({start,end:start+edit.replacement.length,expected:edit.replacement,replacement:edit.expected});
    delta+=edit.replacement.length-(edit.end-edit.start);
  }
  let undone=output;for(const edit of [...reverse].sort((a,b)=>b.start-a.start))undone=undone.slice(0,edit.start)+edit.replacement+undone.slice(edit.end);
  if(undone!==source)fail('complete source undo differs');return {source:output,edits,reverse};
}
function resolveImport(path,specifier){
  if(specifier.startsWith('.'))return primitivePath(posix.normalize(posix.join(posix.dirname(path),specifier)));
  return null;
}
function components(rows){
  const map=new Map(rows.map(row=>[row.id,row])),indices=new Map(),low=new Map(),stack=[],active=new Set(),result=[];let next=0;
  function visit(id){
    indices.set(id,next);low.set(id,next++);stack.push(id);active.add(id);
    for(const edge of map.get(id).imports){if(edge.kind==='native')continue;const child=edge.target;
      if(!indices.has(child)){visit(child);low.set(id,Math.min(low.get(id),low.get(child)));}
      else if(active.has(child))low.set(id,Math.min(low.get(id),indices.get(child)));
    }
    if(low.get(id)===indices.get(id)){const group=[];let child;do{child=stack.pop();active.delete(child);group.push(child);}while(child!==id);result.push(group);}
  }
  for(const row of rows)if(!indices.has(row.id))visit(row.id);return result;
}

function moduleFacts(ts,record,blockers){
  const {path,source}=record,file=parse(ts,path,source),imports=[],exports=[],calls=[],classes=[],awaits=[],dynamic=[],meta=[],globals=new Map(),bindings=[];
  for(const diagnostic of file.parseDiagnostics)blockers.push({gate:'grammar',module:record.id,message:message(ts,diagnostic),start:diagnostic.start??null});
  for(const statement of file.statements){
    if(ts.isImportDeclaration(statement)||ts.isExportDeclaration(statement)&&statement.moduleSpecifier){
      const spec=statement.moduleSpecifier;
      if(!ts.isStringLiteral(spec)){blockers.push({gate:'static-import',module:record.id,span:span(source,spec,file)});continue;}
      const specifier=spec.text,target=resolveImport(path,specifier),kind=target?'module':'native';
      if(!target&&!NATIVE.has(specifier))blockers.push({gate:'unknown-external',module:record.id,specifier});
      const edge={kind,specifier,target,span:span(source,spec,file)};imports.push(edge);
      if(ts.isImportDeclaration(statement)&&statement.importClause){
        const clause=statement.importClause;if(clause.name)bindings.push({local:clause.name.text,kind:'default',specifier});
        if(clause.namedBindings){const named=clause.namedBindings;
          if(ts.isNamespaceImport(named))bindings.push({local:named.name.text,kind:'namespace',specifier});
          else for(const item of named.elements)bindings.push({local:item.name.text,imported:(item.propertyName??item.name).text,kind:'named',specifier});
        }
      }
    }
    if(statement.modifiers?.some(mod=>mod.kind===ts.SyntaxKind.ExportKeyword)||ts.isExportDeclaration(statement))exports.push({kind:ts.SyntaxKind[statement.kind],span:span(source,statement,file)});
  }
  const importedNames=new Set(bindings.map(row=>row.local)),importedReferences=[];
  function visit(node,functionDepth=0){
    const isFunction=ts.isFunctionLike(node),depth=functionDepth+(isFunction?1:0);
    if(ts.canHaveDecorators(node)&&(ts.getDecorators(node)?.length??0)>0)blockers.push({gate:'unsupported-decorated-grammar',module:record.id,span:span(source,node,file)});
    if(ts.isAwaitExpression(node)||ts.isForOfStatement(node)&&node.awaitModifier)awaits.push({topLevel:functionDepth===0,span:span(source,node,file)});
    if(ts.isPropertyAccessExpression(node)&&ts.isMetaProperty(node.expression))meta.push({text:node.getText(file),span:span(source,node,file)});
    else if(ts.isMetaProperty(node)&&!(ts.isPropertyAccessExpression(node.parent)&&node.parent.expression===node))meta.push({text:node.getText(file),span:span(source,node,file)});
    if(ts.isCallExpression(node)||ts.isNewExpression(node)){
      const callee=node.expression;calls.push({kind:ts.isNewExpression(node)?'new':'call',functionDepth,callee:span(source,callee,file),span:span(source,node,file)});
      if(callee.kind===ts.SyntaxKind.ImportKeyword||ts.isIdentifier(callee)&&['require','eval','Function'].includes(callee.text))dynamic.push({kind:callee.getText(file),span:span(source,node,file)});
    }
    if(ts.isIdentifier(node)){
      const name=node.text;let row=globals.get(name);if(!row){row={name,count:0,first:span(source,node,file)};globals.set(name,row);}row.count++;
      if(importedNames.has(name))importedReferences.push({name,span:span(source,node,file),
        context:ts.isCallExpression(node.parent)&&node.parent.expression===node?'direct-import-call':ts.isPropertyAccessExpression(node.parent)&&node.parent.expression===node?'namespace-or-property-base':'other-syntactic-reference'});
    }
    if(ts.isClassDeclaration(node)||ts.isClassExpression(node)){
      const members=node.members.map(member=>({kind:ts.SyntaxKind[member.kind],name:member.name?.getText(file)??null,private:Boolean(member.name&&ts.isPrivateIdentifier(member.name)),static:Boolean(member.modifiers?.some(mod=>mod.kind===ts.SyntaxKind.StaticKeyword)),parameters:member.parameters?.length??null,span:span(source,member,file)}));
      classes.push({name:node.name?.text??null,kind:ts.SyntaxKind[node.kind],functionDepth,extends:node.heritageClauses?.map(clause=>({kind:ts.SyntaxKind[clause.token],span:span(source,clause,file)}))??[],span:span(source,node,file),members});
    }
    ts.forEachChild(node,child=>visit(child,depth));
  }
  visit(file);
  // This is a COMPLETE syntactic census, not a lexical binding or global
  // owner proof. Property names/declarations are deliberately not discarded.
  return {...record,imports,exports,bindings,importedReferences,calls,classes,awaits,dynamic,meta,
    dynamicMeaning:'Only syntactically direct import/require/eval/Function sites. Aliased execution is not proved absent; all calls and identifier uses are retained for the separate closure gate.',
    identifierCensus:[...globals.values()],identifierMeaning:'Syntactic overapproximation only; lexical/global/receiver ownership remains an explicit gate.'};
}

function rawCoreRecipes(ts,core){
  const file=parse(ts,core.path,core.source),routes=[];
  function visit(node){
    if(ts.isCallExpression(node)&&ts.isIdentifier(node.expression)&&node.expression.text==='exposed'){
      const [name,rules]=node.arguments;
      if(!name||!ts.isStringLiteral(name)||!RAW.includes(name.text)||!rules||!ts.isArrayLiteralExpression(rules))fail('unsupported actual core exposed recipe');
      const replacements=[];
      for(const tuple of rules.elements){
        if(!ts.isArrayLiteralExpression(tuple)||tuple.elements.length!==3||!tuple.elements.every(ts.isStringLiteralLike))fail('core language recipe must be complete literal triple');
        replacements.push({id:tuple.elements[0].text,expected:tuple.elements[1].text,replacement:tuple.elements[2].text});
      }
      routes.push({name:name.text,replacements,call:span(core.source,node,file)});
    }
    ts.forEachChild(node,visit);
  }
  visit(file);if(routes.length!==3||routes.some((row,index)=>row.name!==RAW[index]))fail('actual three core exposed calls/order differ');return routes;
}

/** Root-only proposal. No executable program is issued when proof gates open. */
export function preparePrivateRustCompilerPlan({sourceRoot=ROOT}={}){
  const root=resolve(sourceRoot),{ts,witness}=compiler(root),blockers=[],originals=new Map();let rawBytes=0,edgeCount=0;
  function original(path){
    if(!originals.has(path)){const row=readOriginal(root,path);rawBytes+=row.pin.bytes;if(rawBytes>LIMITS.rawBytes)fail('complete source byte bound');originals.set(path,row);}return originals.get(path);
  }
  const pipeline=createRulePipeline([
    {phase:'language',rules:[{id:'private-rust:complete-source-graph-and-lexical-census',apply:()=>{
      const pending=ROOTS.map(path=>({id:path,path,variant:'original'})),modules=new Map();
      // Add all three ACTUAL dynamic core source variants, separate from an
      // ordinary static import of raw check.js used by checked-coercions.
      const core=original('tools/translation/extensions/core.mjs'),routes=rawCoreRecipes(ts,core);
      for(const route of routes)pending.push({id:'core-exposed:'+route.name,path:'tools/translation/vendor/meta-language/translation/'+route.name,variant:'core-exposed',route});
      while(pending.length){
        const request=pending.shift();if(modules.has(request.id))continue;if(modules.size>=LIMITS.modules)fail('module bound');
        const raw=original(request.path);let source=raw.source,language=[];
        if(request.route)for(const rule of request.route.replacements){if(source.split(rule.expected).length!==2)fail('core whole language anchor differs: '+rule.id);source=source.replace(rule.expected,rule.replacement);language.push(rule);}
        const facts=moduleFacts(ts,{id:request.id,path:request.path,variant:request.variant,source,originalPin:raw.pin,sourcePin:pin(source),language},blockers);
        if(request.route)for(const edge of facts.imports)if(edge.specifier==='./types.js')edge.target='tools/translation/checked-types.mjs';
        modules.set(facts.id,facts);edgeCount+=facts.imports.length;if(edgeCount>LIMITS.edges)fail('static edge bound');
        for(const edge of facts.imports)if(edge.kind==='module')pending.push({id:edge.target,path:edge.target,variant:'original'});
      }
      const rows=[...modules.values()],scc=components(rows),cycles=scc.filter(group=>group.length>1||rows.find(row=>row.id===group[0]).imports.some(edge=>edge.target===group[0]));
      const coreVariants=routes.map(route=>'core-exposed:'+route.name),rawClosures=[];
      for(const id of coreVariants){
        const seen=new Set(),pending=[id];
        while(pending.length){const next=pending.pop();if(seen.has(next))continue;seen.add(next);for(const edge of modules.get(next).imports)if(edge.kind==='module')pending.push(edge.target);}
        const hostBackEdge=seen.has('tools/translation/extensions/host-contracts.mjs');
        rawClosures.push({id,modules:[...seen],hostBackEdge,coverage:'static only; dynamic and native execution still unproved'});
        if(hostBackEdge)blockers.push({gate:'raw-core-leaf-staging',module:id,message:'Actual raw closure reaches Host; cannot stage it as a leaf.'});
      }
      blockers.push({gate:'esm-cjs-live-binding-tdz',status:'unproved',components:cycles,message:'SCC data and candidate output do not prove ESM evaluation/hoisting/TDZ behavior.'});
      blockers.push({gate:'imported-call-this-and-namespace',status:'unproved',message:'Complete syntactic imported-reference records are retained; lexical binding/callthis/namespace descriptor equivalence is not established.'});
      blockers.push({gate:'complete-native-host-and-private-escape',status:'unproved',message:'Identifier/call/class census is not native/global/iterator/species/Error/callback/write-slot qualification.'});
      blockers.push({gate:'aliased-dynamic-execution',status:'unproved',message:'Direct dynamic syntax is not a proof of absence of aliased Function/eval/require or registered executable data providers.'});
      for(const row of rows){
        if(row.awaits.some(item=>item.topLevel))blockers.push({gate:'tla-staging',module:row.id,awaits:row.awaits.filter(item=>item.topLevel),status:'unproved'});
        if(row.dynamic.length)blockers.push({gate:'dynamic-execution-closure',module:row.id,sites:row.dynamic,status:'unproved'});
        for(const item of row.meta)if(item.text!=='import.meta.url')blockers.push({gate:'unknown-import-meta',module:row.id,span:item.span});
      }
      return {rows,scc,coreVariants,rawClosures,routes};
    }}]},
    {phase:'repository',rules:[{id:'private-rust:canonical-urls-cjs-candidates-and-closed-report',apply:graph=>{
      const outputs=[];let compiledBytes=0;
      for(const row of graph.rows){
        const url=pathToFileURL(resolve(root,row.path)).href,edits=row.meta.filter(item=>item.text==='import.meta.url').map(item=>({start:item.span.start,end:item.span.end,expected:'import.meta.url',replacement:JSON.stringify(url)})),normalized=applyEdits(row.source,edits);
        const emitted=ts.transpileModule(normalized.source,{fileName:row.path,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,sourceMap:true,inlineSources:true,removeComments:false,importHelpers:false,noEmitHelpers:false},reportDiagnostics:true});
        compiledBytes+=Buffer.byteLength(emitted.outputText)+Buffer.byteLength(emitted.sourceMapText??'');if(compiledBytes>LIMITS.compiledBytes)fail('complete candidate code/map bound');
        outputs.push({...row,canonicalURL:url,normalization:normalized,candidateCommonJS:emitted.outputText,candidatePin:pin(emitted.outputText),sourceMap:emitted.sourceMapText??null,
          diagnostics:(emitted.diagnostics??[]).map(entry=>({code:entry.code,message:message(ts,entry)})),
          candidateStatus:'NOTEXECUTABLE: TypeScript CommonJS emission is not an ESM equivalence or native-escape proof.'});
      }
      for(const row of originals.values())if(readFileSync(resolve(root,row.path),'utf8')!==row.source)fail('source changed during proposal');
      return {schema:'private-rust-compiler-source-proposal-v1',sourceRoot:root,compiler:witness,
        trustedToolDomain:'Root-controlled installed TS5.9.3/source generator. Not hostile callback/atomic filesystem/native-total or historical ESM attestation.',
        graphCoverage:'All resolved static sources and three complete actual exposed-core variants; dynamic executable providers remain explicit unresolved source/loader gates.',
        program:null,ready:false,authority:authority(),limits:{...LIMITS},totals:{modules:outputs.length,originalFiles:originals.size,rawBytes,edges:edgeCount,compiledBytes},
        originalSources:[...originals.values()],modules:outputs,scc:graph.scc,coreVariants:graph.coreVariants,rawClosures:graph.rawClosures,coreRecipes:graph.routes,blockers,
        inverseBoundary:'Exact import.meta.url edits have complete undo. TypeScript transpilation retains complete input/output/source map, but no inverse/equivalence proof is claimed.'};
    }}]},
  ]);
  const result=pipeline.run(undefined);return {...result.value,trace:result.trace};
}

function physicalDestination(path){
  let anchor=path;const tail=[];
  while(true){
    try{return resolve(realpathSync(anchor),...tail);}
    catch(error){
      if(error.code!=='ENOENT')throw error;
      // A dangling link is not a nonexistent ordinary tail. Do not infer its
      // physical destination from its lexical parent or create through it.
      let entry;try{entry=lstatSync(anchor);}catch(missing){if(missing.code!=='ENOENT')throw missing;}
      if(entry)fail('unresolved output component');
      const parent=dirname(anchor);if(parent===anchor)fail('output ancestor unavailable');
      tail.unshift(basename(anchor));anchor=parent;
    }
  }
}
function disjoint(source,output){
  return output!==source&&!pathWithin(source,output)&&!pathWithin(output,source);
}
/** Write a proposal outside the physical source tree; never install code. */
export function writePrivateRustCompilerProposal(proposal,outputRoot){
  if(!proposal||proposal.schema!=='private-rust-compiler-source-proposal-v1'||proposal.program!==null||proposal.ready!==false)fail('unprepared source proposal required');
  if(typeof outputRoot!=='string'||!isAbsolute(outputRoot))fail('absolute external output directory required');
  const output=resolve(outputRoot),source=resolve(proposal.sourceRoot);
  const sourcePhysical=realpathSync(source),outputPhysical=physicalDestination(output);
  if(!disjoint(source,output)||!disjoint(sourcePhysical,outputPhysical))fail('proposal output must be outside source root');
  mkdirSync(output,{recursive:true});
  if(realpathSync(source)!==sourcePhysical||realpathSync(output)!==outputPhysical||!disjoint(sourcePhysical,realpathSync(output)))fail('physical proposal destination changed');
  // Root-controlled directory creation, not an atomic external-filesystem
  // theorem. wx still refuses every existing output file, including links.
  const file=resolve(output,'complete-source-proposal.json');writeFileSync(file,JSON.stringify(proposal,null,2)+'\n',{flag:'wx'});return file;
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const args=process.argv.slice(2);if(args.length!==4||args[0]!=='--source-root'||args[2]!=='--output-root')fail('usage: --source-root PATH --output-root PATH');
  const report=preparePrivateRustCompilerPlan({sourceRoot:args[1]}),file=writePrivateRustCompilerProposal(report,args[3]);
  process.stdout.write(JSON.stringify({file,ready:report.ready,program:report.program,totals:report.totals,blockers:report.blockers.map(row=>row.gate)})+'\n');
}
