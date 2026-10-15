import {originalStandardMatchOrigin,originalStandardTupleLayout} from './standard-method-context.mjs';
import { originalStandardSharedPatternLayout } from './standard-shared-pattern-source.mjs';
import { SHARED_REFERENCE_COPY_SOURCE, sharedReferenceCopyIdentity, originalPrimitiveCopySource } from '../shared-reference-copy-source.mjs';
import { originalStringSharedViewSource } from './string-shared-view-source.mjs';
import { JSON_DATA } from './json-contracts.mjs';
// Borrow-only pattern projections begin at genuine original caller syntax.
// This module imports data/proof readers, never a parser/checker/emitter class.
import { originalParsedDeclarationEvidence, metadataDigest } from './source-links.mjs';
import { isJsonMacroSourceProof, jsonMacroOriginalSource } from '../json-macro-inputs.mjs';
import { proveJsonMacroFeatures, isJsonMacroFeatureProof } from '../json-macro-features.mjs';
import { sourceItems } from '../rust-structure.mjs';
import { sameType } from '../checked-types.mjs';
import { renameFunction } from '../vendor/meta-language/translation/ir.js';
import { typeError, unsupported } from '../vendor/meta-language/translation/diagnostics.js';
const dependencies = new WeakMap();
const layout = entry => ({ fullName: entry.fullName, modulePath: entry.modulePath, ctors: entry.ctors, record: entry.record, tuple: entry.tuple, standardGeneric: entry.standardGeneric });
const walk = (node, visit) => {
    if (!node || typeof node !== 'object')
        return;
    visit(node);
    for (const [key, value] of Object.entries(node))
        if (!['type', 'span', 'sourceSharedPatternProof', 'sourcePatternProjectionProof'].includes(key))
            Array.isArray(value) ? value.forEach(child => walk(child, visit)) : walk(value, visit);
};
export function associateOriginalSharedPatternDependencies(surface, proof) {
    if (proof === undefined || proof === null)
        return;
    if (!isJsonMacroSourceProof(proof))
        throw new TypeError('Shared JSON patterns require original sealed dependency inputs');
    const features = proveJsonMacroFeatures(proof);
    if (!isJsonMacroFeatureProof(features))
        throw new TypeError('Shared JSON patterns require actual source feature activation');
    dependencies.set(surface, { proof, features });
}
export function createOriginalSharedPatternAdapter() {
    const contexts = new WeakMap(), active = new WeakMap(), issued = new Map(), projectionOrigins = new WeakSet(), frameOrigins = new WeakSet(), viewOrigins = new WeakSet(), fieldReferences = new WeakSet(), functions = new WeakMap(), emissionScopes = new WeakMap();
    function captureOriginalSharedPatterns(checker, surface) {
        const calls = new WeakMap(), data = new Map(), visit = (items, path = []) => {
            for (const item of items) {
                if (item.k === 'module')
                    visit(item.items, [...path, item.name]);
                else {
                    const evidence = originalParsedDeclarationEvidence(item);
                    if (!evidence)
                        continue;
                    if (item.k === 'data')
                        data.set([...path, item.name].join('.'), { item, evidence, path });
                    if (item.k === 'fn')
                        walk(item.body, node => {
                            if (['match', 'routerOrderedMatch'].includes(node.k))
                                calls.set(node, { digest: metadataDigest(node), evidence, owner: [...path, item.name].join('.') });
                        });
                }
            }
        };
        visit(surface.items);
        contexts.set(checker, { calls, data, json: dependencies.get(surface) });
    }
    const unwrapPattern = node => {
        if (node.k === 'routerNestedMatchPattern')
            return unwrapPattern(node.pattern);
        return { ...node, ...(node.args ? { args: node.args.map(unwrapPattern) } : {}), ...(node.items ? { items: node.items.map(unwrapPattern) } : {}), ...(node.fields ? { fields: node.fields.map(field => ({ ...field, pattern: unwrapPattern(field.pattern) })) } : {}), ...(node.alternatives ? { alternatives: node.alternatives.map(unwrapPattern) } : {}) };
    };
    function referencePointee(type, span) {
        let current = type, depth = 0;
        while (current.rustReference) {
            if (++depth > 32 || current.rustReference.kind !== 'shared' || !current.rustReference.pointee || current.rustGenericIdentityUnresolved || current.rustBorrowingUnresolved)
                throw unsupported('shared source pattern reference', 'requires precise bounded immutable reference depth', span);
            current = current.rustReference.pointee;
        }
        return current;
    }
    function originalJsonLayout(checker, type, span) {
        const state = contexts.get(checker)?.json;
        if (!state || !isJsonMacroSourceProof(state.proof) || !isJsonMacroFeatureProof(state.features))
            throw unsupported('shared JSON pattern layout', 'requires original locked serde_json source and active default features', span);
        const input = jsonMacroOriginalSource(state.proof, 'serde_json', 'src/value/mod.rs'), owners = sourceItems(input.source).filter(item => item.term === 'enum' && item.name === 'Value');
        if (owners.length !== 1)
            throw new TypeError('Original JSON Value enum owner is not unique');
        const tokens = owners[0].tokens.filter(token => token.type !== 'comment'), start = tokens.findIndex(token => token.text === '{'), actual = tokens.slice(start + 1, -1).map(token => token.text).join(''), expected = 'Null,Bool(bool),Number(Number),String(String),Array(Vec<Value>),Object(Map<String,Value>),';
        if (actual !== expected)
            throw new TypeError('Original JSON discriminator/payload declaration changed');
        const entry = checker.items.get(type.name);
        if (!entry || entry.ctors.map(ctor => ctor.name).join(',') !== 'Null,Bool,Number,String,Array,Object' || entry.ctors.some((ctor, index) => ctor.fields.length !== (index === 0 ? 0 : 1) || ctor.fields.some(field => field.name !== 'field0')))
            throw typeError('Shared JSON pattern differs from its original constructor layout', span);
        const original = JSON_DATA[0].items.find(item => item.name === 'Value');
        for (const [index, ctor] of entry.ctors.entries())
            for (const [fieldIndex, field] of ctor.fields.entries()) {
                const expected = checker.hostType(original.ctors[index].fields[fieldIndex].type, [], span);
                if (!sameType(field.type, expected))
                    throw typeError('Shared JSON source payload identity changed', span);
                checker.expectedOwnership(field.type, expected, [], span);
                checker.expectedPrimitiveIdentity(field.type, expected, [], span);
            }
        return { kind: 'original-locked-json-value-layout', source: { path: input.path, sha256: input.sha256, bytes: input.bytes, package: input.package, version: input.version, archiveSha256: input.archiveSha256 }, enumSpan: { start: owners[0].start, end: owners[0].end }, features: state.features, layout: layout(entry), projectionSemanticsOnly: true, cloneAuthority: false, mapIterationAuthority: false };
    }
    function sourceLayout(checker, type, span) {
        const current = referencePointee(type, span);
        if (current.kind !== 'data')
            return null;
        const frame = active.get(checker), entry = checker.items.get(current.name);
        if (!entry)
            throw typeError('Shared source pattern needs its actual checked layout', span);
        if (frame.layouts.has(current.name))
            return entry;
        const origin = contexts.get(checker)?.data.get(current.name),standardTuple=originalStandardTupleLayout(checker,current,entry);
        let proof;
        if(standardTuple)proof=standardTuple;
        else if (origin) {
            originalParsedDeclarationEvidence(origin.item);
            if (entry.ctors.length !== origin.item.ctors.length)
                throw typeError('Original shared pattern constructor layout changed', span);
            for (const [index, ctor] of entry.ctors.entries()) {
                const written = origin.item.ctors[index];
                if (ctor.name !== written.name || ctor.fields.length !== written.fields.length)
                    throw typeError('Original shared pattern constructor identity changed', span);
                for (const [fieldIndex, field] of ctor.fields.entries()) {
                    const expected = checker.resolveType(written.fields[fieldIndex].type, origin.path, span);
                    if (field.name !== (written.fields[fieldIndex].name ?? 'field' + fieldIndex) || !sameType(field.type, expected) || metadataDigest(field.rustTypeSyntax ?? null) !== metadataDigest(written.fields[fieldIndex].rustTypeSyntax ?? null))
                        throw typeError('Original shared pattern field declaration changed', span);
                    checker.expectedOwnership(field.type, expected, origin.path, span);
                    checker.expectedPrimitiveIdentity(field.type, expected, origin.path, span);
                }
            }
            proof = { kind: 'original-source-declaration-layout', source: origin.evidence };
        }
        else if (['Option', 'Result'].includes(entry.standardGeneric?.kind)) {
            const profile = current.rustStandardGeneric, kind = entry.standardGeneric.kind, tags = kind === 'Option' ? ['None', 'Some'] : ['Ok', 'Err'];
            if (profile?.kind !== kind || profile.arguments.length !== entry.standardGeneric.arguments.length || entry.ctors.length !== 2 || tags.some((tag, index) => entry.ctors[index].name !== tag || entry.ctors[index].fields.length !== (tag === 'None' ? 0 : 1)))
                throw typeError('Shared pattern requires its exact original canonical generic identity', span);
            for (const [index, argument] of profile.arguments.entries()) {
                const actual = checker.resolveType(entry.standardGeneric.arguments[index], entry.modulePath, span);
                if (!sameType(argument, actual))
                    throw typeError('Shared pattern canonical argument identity changed', span);
                checker.expectedOwnership(actual, argument, [], span);
                checker.expectedPrimitiveIdentity(actual, argument, [], span);
            }
            for (const [index, ctor] of entry.ctors.entries())
                for (const field of ctor.fields) {
                    const argument = profile.arguments[kind === 'Result' ? index : 0];
                    if (field.name !== 'field0' || !sameType(field.type, argument))
                        throw typeError('Shared standard pattern payload differs from its original generic declaration', span);
                    checker.expectedOwnership(field.type, argument, [], span);
                    checker.expectedPrimitiveIdentity(field.type, argument, [], span);
                }
            proof = { kind: 'actual-canonical-standard-layout', generic: profile, source: originalStandardSharedPatternLayout(kind) };
        }
        else if (current.name === 'serde_json.Value')
            proof = originalJsonLayout(checker, current, span);
        else
            throw unsupported('shared source pattern layout', 'requires an original privately associated declaration or actual canonical standard/JSON owner', span);
        frame.layouts.set(current.name, { layout: structuredClone(layout(entry)), proof: structuredClone(proof) });
        return entry;
    }
    function safeValueDomain(checker, type, span, seen = new Set()) {
        if (type.rustReference) {
            referencePointee(type, span);
            if (!sharedReferenceCopyIdentity(type))
                return false;
            active.get(checker).valueCopies.set(metadataDigest(type), { kind: 'original-shared-reference-copy', type: structuredClone(type), source: SHARED_REFERENCE_COPY_SOURCE, pointeeCopyRequired: false });
            return true;
        }
        if (type.rustOwnership?.kind === 'owned' || type.rustGenericIdentityUnresolved || type.rustBorrowingUnresolved)
            return false;
        if (type.kind === 'data') {
            if (seen.has(type.name))
                return false;
            const entry = sourceLayout(checker, type, span);
            const product=originalStandardTupleLayout(checker,type,entry);
            if (!product&&!['Option', 'Result'].includes(entry?.standardGeneric?.kind))
                return false;
            seen.add(type.name);
            const result = entry.ctors.every(ctor => ctor.fields.every(field => safeValueDomain(checker, field.type, span, seen)));
            seen.delete(type.name);
            if (result)
                active.get(checker).valueCopies.set(metadataDigest(type), { kind: product?'original-source-shared-copy-product':'original-standard-derived-copy', type: structuredClone(type), source: product??originalStandardSharedPatternLayout(entry.standardGeneric.kind), payloadCopyRequired: true });
            return result;
        }
        if (type.patternOwnershipRefusal)
            return false;
        const primitive = originalPrimitiveCopySource(type);
        if (primitive) {
            active.get(checker).valueCopies.set(metadataDigest(type), { kind: 'original-primitive-copy', type: structuredClone(type), source: primitive });
            return true;
        }
        if (type.kind === 'string' && type.rustOwnership?.kind === 'borrowed' && type.rustOwnership.source === 'str') {
            active.get(checker).valueCopies.set(metadataDigest(type), { kind: 'original-borrowed-str-copy', type: structuredClone(type), source: SHARED_REFERENCE_COPY_SOURCE });
            return true;
        }
        return false;
    }
    function hasShared(type, checker, seen = new Set()) {
        if (type?.rustReference)
            return true;
        if (type?.kind !== 'data' || seen.has(type.name))
            return false;
        seen.add(type.name);
        const entry = checker.items.get(type.name);
        return (!!originalStandardTupleLayout(checker,type,entry)||['Option', 'Result'].includes(entry?.standardGeneric?.kind)) && entry.ctors.some(ctor => ctor.fields.some(field => hasShared(field.type, checker, seen)));
    }
    function originalSharedPatternDomain(checker, type, span) {
        const frame = active.get(checker);
        return Boolean(frame && frame.domain && span?.start === frame.span.start && span?.end === frame.span.end && metadataDigest(type) === metadataDigest(frame.subjectType) && safeValueDomain(checker, type, span));
    }
    function originalSharedPatternFieldType(checker, field, parent, ctor, span) {
        const frame = active.get(checker);
        if (!frame)
            return field.type;
        const entry = sourceLayout(checker, parent, span);
        if (!entry?.ctors.includes(ctor) || !ctor.fields.includes(field))
            throw typeError('Shared pattern projection lacks its exact source constructor field', span);
        if (!parent.rustReference)
            return field.type;
        const result = checker.sharedFieldType(field.type, parent, span);
        result.patternOwnershipRefusal = ['fixed', 'bool', 'float'].includes(field.type.kind) ? 'shared source reference' : 'shared field place';
        result.rustReference.source = 'original-shared-pattern-field';
        result.rustReference.sourceCtor = ctor.name;
        result.rustReference.sourceField = field.name;
        fieldReferences.add(result.rustReference);
        return result;
    }
    function originalSharedPatternOwner(checker, node, type, path, env) {
        const frame = active.get(checker);
        if (!frame?.patterns.has(node))
            return null;
        const location = node.span;
        if(node.k==='routerTuplePattern'){
            const entry=sourceLayout(checker,type,location),proof=originalStandardTupleLayout(checker,type,entry);if(!proof||entry.ctors[0].fields.length!==node.items.length)throw unsupported('original shared tuple pattern','requires its complete privately associated standard method product',location);
            const ctor=entry.ctors[0];return {k:'ctor',path:[type.name,ctor.name],data:type.name,ctor:ctor.name,args:node.items.map((child,index)=>originalSharedPatternOwner(checker,child,ctor.fields[index].type,path,env)),span:location};
        }
        if (node.k === 'bindOrCtor') {
            const actual = checker.lookup([node.name], path, location);
            const pointee = referencePointee(type, location), entry = checker.items.get(pointee.name), tag = (entry?.standardGeneric?.kind === 'Option' ? ['Some', 'None'] : entry?.standardGeneric?.kind === 'Result' ? ['Ok', 'Err'] : []).includes(node.name);
            if ((!actual || actual.k === 'fn') && !tag)
                return { k: 'bind', name: node.name, span: location };
        }
        if (node.k === 'or')
            return { ...node, alternatives: node.alternatives.map(child => originalSharedPatternOwner(checker, child, type, path, env)) };
        if (['wild', 'bind', 'numLit', 'boolLit', 'strLit'].includes(node.k))
            return node;
        if (!['ctor', 'bindOrCtor', 'routerRecordPattern'].includes(node.k))
            throw unsupported('shared source pattern syntax', 'requires actual constructor, alternative, literal or immutable binding syntax', location);
        const pointee = referencePointee(type, location), entry = sourceLayout(checker, pointee, location), names = node.k === 'bindOrCtor' ? [node.name] : node.path, actual = checker.lookup(names, path, location);
        if (actual?.constant)
            throw unsupported('shared source constant pattern', 'requires separate actual constant identity checking', location);
        const standard = Boolean(node.registeredGenericOwner) && entry?.standardGeneric?.kind === node.registeredGenericOwner || checker.standardConstructor(names, pointee, path, env, location), record = actual?.k === 'data' && actual.record && actual.ctors.length === 1 ? actual : null, owner = actual?.k === 'ctor' ? actual.data : record?.fullName ?? (standard ? pointee.name : null), name = actual?.k === 'ctor' ? actual.name : record?.ctors[0].name ?? names?.at(-1);
        if (!owner) {
            if (node.k === 'bindOrCtor' && (!actual || actual.k === 'fn'))
                return { k: 'bind', name: node.name, span: location };
            throw typeError('Shared pattern has no actual checked source constructor owner', location);
        }
        if (owner !== pointee.name)
            throw typeError('Shared pattern constructor belongs to a different source declaration', location);
        const ctor = entry.ctors.find(ctor => ctor.name === name);
        if (!ctor)
            throw typeError('Shared source pattern constructor is absent', location);
        const named = ctor.ctorStyle === 'named';
        if ((node.k === 'routerRecordPattern') !== named)
            throw unsupported('shared source constructor style', 'requires its original named/tuple field syntax', location);
        const normalized = { ...node, path: ['crate', ...pointee.name.split('.'), name], data: pointee.name, ctor: name, k: node.k === 'bindOrCtor' ? 'ctor' : node.k };
        if (node.k === 'routerRecordPattern')
            normalized.fields = node.fields.map(child => {
                const field = ctor.fields.find(field => field.name === child.name);
                if (!field)
                    throw typeError('Shared record pattern names no original field', child.span);
                return { ...child, pattern: originalSharedPatternOwner(checker, child.pattern, originalSharedPatternFieldType(checker, field, type, ctor, location), path, env) };
            });
        else
            normalized.args = (node.args ?? []).map((child, index) => {
                const field = ctor.fields[index];
                if (!field)
                    throw typeError('Shared source constructor pattern arity differs', location);
                return originalSharedPatternOwner(checker, child, originalSharedPatternFieldType(checker, field, type, ctor, location), path, env);
            });
        return normalized;
    }
    function originalSharedPatternRecord(checker, pattern, type) {
        return Boolean(active.get(checker) && pattern.k === 'routerRecordPattern' && type.rustReference?.kind === 'shared' && pattern.data === referencePointee(type, pattern.span).name);
    }
    function originalSharedPatternBinding(checker, binding) {
        const frame = active.get(checker), type = binding.type;
        return Boolean(frame && type.rustReference?.kind === 'shared' && referencePointee(type, binding.span));
    }
    function originalSharedPatternProjection(checker, subject, projection, targetType, paths) {
        const frame = active.get(checker);
        if (!frame)
            return null;
        let object = subject;
        for (const [index, field] of projection.entries()) {
            const parent = object.type, entry = sourceLayout(checker, parent, subject.span), selected = paths.filter(path => path.field === field && JSON.stringify(path.projection) === JSON.stringify(projection.slice(0, index)));
            if (!selected.length)
                throw typeError('Shared pattern projection has no selected source path', subject.span);
            const candidates = selected.map(path => {
                const ctor = entry.ctors.find(ctor => ctor.name === path.ctor), actual = ctor?.fields.find(candidate => candidate.name === field);
                if (path.data !== entry.fullName || !actual)
                    throw typeError('Shared pattern projection differs from its selected source constructor', subject.span);
                const type = originalSharedPatternFieldType(checker, actual, parent, ctor, path.type.rustReference?.span ?? subject.span);
                if (!sameType(type, path.type) || metadataDigest(type) !== metadataDigest(path.type))
                    throw typeError('Shared pattern projection reference depth changed', subject.span);
                return { ctor, actual, type };
            });
            if (candidates.some(candidate => metadataDigest(candidate.type) !== metadataDigest(candidates[0].type)))
                throw unsupported('shared pattern alternative projection', 'different actual borrowed field views remain refused', subject.span);
            const wanted = index === projection.length - 1 ? targetType : candidates[0].type;
            if (!sameType(wanted, candidates[0].type))
                throw typeError('Shared pattern final binding type differs from its source projection', subject.span);
            const proof = { profile: 'original-source-borrowed-pattern-field-v1', data: entry.fullName, ctor: candidates[0].ctor.name, field, declaredType: structuredClone(candidates[0].actual.type), projectedType: structuredClone(candidates[0].type), parentType: structuredClone(parent), borrowed: Boolean(parent.rustReference), pointeeMoveAuthority: false, pointeeDropAuthority: false };
            object = { k: 'routerSourcePatternProjection', object, field, type: candidates[0].type, sourcePatternProjectionProof: proof, span: subject.span };
            projectionOrigins.add(proof);
        }
        return object;
    }
    const hasOriginalPatternProjection = node => projectionOrigins.has(node.sourcePatternProjectionProof);
    const hasOriginalSharedPatternFrame = node => frameOrigins.has(node.sourceSharedPatternProof);
    const hasOriginalSharedPatternView = node => viewOrigins.has(node.sourceSharedStringViewProof);
    function originalSharedPatternCoercion(checker, node, env, path, expected) {
        const frame = active.get(checker);
        if (!frame || !['name', 'var'].includes(node.k) || expected?.kind !== 'string' || expected.rustReference || expected.rustOwnership?.kind !== 'borrowed' || expected.rustOwnership.source !== 'str')
            return null;
        const value = checker.expr(node, env, path, undefined), type = value.type, reference = type.rustReference;
        if (type.kind !== 'string' || reference?.kind !== 'shared' || !fieldReferences.has(reference) || reference.pointee?.kind !== 'string' || reference.pointee.rustReference || reference.pointee.rustOwnership?.kind !== 'owned' || reference.pointee.rustOwnership.source !== 'String' || type.rustGenericIdentityUnresolved || type.rustBorrowingUnresolved)
            return null;
        const source = originalStringSharedViewSource(), view = checker.expr({ k: 'routerStringOwnership', operation: 'as_str', object: node, fallback: null, span: node.span }, env, path, expected), proof = { profile: source.profile, source, inputType: structuredClone(type), outputType: structuredClone(view.type), sourceMatchDigest: frame.sourceMatchDigest, borrowOnly: true, dropAuthority: false, pointerIdentityAuthority: false };
        viewOrigins.add(proof);
        return { k: 'routerSourcePatternStringView', value: view, receiver: value, type: view.type, sourceSharedStringViewProof: proof, span: node.span, constEligible: false };
    }
    function checkOriginalSharedPatternMatch(checker, node, env, path, expected, allowLiteral, lower) {
        if (!['match', 'routerOrderedMatch'].includes(node.k) || node.sourceMacro)
            return null;
        const captured = contexts.get(checker)?.calls.get(node)??originalStandardMatchOrigin(checker,node);
        if (!captured)
            return null;
        if (captured.digest !== metadataDigest(node))
            throw unsupported('original shared pattern source', 'requires unchanged privately captured complete match syntax', node.span);
        if (node.k === 'match' && node.scrutinees.length !== 1)
            return null;
        const syntax = node.k === 'match' ? node.scrutinees[0] : node.subject;
        let nonlocal = false;
        walk(syntax, child => {
            if (['routerReturn', 'routerBreak', 'routerContinue', 'routerTry', 'routerAwait'].includes(child.k))
                nonlocal = true;
        });
        if (nonlocal)
            return null;
        const subject = checker.expr(syntax, env, path);
        const existingOwner = checker.items.get(captured.owner), existingLayout = subject.type.rustReference?.kind === 'shared' ? checker.items.get(referencePointee(subject.type, node.span).name) : null;
        if (existingOwner?.impl?.method && node.k === 'match' && existingLayout?.ctors.every(ctor => ctor.fields.every(field => !field.type.rustReference && ['fixed', 'bool', 'float', 'unit'].includes(field.type.kind))))
            return null;
        if (!hasShared(subject.type, checker) || subject.type.rustReference?.source === 'shared-field-projection')
            return null;
        const rows = node.k === 'match' ? node.rows.map(row => ({ ...row, pattern: unwrapPattern(row.patterns[0]), sourcePattern: { pattern: structuredClone(row.patterns[0]), span: row.span } })) : node.rows.map(row => ({ ...row, pattern: unwrapPattern(row.pattern) })), patterns = new WeakSet();
        rows.forEach(row => walk(row.pattern, node => patterns.add(node)));
        const frame = { patterns, subjectType: subject.type, span: node.span, layouts: new Map(), valueCopies: new Map(), domain: true, sourceMatchDigest: captured.digest }, previous = active.get(checker);
        active.set(checker, frame);
        let body;
        try {
            if (!safeValueDomain(checker, subject.type, node.span))
                throw unsupported('shared pattern owned subject', 'requires a shared source place or a canonical value containing only checked shared/Copy fields', node.span);
            body = lower({ ...node, k: 'routerOrderedMatch', subject: syntax, rows });
        }
        finally {
            if (previous)
                active.set(checker, previous);
            else
                active.delete(checker);
        }
        if (body.type.rustReference && (body.type.rustReference.pointee?.rustReference || ['data', 'array', 'string'].includes(referencePointee(body.type, node.span).kind)) || ['data', 'array'].includes(body.type.kind) && hasShared(body.type, checker))
            throw unsupported('shared pattern aggregate escape', 'aggregate pattern loans cannot escape this read-only profile', node.span);
        const owner = checker.items.get(captured.owner);
        if (!owner || owner.k !== 'fn')
            throw new TypeError('Original shared pattern caller signature is absent');
        const signature = { params: owner.params, ret: owner.ret, async: Boolean(owner.async), constFunction: Boolean(owner.constFunction) };
        const proof = { profile: 'original-source-shared-pattern-read-v1', owner: captured.owner, source: captured.evidence, sourceMatchDigest: captured.digest, key: metadataDigest({ source: captured.evidence, body, layouts: [...frame.layouts] }), subjectType: structuredClone(subject.type), layouts: [...frame.layouts.values()].map(value => structuredClone(value)), valueCopies: [...frame.valueCopies.values()].map(value => structuredClone(value)), borrowOnly: true, pointeeMoveAuthority: false, pointeeDropAuthority: false, constEligible: false };
        frameOrigins.add(proof);
        issued.set(proof.key, { proof: structuredClone(proof), body: structuredClone(body), type: structuredClone(body.type), signature: structuredClone(signature) });
        return { k: 'routerOriginalSharedPatternMatch', body, type: body.type, sourceSharedPatternProof: proof, constEligible: false, span: node.span };
    }
    function retarget(value, program) {
        if (Array.isArray(value))
            return value.map(child => retarget(child, program));
        if (!value || typeof value !== 'object')
            return value;
        const result = Object.fromEntries(Object.entries(value).map(([key, child]) => [key, ['sourceSharedPatternProof', 'sourcePatternProjectionProof', 'sourcePattern', 'sourceParameterPatterns', 'sourceSharedStringViewProof'].includes(key) ? child : retarget(child, program)])), target = name => program.declarations.has(name) ? name : program.declarations.has('rp_' + Buffer.from(name).toString('hex')) ? 'rp_' + Buffer.from(name).toString('hex') : name;
        if (value.kind === 'data')
            result.name = target(value.name);
        if (value.kind === 'named') {
            const name = value.path.filter((part, index) => index !== 0 || part !== 'crate').join('.'), mapped = target(name);
            if (mapped !== name)
                result.path = ['crate', mapped];
        }
        if (['ctor', 'routerPatternTag'].includes(value.k))
            result.data = target(value.data);
        if (['call', 'routerFutureCall'].includes(value.k))
            result.fn = target(value.fn);
        return result;
    }
    const framed = node => {
        const found = [];
        walk(node, child => {
            if (child.k === 'routerOriginalSharedPatternMatch')
                found.push(child);
        });
        return found;
    };
    function finalizeOriginalSharedPatterns(checker, program) {
        for (const entry of program.declarations.values())
            if (entry.k === 'fn')
                for (const node of framed(entry.body)) {
                    const state = issued.get(node.sourceSharedPatternProof?.key);
                    if (!state || metadataDigest(state.proof) !== metadataDigest(node.sourceSharedPatternProof) || state.proof.owner !== entry.fullName)
                        throw new Error('Original shared pattern final checking scope changed');
                    state.body = structuredClone(node.body);
                    state.callerBody = structuredClone(entry.body);
                }
    }
    function prepareOriginalSharedPatterns(emitter, entry) {
        const found = framed(entry.body);
        if (!found.length)
            return null;
        for (const node of found) {
            const state = issued.get(node.sourceSharedPatternProof?.key), owner = node.sourceSharedPatternProof?.owner, wantedOwner = emitter.program.declarations.has(owner) ? owner : 'rp_' + Buffer.from(owner ?? '').toString('hex'), actualSignature = { params: entry.params, ret: entry.ret, async: Boolean(entry.async), constFunction: Boolean(entry.constFunction) };
            if (entry.fullName !== wantedOwner || !state || metadataDigest(actualSignature) !== metadataDigest(retarget(state.signature, emitter.program)) || !state.callerBody || metadataDigest(entry.body) !== metadataDigest(retarget(state.callerBody, emitter.program)) || metadataDigest(node.sourceSharedPatternProof) !== metadataDigest(state.proof) || metadataDigest(node.body) !== metadataDigest(retarget(state.body, emitter.program)) || metadataDigest(node.type) !== metadataDigest(retarget(state.type, emitter.program)))
                throw new Error('Shared source pattern/body changed or lacks private original authority');
            for (const original of state.proof.layouts) {
                const wanted = retarget(original.layout, emitter.program), name = emitter.program.declarations.has(original.layout.fullName) ? original.layout.fullName : 'rp_' + Buffer.from(original.layout.fullName).toString('hex'), actual = emitter.program.declarations.get(name);
                if (!actual || metadataDigest({ ctors: actual.ctors, record: actual.record, tuple: actual.tuple, standardGeneric: actual.standardGeneric }) !== metadataDigest({ ctors: wanted.ctors, record: wanted.record, tuple: wanted.tuple, standardGeneric: wanted.standardGeneric }))
                    throw new Error('Shared source pattern original layout changed');
            }
        }
        const previous = functions.get(emitter), renamed = renameFunction(entry, emitter.state.ident, emitter.state.localReserved()), prepared = new Map();
        for (const frame of framed(renamed.body)) {
            const nodes = new Set();
            walk(frame.body, node => {
                if (['routerSourcePatternProjection', 'routerSourcePatternStringView'].includes(node.k))
                    nodes.add(metadataDigest(node));
            });
            prepared.set(metadataDigest(frame), nodes);
        }
        functions.set(emitter, prepared);
        return () => {
            if (previous)
                functions.set(emitter, previous);
            else
                functions.delete(emitter);
        };
    }
    function withOriginalSharedPatternEmission(emitter, node, emit) {
        const allowed = functions.get(emitter)?.get(metadataDigest(node));
        if (!allowed)
            throw new Error('Shared source pattern changed from the exact validated original function rename');
        const previous = emissionScopes.get(emitter);
        emissionScopes.set(emitter, allowed);
        try {
            return emit(node.body);
        }
        finally {
            if (previous)
                emissionScopes.set(emitter, previous);
            else
                emissionScopes.delete(emitter);
        }
    }
    function requireOriginalSharedPatternNodeEmission(emitter, node) {
        if (!emissionScopes.get(emitter)?.has(metadataDigest(node)))
            throw new Error('Shared pattern projection/view requires its exact active privately validated original frame');
    }
    return Object.freeze({ captureOriginalSharedPatterns, checkOriginalSharedPatternMatch, originalSharedPatternDomain, originalSharedPatternOwner, originalSharedPatternFieldType, originalSharedPatternBinding, originalSharedPatternRecord, originalSharedPatternProjection, finalizeOriginalSharedPatterns, prepareOriginalSharedPatterns, withOriginalSharedPatternEmission, requireOriginalSharedPatternNodeEmission, hasOriginalPatternProjection, hasOriginalSharedPatternFrame, originalSharedPatternCoercion, hasOriginalSharedPatternView });
}
