// Complete canonical DATA receives two fresh original CST builds per row.
// No stored metadata, successful comparison or public flag grants authority.
import {assertConcreteSyntaxHost} from './concrete-syntax-meta.mjs';
import {transportPrivateConcreteCanonicalChunks} from './private-parser-canonical-meta-chunks.mjs';

export function transportConcreteCanonicalMetaChunks(chunks){
 assertConcreteSyntaxHost();
 const result=transportPrivateConcreteCanonicalChunks(chunks);
 assertConcreteSyntaxHost();return result;
}
