// Canonical callable spelling from a complete native syntax comparison.
// This is source DATA only: it never qualifies runtime function/loader identity.
export function createCompilerCallableSourceData(ts,source,file){
 const fail=message=>{throw new TypeError('Compiler callable source DATA: '+message);};
 if(ts.version!=='5.9.3'||file.text!==source||file.parseDiagnostics.length||source.length>10000000)fail('complete installed compiler syntax required');
 const callable=node=>ts.isFunctionDeclaration(node)||ts.isFunctionExpression(node)||ts.isArrowFunction(node)||ts.isMethodDeclaration(node)||ts.isGetAccessorDeclaration(node)||ts.isSetAccessorDeclaration(node);
 const kind=node=>ts.isFunctionDeclaration(node)?ts.SyntaxKind.FunctionExpression:node.kind;
 const name=node=>node.name?.text??null;
 const index=new Map();let visited=0;
 function visit(node){
  if(++visited>2000000)fail('complete compiler syntax budget exceeded');
  if(callable(node)){
   const key=kind(node)+':'+name(node),rows=index.get(key)??[];
   rows.push(node);index.set(key,rows);
  }
  ts.forEachChild(node,visit);
 }
 visit(file);
 function shape(node,outer=true){
  const children=[];ts.forEachChild(node,child=>{children.push(shape(child,false));});
  return [outer?kind(node):node.kind,ts.isIdentifier(node)?node.escapedText:ts.isLiteralExpression(node)?node.text:null,children];
 }
 function parse(text){
  for(const style of ['expression','method']){
   const wrapped=style==='expression'?'const callable=('+text+');':'const callable={'+text+'};';
   const parsed=ts.createSourceFile('observed-compiler-callable.mjs',wrapped,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
   if(parsed.parseDiagnostics.length||parsed.statements.length!==1||!ts.isVariableStatement(parsed.statements[0]))continue;
   const initializer=parsed.statements[0].declarationList.declarations[0]?.initializer;
   const selected=style==='expression'&&ts.isParenthesizedExpression(initializer)?initializer.expression:style==='method'&&ts.isObjectLiteralExpression(initializer)&&initializer.properties.length===1?initializer.properties[0]:null;
   if(selected&&callable(selected))return selected;
  }
  fail('complete observed callable syntax required');
 }
 return function callableSourceData(fn){
  if(typeof fn!=='function')fail('actual callable required');
  const observed=Function.prototype.toString.call(fn);
  if(observed.length>131072)fail('observed callable source budget exceeded');
  const exact=source.indexOf(observed);
  if(exact>=0)return {source:observed,observed,span:[exact,exact+observed.length],exact:true,semanticAuthority:false,runtimeIdentityAuthority:false};
  if(observed.includes('[native code]'))return {source:observed,observed,span:null,exact:true,semanticAuthority:false,runtimeIdentityAuthority:false};
  const parsed=parse(observed),expected=JSON.stringify(shape(parsed)),matches=new Set();
  for(const candidate of index.get(kind(parsed)+':'+name(parsed))??[]){
   if(JSON.stringify(shape(candidate))===expected)matches.add(candidate.getText(file));
  }
  if(matches.size!==1)fail('one complete original callable spelling required');
  const canonical=[...matches][0],start=source.indexOf(canonical);
  if(start<0)fail('complete canonical source span differs');
  return {source:canonical,observed,span:[start,start+canonical.length],exact:false,semanticAuthority:false,runtimeIdentityAuthority:false};
 };
}
