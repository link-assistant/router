// Public standard Result domains require a complete qualified library boundary.
// Actual type-query/import and complete caller checks still run independently.
import {requireOwnedPrimitiveResultSources} from './owned-primitive-result-contracts.mjs';
import {requireOwnedResultSources} from './owned-result-source-contracts.mjs';
export function requireOwnedResultPublicInputSources(files,configuration){
 try{return requireOwnedPrimitiveResultSources(files,configuration);}
 catch{return requireOwnedResultSources(files,configuration);}
}
