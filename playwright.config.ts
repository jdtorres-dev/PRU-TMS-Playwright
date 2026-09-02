import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';

// Loads PRU_BASE_URL / PRU_LOGIN_USERNAME / PRU_LOGIN_PASSWORD / PRU_TEST_* overrides
// from a local .env file when present (see env.example for the documented defaults -
// the same defaults already baked into test-data/constants.ts).
dotenv.config();

// const BASE_URL = process.env.PRU_BASE_URL ?? 'https://pru-tms-dev.ap-southeast-1.elasticbeanstalk.com';
const BASE_URL = process.env.PRU_BASE_URL ?? 'https://pru-tms-demo.ap-southeast-1.elasticbeanstalk.com/';

export default defineConfig({
  testDir: './tests',
  timeout: 90_000,
  expect: {
    timeout: 15_000,
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // The shared dev environment (a cold-starting Elastic Beanstalk instance) is
  // observed to occasionally take 30-60s to serve its first response, well
  // past a typical navigation timeout - one local retry absorbs that without
  // masking genuine, repeatable failures.
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 4 : undefined,
  reporter: process.env.CI
    ? [['list'], ['html', { open: 'never' }], ['github']]
    : [['list'], ['html', { open: 'never' }]],
  outputDir: 'test-results',

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 20_000,
    navigationTimeout: 60_000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
});
