// Web Worker for running WASM calculations in the background
// This prevents blocking the main UI thread
//
// Architecture: plan → fetch rates → execute
//
// 1. calculator.plan(expr) — parses the AST to determine required rate sources,
//    LINO interpretation, and alternatives. No rates needed, instant.
// 2. Fetch only the rate sources the plan requires (ECB, CBR, Crypto).
//    Pure math expressions skip this step entirely.
// 3. calculator.execute(expr) — evaluates the expression with rates loaded.
//
// The plan is sent to the main thread immediately so the UI can show the
// interpretation and busy indicator while rates are being fetched.

import init, { Calculator, fetch_exchange_rates, fetch_crypto_rates, fetch_cbr_rates, parse_consolidated_lino_rates } from '@wasm/link_calculator';
import { createRateCoordination, type RateSource } from './worker-rate-coordination';
import { loadCbrRatesFromLinoFiles } from './worker-cbr-lino-loader';

interface CalculatorInstance {
  plan(input: string): string;
  execute(input: string): string;
  calculate(input: string): string;
  update_rates_from_api(base: string, date: string, rates_json: string): number;
  update_crypto_rates_from_api(base: string, date: string, rates_json: string): number;
  update_cbr_rates_from_api(date: string, rates_json: string): number;
  load_rates_from_consolidated_lino(content: string): number;
  set_timezone_offset(offset_minutes: number): void;
  clear_timezone_offset(): void;
}

interface CalculatorStatic {
  new (): CalculatorInstance;
  version(): string;
}

interface ExchangeRatesResponse {
  success: boolean;
  date: string;
  base: string;
  error?: string;
  rates_json: string;
}

interface CryptoRatesResponse {
  success: boolean;
  date: string;
  base: string;
  error?: string;
  rates_json: string;
}

/** Shape of the plan returned by calculator.plan() in Rust. */
interface CalculationPlan {
  expression: string;
  lino_interpretation: string;
  alternative_lino?: string[];
  required_sources: RateSource[];
  currencies: string[];
  is_live_time: boolean;
  success: boolean;
  error?: string;
}

let calculator: CalculatorInstance | null = null;
let ratesLoaded = false;
let ratesLoading = false;
let ratesError: string | null = null;
let cryptoRatesError: string | null = null;

// On-demand rate coordination: calculations detect which rate sources they
// need and wait only for those. Sources that aren't needed are never fetched.
const rateCoordination = createRateCoordination();

async function initWasm() {
  try {
    await init();
    const CalcClass = Calculator as unknown as CalculatorStatic;
    calculator = new CalcClass();

    // Issue #185: interpret `now` and timezone-less times in the user's local
    // timezone by default, so `now-12:30` matches the user's wall clock.
    // `Date.prototype.getTimezoneOffset()` returns minutes *behind* UTC (e.g.
    // -330 for UTC+5:30), so negate it to get minutes *east* of UTC.
    try {
      calculator.set_timezone_offset(-new Date().getTimezoneOffset());
    } catch (tzError) {
      console.warn('Failed to set local timezone offset:', tzError);
    }

    const version = CalcClass.version();
    self.postMessage({ type: 'ready', data: { version } });

    // Register rate fetchers so the coordination module can trigger them
    // on demand. No rates are fetched eagerly — they load when a calculation
    // first needs them.
    rateCoordination.registerFetcher('ecb', fetchExchangeRates);
    rateCoordination.registerFetcher('cbr', fetchCbrRates);
    rateCoordination.registerFetcher('crypto', fetchCryptoRates);
  } catch (error) {
    console.error('Failed to initialize WASM:', error);
    self.postMessage({
      type: 'error',
      data: { error: 'Failed to initialize calculator engine' }
    });
  }
}

