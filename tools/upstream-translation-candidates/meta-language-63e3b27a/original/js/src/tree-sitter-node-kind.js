// The kind the native runtime reports for a tree-sitter node.
//
// Native `ts_node_type` (Rust `Node::kind`) names the node's alias or grammar
// symbol, while web-tree-sitter's `Node.type` names its public symbol. The two
// agree unless a generated parser maps a symbol to a public symbol with another
// name: tree-sitter-scala 0.26.2 maps the anonymous `(` of class parameters to
// the token its `arguments` alias renamed, so web-tree-sitter would print
// `"arguments"` where the native CLI prints `"("`. An unaliased node's public
// symbol is the one `idForNodeType` returns for its grammar symbol's name, and
// its native kind is that grammar symbol's name.
export function treeSitterNodeKind(node) {
  const language = node.tree.language;
  // Node.type uses `name || "ERROR"`, which turns a legitimate empty
  // grammar symbol (a NUL sentinel) into an error name. The symbol API keeps
  // the original name, as native Node::kind does.
  const type = language.nodeTypeForId(node.typeId) ?? node.type;
  const grammarType = node.grammarType === undefined ? undefined
    : language.nodeTypeForId(node.grammarId) ?? node.grammarType;
  if (grammarType === undefined || type === grammarType) return type;
  const unaliased = language.idForNodeType(grammarType, language.nodeTypeIsNamed(node.grammarId));
  return unaliased === node.typeId ? grammarType : type;
}
