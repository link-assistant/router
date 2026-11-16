// Independent strict TypeScript consumer source, UNRUN; no owner certificate.
import {borrowedJsonToolIsTranslatable} from '../borrowed-json-tool-predicate-20261103-runtime.mjs';
const tool:unknown={$:'Object',field0:{$:'Map',entries:[{$:'MapEntry',key:'name',value:{$:'String',field0:'独立'}}]}};
const result:boolean=borrowedJsonToolIsTranslatable(tool);
if(!result)throw new Error('nonempty scalar name was rejected');
const root:unknown={$:'Object',field0:{$:'Map',entries:[{$:'MapEntry',key:'function',value:{$:'Null'}},{$:'MapEntry',key:'name',value:{$:'String',field0:'top'}}]}};
if(borrowedJsonToolIsTranslatable(root))throw new Error('present Null incorrectly used root fallback');