async function fetchExchangeRates() {
  if (ratesLoading) {
    return;
  }

  ratesLoading = true;
  ratesError = null;
  self.postMessage({ type: 'ratesLoading', data: { loading: true } });

  try {
    // Fetch rates for common base currencies (USD is most common)
    const responseJson = await fetch_exchange_rates('usd');
    const response: ExchangeRatesResponse = JSON.parse(responseJson);

    if (response.success) {
      ratesLoaded = true;
      ratesError = null;

      // Parse the rates and count them
      const rates = JSON.parse(response.rates_json);
      const ratesCount = Object.keys(rates).length;

      // CRITICAL: Apply the fetched rates to the calculator instance
      // This was the root cause of issue #18 - rates were fetched but never applied
      let appliedCount = 0;
      if (calculator) {
        appliedCount = calculator.update_rates_from_api(
          response.base,
          response.date,
          response.rates_json
        );
      }

      self.postMessage({
        type: 'ratesLoaded',
        data: {
          success: true,
          base: response.base,
          date: response.date,
          ratesCount,
          appliedCount
        }
      });
    } else {
      ratesError = response.error || 'Unknown error fetching rates';
      self.postMessage({
        type: 'ratesLoaded',
        data: {
          success: false,
          error: ratesError
        }
      });
    }
  } catch (error) {
    ratesError = `Failed to fetch exchange rates: ${error}`;
    console.error('Failed to fetch exchange rates:', error);
    self.postMessage({
      type: 'ratesLoaded',
      data: {
        success: false,
        error: ratesError
      }
    });
  } finally {
    ratesLoading = false;
    self.postMessage({ type: 'ratesLoading', data: { loading: false } });
    rateCoordination.markLoaded('ecb');
  }
}

async function fetchCbrRates() {
  try {
    const responseJson = await fetch_cbr_rates();
    const response: ExchangeRatesResponse = JSON.parse(responseJson);

    if (response.success) {
      // Apply CBR rates to the calculator (RUB-based rates from Central Bank of Russia)
      if (calculator) {
        calculator.update_cbr_rates_from_api(
          response.date,
          response.rates_json
        );
      }

      const linoResult = await loadCbrRatesFromLinoFiles({
        calculator,
        parseConsolidatedLinoRates: parse_consolidated_lino_rates,
        applyLatestRates: false,
      });

      self.postMessage({
        type: 'cbrRatesLoaded',
        data: {
          success: true,
          date: response.date,
          historicalRateCount: linoResult.loadedHistoricalRateCount,
          localPairCount: linoResult.loadedPairCount
        }
      });
    } else {
      // CBR direct fetch failed - try loading from local .lino files
      console.warn('[CBR] Direct CBR API fetch failed (likely CORS), falling back to local .lino files:', response.error);
      const linoResult = await loadCbrRatesFromLinoFiles({
        calculator,
        parseConsolidatedLinoRates: parse_consolidated_lino_rates,
      });
      self.postMessage({
        type: 'cbrRatesLoaded',
        data: {
          success: linoResult.loadedPairCount > 0,
          error: linoResult.loadedPairCount > 0 ? undefined : response.error,
          source: linoResult.loadedPairCount > 0 ? 'local .lino files (CBR data)' : undefined,
          loadedCount: linoResult.loadedPairCount,
          historicalRateCount: linoResult.loadedHistoricalRateCount
        }
      });
    }
  } catch (error) {
    // CBR direct fetch threw (typically CORS error in browser) - try local .lino files fallback
    console.warn('[CBR] Direct CBR API request failed (CORS error expected in browser):', error);
    console.info('[CBR] Falling back to local .lino files served via GitHub Pages...');

    try {
      const linoResult = await loadCbrRatesFromLinoFiles({
        calculator,
        parseConsolidatedLinoRates: parse_consolidated_lino_rates,
      });
      if (linoResult.loadedPairCount > 0) {
        console.info(`[CBR] Successfully loaded ${linoResult.loadedPairCount} RUB rate pairs and ${linoResult.loadedHistoricalRateCount} historical CBR rates from local .lino files`);
        self.postMessage({
          type: 'cbrRatesLoaded',
          data: {
            success: true,
            source: 'local .lino files (CBR data)',
            loadedCount: linoResult.loadedPairCount,
            historicalRateCount: linoResult.loadedHistoricalRateCount
          }
        });
      } else {
        console.warn('[CBR] Local .lino files also unavailable. Using hardcoded default rates for RUB.');
        self.postMessage({
          type: 'cbrRatesLoaded',
          data: {
            success: false,
            error: `CBR CORS blocked and local .lino files unavailable. Original error: ${error}`
          }
        });
      }
    } catch (fallbackError) {
      console.error('[CBR] Fallback to local .lino files failed:', fallbackError);
      self.postMessage({
        type: 'cbrRatesLoaded',
        data: { success: false, error: `Failed to fetch CBR rates: ${error}` }
      });
    }
  } finally {
    rateCoordination.markLoaded('cbr');
  }
}

