// Routing only. All original source/tool/derive state stays in one issuer.
export * from './core-adoption-producer-context.mjs';
export {
 createSourceBoundToolAwareCoreAdoptionProducerContext as createCoreAdoptionProducerContext,
 createSourceBoundToolAwareCoreAdoptionProducerContext as createEnclosingCoreAdoptionProducerContext,
 coreAdoptionSourceBoundNamespaceAttributeClosed as coreAdoptionDeriveAttributeClosed,
 coreAdoptionSourceBoundProducerClosedAttributeSpans as coreAdoptionProducerClosedAttributeSpans,
 finishSourceBoundToolAwareCoreAdoptionProducerContext as finishCoreAdoptionProducerContext,
 createSourceBoundToolAwareCoreAdoptionNonTraitImportSelector as createCoreAdoptionNonTraitImportSelector,
} from './core-adoption-producer-context.mjs';
