// Actual native syntax DATA only. These helpers preserve scopes and do not
// certify original bindings, source semantics, ownership or executable behavior.
import {ownershipCompiler} from './js-to-rust/vendor/module-syntax.mjs';
const need=(value,message)=>{if(!value)throw new TypeError('Forward conditional source: '+message);};
export function forwardConditionalSourceStatements(ts,node){
 need(ts===ownershipCompiler(),'actual original native target parser required');
 need(node&&(ts.isBlock(node)||ts.isIfStatement(node)),'complete original block or else-if branch required');
 return ts.isBlock(node)?[...node.statements]:[node];
}
export function forwardConditionalComparisonSource(ts,node){
 need(ts===ownershipCompiler(),'actual original native target parser required');
 // Only an otherwise branch consisting solely of another if can be compared
 // with a direct else-if. Blocks containing declarations or other statements
 // keep their original shape and lexical boundary.
 return node&&ts.isBlock(node)&&node.statements.length===1&&ts.isIfStatement(node.statements[0])?node.statements[0]:node;
}
