// Source/declaration joins only. Every runtime route still issues and checks its
// own private original proof. No context, output or semantic verdict is copied.
import {createHash} from 'node:crypto';
import {resolve,dirname} from 'node:path';
const BASE='tools/translation/',DISPATCH='./schemars-enclosing-output-dispatch.mjs',TEMPLATE='whole-owner-enclosing-context-candidate.mjs';
const PINS={
 'schemars-enclosing-output-dispatch.mjs':'0111154d7dc2b611882051cbd0053bbd22b42e0e701b965a417671031c558000',
 'schemars-bang-footprints.mjs':'ead30bf9110ece4f8ca9dc4b835579f214c475bcb7d473eac103ab234d2de316',
 'schemars-schema-route.mjs':'75fe8ef78ca451b4afb4fe7a7ec779daaa6b9a61d53f4969cb753852db4b4b17',
 'schemars-with-bang-candidate.mjs':'6f619083967cf0ed7a03b03c1e7af00fddcd1749a11478aa61ef3eb9172ade33',
 'schemars-with-route-candidate.mjs':'a0514a6f40542354e446f9444039ce2338a3fc6061b53aebfaec880e3c881af3',
 'schemars-with-enclosing-route.mjs':'a7b24c3a6095d121cc90687c23aa88b5dec2b25e6f4b36de81d40ae3b395b0c2',
};
const NAMES=['proveSchemarsBangFootprint','assertSchemarsBangFootprint','originalSchemarsOutput'];
const hash=value=>createHash('sha256').update(value).digest('hex'),fail=message=>{throw new TypeError('Proof byte Core Schemars route: '+message);};
const one=(rows,label)=>{if(rows.length!==1)fail('one complete native '+label+' required');return rows[0];};
function parse(ts,path,source){const file=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);if(file.parseDiagnostics.length)fail('complete native source grammar differs');return file;}
function imports(ts,file,path){return file.statements.filter(node=>ts.isImportDeclaration(node)&&node.moduleSpecifier.text===path);}
function nativeJoins(ts,root,sources){
 const rows=new Map(sources.map(row=>[resolve(root,row.path),row.source])),files=new Map([...rows].map(([path,source])=>[path,parse(ts,path,source)])),options={allowJs:true,noLib:true,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.NodeNext,moduleResolution:ts.ModuleResolutionKind.NodeNext},host={
  getSourceFile:path=>files.get(resolve(path)),getDefaultLibFileName:()=>'',writeFile:()=>{},getCurrentDirectory:()=>root,getDirectories:()=>[],directoryExists:path=>[...rows.keys()].some(name=>name.startsWith(resolve(path)+'/')),fileExists:path=>rows.has(resolve(path)),readFile:path=>rows.get(resolve(path)),getCanonicalFileName:path=>path,useCaseSensitiveFileNames:()=>true,getNewLine:()=> '\n',
 },program=ts.createProgram([...rows.keys()],options,host),checker=program.getTypeChecker(),evidence=[];
 function join(name,path,bindings){
  const file=program.getSourceFile(resolve(root,BASE+name)),declaration=one(imports(ts,file,path),name+' import '+path),target=resolve(dirname(file.fileName),path),module=checker.getSymbolAtLocation(declaration.moduleSpecifier);if(!module||!module.declarations?.some(node=>resolve(node.getSourceFile().fileName)===target))fail('actual imported module has foreign source');
  const exported=checker.getExportsOfModule(module),specifiers=declaration.importClause?.namedBindings?.elements;if(!specifiers||!ts.isNamedImports(declaration.importClause.namedBindings))fail('actual named import bindings required');
  for(const [requested,local]of bindings){
   const spec=one([...specifiers].filter(node=>(node.propertyName??node.name).text===requested&&node.name.text===local),'actual local import '+local),symbol=checker.getSymbolAtLocation(spec.name),output=one(exported.filter(row=>row.name===requested),'actual exported '+requested),actual=output.flags&ts.SymbolFlags.Alias?checker.getAliasedSymbol(output):output;
   if(!symbol||!(symbol.flags&ts.SymbolFlags.Alias)||checker.getAliasedSymbol(symbol)!==actual||!actual.declarations?.length||actual.declarations.some(node=>resolve(node.getSourceFile().fileName)!==target))fail('actual native private issuer/export identity differs');
   evidence.push({source:BASE+name,import:path,requested,local,target:target.slice(root.length+1),declarations:actual.declarations.map(node=>({path:node.getSourceFile().fileName,span:[node.getStart(),node.end],source:node.getText()})),actualNativeModuleSymbol:true});
  }
 }
 join(TEMPLATE,DISPATCH,NAMES.map(name=>[name,name]));
 join('schemars-enclosing-output-dispatch.mjs','./derive-footprints.mjs',[['deriveFootprintOriginalContext','deriveFootprintOriginalContext']]);
 join('schemars-enclosing-output-dispatch.mjs','./schemars-bang-footprints.mjs',[['proveSchemarsBangFootprint','proveOriginal'],['assertSchemarsBangFootprint','assertOriginal'],['originalSchemarsOutput','readOriginal'],['isSchemarsBangFootprint','isOriginal']]);
 join('schemars-enclosing-output-dispatch.mjs','./schemars-with-bang-candidate.mjs',['proveSchemarsWithOutput','assertSchemarsWithOutput','originalSchemarsWithOutput','isSchemarsWithOutput'].map(name=>[name,name]));
 for(const name of ['schemars-bang-footprints.mjs','schemars-with-bang-candidate.mjs'])join(name,'./derive-footprints.mjs',['deriveFootprintOriginalContext','deriveFootprintOriginalModule','deriveFootprintHelperAttributeAt','isDeriveFootprintHelperAttributeProof'].map(name=>[name,name]));
 join('schemars-with-enclosing-route.mjs','./derive-footprints.mjs',['deriveFootprintHelperAttributeAt','isDeriveFootprintHelperAttributeProof'].map(name=>[name,name]));
 return evidence;
}
export function prepareSchemarsCoreDispatcherRoute({root,ts,input,mapping}){
 root=resolve(root);if(ts.version!=='5.9.3')fail('actual installed TypeScript5.9.3 required');const template=input(BASE+TEMPLATE),file=parse(ts,BASE+TEMPLATE,template),selected=imports(ts,file,DISPATCH);
 if(!selected.length){const legacy=one(imports(ts,file,'./whole-owner-schemars-bang-footprints-candidate.mjs'),'complete original legacy Schemars route');if(legacy.importClause?.name||!legacy.importClause?.namedBindings||!ts.isNamedImports(legacy.importClause.namedBindings)||JSON.stringify(legacy.importClause.namedBindings.elements.map(node=>[(node.propertyName??node.name).text,node.name.text]))!==JSON.stringify(NAMES.map(name=>[name,name])))fail('complete original legacy Schemars route bindings differ');return {schema:'original-Core-Schemars-route-source-v1',mode:'legacy',prerequisites:[],sources:[],sourceAuthority:false};}
 if(selected.length!==1||selected[0].importClause?.name||!selected[0].importClause?.namedBindings||!ts.isNamedImports(selected[0].importClause.namedBindings)||JSON.stringify(selected[0].importClause.namedBindings.elements.map(node=>[(node.propertyName??node.name).text,node.name.text]))!==JSON.stringify(NAMES.map(name=>[name,name])))fail('exact complete original dispatcher route bindings required');
 const sources=Object.entries(PINS).map(([name,pin])=>{const source=input(BASE+name);if(hash(source)!==pin)fail('complete actual source differs from received dispatcher/private prover: '+name);return {path:BASE+name,source,sha256:pin};});
 const deriveSource=input(BASE+'derive-footprints.mjs');sources.push({path:BASE+'derive-footprints.mjs',source:deriveSource,sha256:hash(deriveSource)},{path:BASE+TEMPLATE,source:template,sha256:hash(template)});input(BASE+'proof-byte-core-schemars-route.mjs');
 const nativeBindings=nativeJoins(ts,root,sources);mapping.set(DISPATCH,DISPATCH);
 return {schema:'original-Core-Schemars-route-source-v1',mode:'same-original-private-dispatcher',module:DISPATCH,source:BASE+'schemars-enclosing-output-dispatch.mjs',sha256:PINS['schemars-enclosing-output-dispatch.mjs'],sources,nativeBindings,prerequisites:sources.map(({path,sha256})=>({path,sha256})),allRuntimePrivateProofChecksRetained:true,foreignProofsRebound:false,sourceAuthority:false};
}
export function completeSchemarsCoreEnclosingRoutes(enclosing,nativeIssuerBindings,selection){
 const dispatcher=enclosing.selection.imports.filter(row=>row.original===DISPATCH||row.target===DISPATCH);
 if(selection.mode==='legacy'){if(dispatcher.length)fail('unexpected dispatcher without its original source closure');return enclosing.selection.imports.filter(row=>row.target.includes('proof-byte-whole-owner-'));}
 if(selection.mode!=='same-original-private-dispatcher'||selection.module!==DISPATCH||dispatcher.length!==1||dispatcher[0].original!==DISPATCH||dispatcher[0].target!==DISPATCH||dispatcher[0].bindings.length!==NAMES.length||JSON.stringify(dispatcher[0].bindings.map(row=>[row.imported,row.requested,row.local]))!==JSON.stringify(NAMES.map(name=>[name,name,name])))fail('one exact same-module dispatcher replacement required');
 if(enclosing.before!==one(selection.sources.filter(row=>row.path===BASE+TEMPLATE),'complete captured enclosing template').source)fail('complete copied enclosing issuer differs from its actual original template');
 const joined=one(nativeIssuerBindings.filter(row=>row.path===enclosing.path&&row.original===DISPATCH&&row.target===selection.source),'copied dispatcher native module join');if(joined.actualNativeModuleSymbol!==true||JSON.stringify(joined.bindings.map(binding=>[binding.imported,binding.requested,binding.local]))!==JSON.stringify(NAMES.map(name=>[name,name,name])))fail('actual dispatcher module identity absent');const source=one(selection.sources.filter(row=>row.path===selection.source),'complete captured dispatcher source');
 for(const binding of joined.bindings){if(!NAMES.includes(binding.imported)||binding.requested!==binding.imported||binding.local!==binding.imported||binding.declarations.length!==1)fail('complete copied dispatcher binding differs');const declaration=binding.declarations[0];if(!declaration.path.endsWith('/'+selection.source)||source.source.slice(...declaration.span)!==declaration.source)fail('complete original dispatcher export declaration differs');}
 return enclosing.selection.imports.filter(row=>row.target.includes('proof-byte-whole-owner-')||row===dispatcher[0]);
}
