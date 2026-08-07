# Model Providers

Qwen Code allows you to configure multiple model providers through the `modelProviders` setting in your `settings.json`. This enables you to switch between different AI models and providers using the `/model` command.

## Overview

Use `modelProviders` to declare models per provider id that the `/model` picker can switch between. Each key is a provider id and its value is **an array of model definitions** (`ModelConfig[]`). For built-in providers the key must be a valid auth type (`openai`, `anthropic`, `gemini`, `vertex-ai`); a custom provider id (e.g. `idealab`) is allowed as long as you map it to a protocol via the top-level [`providerProtocol`](#custom-provider-ids-providerprotocol) setting. Each model entry requires an `id`; `envKey` is **optional and recommended** (when omitted, it falls back to the auth type's default env key, e.g. `OPENAI_API_KEY` for `openai`), with optional `name`, `description`, `baseUrl`, and `generationConfig`. Credentials are never persisted in settings; the runtime reads them from `process.env[envKey]`. Qwen OAuth models remain hard-coded and cannot be overridden.

> [!note]
>
> Earlier previews wrapped each provider's models in a `{ "protocol": ..., "models": [...] }` object. That shape has been reverted — the current value is the bare `ModelConfig[]` array shown throughout this page. A wrapped entry in an already-migrated (`$version: 4`) settings file is silently skipped, so update any old configs to the array form.

> [!note]
>
> Only the `/model` command exposes non-default auth types. Anthropic, Gemini, etc., must be defined via `modelProviders`. The `/auth` command lists three top-level options: **Alibaba ModelStudio** (with Coding Plan, Token Plan, and Standard API Key in its sub-menu), **Third-party Providers**, and **Custom Provider**. (Qwen OAuth is no longer a selectable dialog entry; its free tier was discontinued on 2026-04-15.)

> [!note]
>
> **Model uniqueness:** Models within the same `authType` are uniquely identified by the combination of `id` + `baseUrl`. This means you can define the same model ID (e.g., `"gpt-4o"`) multiple times under a single `authType` as long as each entry has a different `baseUrl` — for example, one pointing to OpenAI directly and another to a proxy endpoint. If two entries share both the same `id` and the same `baseUrl` (or both omit `baseUrl`), the first occurrence wins and subsequent duplicates are skipped with a warning.

