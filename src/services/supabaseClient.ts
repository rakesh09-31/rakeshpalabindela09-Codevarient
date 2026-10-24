import { createClient, SupabaseClient } from '@supabase/supabase-js';

function getEnvVar(name: string): string {
  // Vite client environment
  try {
    const meta = import.meta as unknown as { env?: Record<string, string> };
    if (meta?.env?.[name]) {
      return String(meta.env[name]).trim();
    }
  } catch {
    // Ignore in non-meta environments
  }

  // Node / Test runtime environment fallback
  try {
    const proc = (globalThis as unknown as { process?: { env?: Record<string, string> } }).process;
    if (proc?.env?.[name]) {
      return String(proc.env[name]).trim();
    }
  } catch {
    // Ignore
  }

  return '';
}

const envUrl = getEnvVar('VITE_SUPABASE_URL');
const envAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY') || getEnvVar('VITE_SUPABASE_PUBLISHABLE_KEY');

function isValidHttpUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Returns true if Supabase environment variables are provided and have plausible values.
 */
export function isSupabaseConfigured(): boolean {
  if (!envUrl || !envAnonKey) return false;
  if (
    envUrl.includes('your-project-ref') ||
    envUrl.includes('your-project-id') ||
    envAnonKey.includes('your-anon-publishable-key')
  ) {
    return false;
  }
  return isValidHttpUrl(envUrl);
}

// Singleton client instance (created only when valid config is detected)
let clientInstance: SupabaseClient | null = null;

if (isSupabaseConfigured()) {
  try {
    clientInstance = createClient(envUrl, envAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  } catch (err) {
    console.error('[Supabase] Failed to initialize Supabase client:', err);
  }
}

/**
 * The reusable Supabase client instance.
 * Evaluates to `null` if credentials are not configured in `.env.local`.
 */
export const supabase = clientInstance;

/**
 * Strict getter that returns the Supabase client or throws a descriptive error.
 */
export function getSupabase(): SupabaseClient {
  if (!clientInstance) {
    throw new Error(
      'Supabase client is not configured. Please define VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env.local file.'
    );
  }
  return clientInstance;
}

export interface SupabaseConfigInfo {
  configured: boolean;
  urlHost?: string;
  hasAnonKey: boolean;
}

/**
 * Safe metadata inspection that never exposes secret keys or full credentials.
 */
export function getSupabaseConfigInfo(): SupabaseConfigInfo {
  let urlHost: string | undefined;
  try {
    if (envUrl && isValidHttpUrl(envUrl)) {
      urlHost = new URL(envUrl).host;
    }
  } catch {
    urlHost = undefined;
  }

  return {
    configured: isSupabaseConfigured(),
    urlHost,
    hasAnonKey: Boolean(envAnonKey && envAnonKey.length > 20),
  };
}

export interface SupabaseConnectionResult {
  success: boolean;
  configured: boolean;
  message: string;
  latencyMs?: number;
  endpoint?: string;
  statusCode?: number;
  errorDetails?: string;
}

/**
 * Safe connection check that probes the Supabase gateway without mutating data or exposing secrets.
 */
export async function checkSupabaseConnection(): Promise<SupabaseConnectionResult> {
  if (!isSupabaseConfigured() || !clientInstance) {
    return {
      success: false,
      configured: false,
      message: 'Supabase credentials are not configured in .env.local.',
      errorDetails: 'Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local to connect.',
    };
  }

  const startTime = performance.now();
  try {
    // Probe the PostgREST gateway with a 0-limit query.
    // If credentials are valid, PostgREST returns a response (200 or 404 relation not found).
    // If the anon key is invalid, PostgREST returns 401 Unauthorized.
    const { error, status } = await clientInstance
      .from('_graveyard_connection_probe')
      .select('*')
      .limit(0);

    const latencyMs = Math.round(performance.now() - startTime);

    if (status === 401 || (error && error.message?.toLowerCase().includes('invalid api key'))) {
      return {
        success: false,
        configured: true,
        statusCode: status || 401,
        latencyMs,
        message: 'Authentication failed with Supabase: Invalid anon/publishable API key.',
        errorDetails: 'Please verify that VITE_SUPABASE_ANON_KEY matches the anon public key in your Supabase project settings.',
      };
    }

    return {
      success: true,
      configured: true,
      statusCode: status || 200,
      latencyMs,
      endpoint: envUrl,
      message: `Successfully connected to Supabase (${latencyMs}ms). Gateway acknowledged client request.`,
    };
  } catch (err: unknown) {
    const latencyMs = Math.round(performance.now() - startTime);
    const errorMessage = err instanceof Error ? err.message : 'Unknown connection error';

    return {
      success: false,
      configured: true,
      latencyMs,
      message: 'Network error: Unable to reach Supabase project endpoint.',
      errorDetails: errorMessage,
    };
  }
}
