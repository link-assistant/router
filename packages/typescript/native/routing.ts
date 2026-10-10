// GENERATED JavaScript -> structured syntax AST -> TypeScript draft.
// Meta sha256=5cc3b39e5ac32efe273c1d146a5eee0289e5b04376c881229502d650baef0986; dynamic any annotations are explicit draft gaps.
import { providerModelId } from "../portable/policy.js";
import { accountVisibleModels } from "./accounts.js";
import { RouterError } from "./tokens.js";
export function modelCandidates(providers?: any, accounts?: any, context: any = {}): any {
    const requested: any = context.model;
    if (typeof requested !== 'string' || !requested)
        throw new (RouterError as any)('model_required', 'An exact model id is required', 400);
    const candidates: any = [];
    for (const provider of providers as any) {
        if (provider.enabled === false || context.provider && context.provider !== provider.name)
            continue;
        if (context.client && !provider.supported_clients.includes(context.client))
            continue;
        for (const account of accounts.values() as any) {
            if (account.provider !== provider.name || account.enabled === false)
                continue;
            for (const upstream of provider.models as any)
                for (const visible of accountVisibleModels(account, upstream) as any) {
                    if (requested !== visible.selector)
                        continue;
                    const headers: any = { ...account.policy.headers };
                    candidates.push({ provider: provider.name, kind: provider.kind, model: visible.model, requested_model: requested,
                        selector: visible.selector, account: account.name, base_url: provider.base_url, baseUrl: provider.base_url,
                        api_key: account.api_key ?? provider.api_key, apiKey: account.api_key ?? provider.api_key, protocol: provider.protocol,
                        headers, supported_clients: provider.supported_clients, default_model: provider.default_model });
                }
        }
    }
    const owners: any = new (Set as any)(candidates.map((c?: any): any => c.provider));
    if (owners.size > 1 && !context.provider)
        throw new (RouterError as any)('model_conflict', `Exact model id '${requested}' is advertised by more than one provider`, 409);
    if (!candidates.length)
        throw new (RouterError as any)('model_not_found', `Exact model id '${requested}' is not advertised by an eligible provider`, 404);
    return candidates;
}
export function catalogModels(providers?: any, accounts?: any): any {
    const result: any = new (Map as any)();
    for (const provider of providers as any)
        if (provider.enabled !== false)
            for (const account of accounts.values() as any)
                if (account.provider === provider.name && account.enabled !== false) {
                    for (const model of provider.models as any)
                        for (const visible of accountVisibleModels(account, model) as any) {
                            for (const id of [visible.selector] as any) {
                                const key: any = providerModelId(provider.name, id);
                                if (!result.has(key))
                                    result.set(key, { id, object: 'model', created: 0, owned_by: provider.name, provider: provider.name, upstream_model: visible.model, supported_clients: provider.supported_clients });
                            }
                        }
                }
    return [...result.values()];
}