async function fetchCryptoRates(vsCurrency = 'usd') {
  try {
    const responseJson = await fetch_crypto_rates(vsCurrency);
    const response: CryptoRatesResponse = JSON.parse(responseJson);

    if (response.success) {
      cryptoRatesError = null;

      if (calculator) {
        calculator.update_crypto_rates_from_api(
          response.base,
          response.date,
          response.rates_json
        );
      }

      self.postMessage({
        type: 'cryptoRatesLoaded',
        data: {
          success: true,
          base: response.base,
          date: response.date
        }
      });
    } else {
      cryptoRatesError = response.error || 'Unknown error fetching crypto rates';
      self.postMessage({
        type: 'cryptoRatesLoaded',
        data: { success: false, error: cryptoRatesError }
      });
    }
  } catch (error) {
    cryptoRatesError = `Failed to fetch crypto rates: ${error}`;
    console.error('Failed to fetch crypto rates:', error);
    self.postMessage({
      type: 'cryptoRatesLoaded',
      data: { success: false, error: cryptoRatesError }
    });
  } finally {
    rateCoordination.markLoaded('crypto');
  }
}

/**
 * Plan → Fetch → Execute pipeline.
 *
 * 1. Plan: Parse the expression in Rust to determine required rate sources,
 *    LINO interpretation, and alternatives. Sends `plan` message immediately
 *    so the UI can show interpretation while waiting.
 *
 * 2. Fetch: Load only the rate sources the plan requires. Already-loaded
 *    sources resolve instantly. Pure math expressions skip this entirely.
 *
 * 3. Execute: Run the full calculation with rates guaranteed available.
 *    Sends `result` message with the computed value, steps, and metadata.
 */
async function executeCalculation(expression: string): Promise<void> {
  if (!calculator) {
    self.postMessage({
      type: 'error',
      data: { error: 'Calculator not initialized' }
    });
    return;
  }

  // Step 1: Plan — parse the expression to discover requirements
  let plan: CalculationPlan;
  try {
    const planJson = calculator.plan(expression);
    plan = JSON.parse(planJson);
  } catch (error) {
    console.error('Plan error:', error);
    self.postMessage({
      type: 'error',
      data: { error: `Failed to plan calculation: ${error}` }
    });
    return;
  }

  // Send the plan to the main thread so the UI can show the interpretation
  // immediately (before rates are loaded). This gives instant feedback.
  self.postMessage({ type: 'plan', data: plan });

  // If the plan failed to parse, we still try executing — the execute step
  // will produce a proper error message with i18n support.
  // But we can skip rate fetching since we don't know what's needed.

  // Step 2: Fetch — load only the required rate sources
  if (plan.success && plan.required_sources.length > 0) {
    await rateCoordination.ensureRatesForSources(new Set(plan.required_sources));
  }

  // Step 3: Execute — run the calculation with rates loaded
  try {
    const resultJson = calculator.execute(expression);
    const result = JSON.parse(resultJson);
    self.postMessage({ type: 'result', data: result });
  } catch (error) {
    console.error('Calculation error:', error);
    self.postMessage({
      type: 'error',
      data: { error: `Calculation failed: ${error}` }
    });
  }
}

self.onmessage = async (e: MessageEvent) => {
  const { type, expression, baseCurrency } = e.data;

  if (type === 'calculate') {
    await executeCalculation(expression);
  } else if (type === 'refreshRates') {
    // Manual refresh: re-fetch all sources that were previously loaded
    fetchCbrRates();
    fetchExchangeRates();
    fetchCryptoRates();
  } else if (type === 'fetchRates') {
    // Fetch rates for a specific base currency
    if (!baseCurrency) {
      self.postMessage({
        type: 'error',
        data: { error: 'baseCurrency is required' }
      });
      return;
    }

    try {
      const responseJson = await fetch_exchange_rates(baseCurrency);
      const response: ExchangeRatesResponse = JSON.parse(responseJson);
      self.postMessage({ type: 'ratesResult', data: response });
    } catch (error) {
      self.postMessage({
        type: 'ratesResult',
        data: { success: false, error: `Failed to fetch rates: ${error}` }
      });
    }
  } else if (type === 'getRatesStatus') {
    // Return current rates status
    self.postMessage({
      type: 'ratesStatus',
      data: {
        loaded: ratesLoaded,
        loading: ratesLoading,
        error: ratesError
      }
    });
  }
};

// Initialize WASM when worker starts
initWasm();
