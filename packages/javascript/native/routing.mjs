import { providerModelId } from '../portable/policy.mjs';
import { accountVisibleModels } from './accounts.mjs';
import { RouterError } from './tokens.mjs';

export function modelCandidates(providers, accounts, context = {}) {
  const requested = context.model;
  if (typeof requested !== 'string' || !requested) throw new RouterError('model_required','An exact model id is required',400);
  const candidates = [];
  for (const provider of providers) {
    if (provider.enabled === false || context.provider && context.provider !== provider.name) continue;
    if (context.client && !provider.supported_clients.includes(context.client)) continue;
    for (const account of accounts.values()) {
      if (account.provider !== provider.name || account.enabled === false) continue;
      for (const upstream of provider.models) for (const visible of accountVisibleModels(account,upstream)) {
        if (requested !== visible.selector) continue;
        const headers = { ...account.policy.headers };
        candidates.push({ provider:provider.name, kind:provider.kind, model:visible.model, requested_model:requested,
          selector:visible.selector, account:account.name, base_url:provider.base_url,baseUrl:provider.base_url,
          api_key:account.api_key ?? provider.api_key,apiKey:account.api_key ?? provider.api_key,protocol:provider.protocol,
          headers, supported_clients:provider.supported_clients, default_model:provider.default_model });
      }
    }
  }
  const owners = new Set(candidates.map(c => c.provider));
  if (owners.size > 1 && !context.provider) throw new RouterError('model_conflict',`Exact model id '${requested}' is advertised by more than one provider`,409);
  if (!candidates.length) throw new RouterError('model_not_found',`Exact model id '${requested}' is not advertised by an eligible provider`,404);
  return candidates;
}
export function catalogModels(providers, accounts) {
  const result = new Map();
  for (const provider of providers) if (provider.enabled !== false) for (const account of accounts.values()) if (account.provider === provider.name && account.enabled !== false) {
    for (const model of provider.models) for (const visible of accountVisibleModels(account,model)) {
      for (const id of [visible.selector]) {
        const key = providerModelId(provider.name,id);
        if (!result.has(key)) result.set(key,{id,object:'model',created:0,owned_by:provider.name,provider:provider.name,upstream_model:visible.model,supported_clients:provider.supported_clients});
      }
    }
  }
  return [...result.values()];
}
