/**
 * Environment-driven test data for the PRU TMS v4 suite. Every value has a sensible
 * default (the confirmed live values from the original CSV-driven conversion) but can be
 * overridden per-environment via .env / CI variables - see env.example.
 */

export const BASE_URL =
  // process.env.PRU_BASE_URL ?? 'https://pru-tms-dev.ap-southeast-1.elasticbeanstalk.com';
  process.env.PRU_BASE_URL ?? 'https://pru-tms-demo.ap-southeast-1.elasticbeanstalk.com';

export const VALID_USERNAME = process.env.PRU_LOGIN_USERNAME ?? 'admin';
export const VALID_PASSWORD = process.env.PRU_LOGIN_PASSWORD ?? 'admin';

// One specific suspended transaction confirmed live on the shared dev environment, reused
// as the target record across every test that needs to open an existing RDMS record rather
// than a specific business-rule-driven one. This demo environment's Error Suspense File
// reseeds periodically, so if this record ages out, override via the env vars below.
export const TEST_POLICY_NUMBER = process.env.PRU_TEST_POLICY_NUMBER ?? '300000020';
export const TEST_ECN = process.env.PRU_TEST_ECN ?? 'RD202634900020';
export const TEST_ERROR_ID = process.env.PRU_TEST_ERROR_ID ?? '0302';
