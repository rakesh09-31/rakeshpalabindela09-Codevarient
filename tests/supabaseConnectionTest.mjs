import assert from 'node:assert';
import { isSupabaseConfigured, getSupabaseConfigInfo, checkSupabaseConnection } from '../src/services/supabaseClient.ts';

console.log('=== RUNNING SUPABASE CLIENT UNIT & SAFETY VERIFICATION ===\n');

// 1. Verification of Safe Initialization when unconfigured
console.log('Test 1: Safe fallback when environment variables are unset');
assert.strictEqual(isSupabaseConfigured(), false, 'isSupabaseConfigured should be false without credentials');
const info = getSupabaseConfigInfo();
console.log('  Config info returned:', info);
assert.strictEqual(typeof info.configured, 'boolean', 'info.configured must be a boolean');
assert.strictEqual(info.hasAnonKey, false, 'hasAnonKey should be false without credentials');
assert.strictEqual(info.urlHost, undefined, 'urlHost should be undefined without credentials');
console.log('  ✓ Safe fallback metadata verified.');

// 2. Safe connection probe behavior when unconfigured
console.log('\nTest 2: Safe connection check when unconfigured');
const checkResult = await checkSupabaseConnection();
console.log('  Probe result:', checkResult);
assert.strictEqual(checkResult.success, false, 'Connection check should fail safely');
assert.strictEqual(checkResult.configured, false, 'Configured flag should be false');
assert(checkResult.message.includes('not configured'), 'Should return clear unconfigured message');
console.log('  ✓ Safe connection probe when unconfigured verified.');

console.log('\n=== ALL SUPABASE VERIFICATIONS PASSED FLAWLESSLY! ===');
