// Fresh native declaration selection DATA. The private caller must already
// authenticate the complete canonical runtime/declaration and its source frame.
export function ownedNativeScalarDeclaration(ts,checker,syntax,files,{canonicalPath,mirrorPath,name,symbol}){
 const canonical=syntax.get(canonicalPath);if(!canonical||!symbol)return null;const actual=symbol.flags&ts.SymbolFlags.Alias?checker.getAliasedSymbol(symbol):symbol,declarations=actual?.declarations;if(declarations?.length!==1)return null;
 const node=declarations[0];if(!ts.isTypeAliasDeclaration(node)||node.name.text!==name||!node.modifiers?.some(mod=>mod.kind===ts.SyntaxKind.ExportKeyword))return null;
 const owner=node.getSourceFile();if(owner!==canonical){const mirror=syntax.get(mirrorPath),before=files.get(canonicalPath),other=files.get(mirrorPath);if(!mirror||owner!==mirror||typeof before!=='string'||before!==other)return null;}return node;
}
