// Fixture construction DATA only. Counts come from the complete native grammar.
import {ownershipCompiler} from '../js-to-rust/vendor/module-syntax.mjs';
export function nativeStaticImportCount(source,target){
 if(typeof source!=='string'||typeof target!=='string')throw new TypeError('Complete fixture source and primitive import target required');
 const ts=ownershipCompiler();if(ts.version!=='5.9.3')throw new TypeError('Installed TypeScript 5.9.3 required');const file=ts.createSourceFile('complete-fixture-module.mjs',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);if(file.parseDiagnostics.length)throw new TypeError('Complete fixture native grammar differs');
 return file.statements.filter(node=>ts.isImportDeclaration(node)&&ts.isStringLiteral(node.moduleSpecifier)&&node.moduleSpecifier.text===target).length;
}
