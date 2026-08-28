import type { Reporter, TestCase, TestResult, FullConfig } from '@playwright/test/reporter';
import * as fs from 'fs';
import * as path from 'path';

// Every spec in this project titles its tests "<TEST-CASE-ID> - <description>"
// (e.g. "TMS-RDMS-GEN-001 - BR-002: ...", "ADD-TC-004 - ...", "TMS-E2E-031 - ..."),
// so the ID is recoverable from the title alone without any per-suite wiring.
const TEST_CASE_ID_PATTERN = /^([A-Z0-9]+(?:-[A-Z0-9]+)+)\s-\s/;

function extractTestCaseId(title: string): string | null {
  const match = title.match(TEST_CASE_ID_PATTERN);
  return match ? match[1] : null;
}

// Copies each executed test's video into test-artifacts/<TC-ID>/video.webm and mirrors
// it into playwright-report/ as video-<TC-ID>.webm, generically for every suite - no
// suite name or TC ID is hardcoded here. Runs as an additional reporter alongside 'html',
// listed after it in playwright.config.ts so the HTML report's own output isn't clobbered.
class TestArtifactsReporter implements Reporter {
  private artifactsDir = '';
  private reportDir = '';
  private videosByTcId = new Map<string, string>();

  onBegin(config: FullConfig) {
    // config.rootDir is the resolved testDir (e.g. "<project>/tests"), not the project
    // root - derive the root from the config file's own location instead so these paths
    // land next to playwright.config.ts regardless of where testDir points.
    const projectRoot = config.configFile ? path.dirname(config.configFile) : process.cwd();
    this.artifactsDir = path.resolve(projectRoot, 'test-artifacts');
    this.reportDir = path.resolve(projectRoot, 'playwright-report');
  }

  onTestEnd(test: TestCase, result: TestResult) {
    const tcId = extractTestCaseId(test.title);
    if (!tcId) return;

    const video = result.attachments.find(a => a.name === 'video' && a.path);
    if (!video?.path) return;

    const tcDir = path.join(this.artifactsDir, tcId);
    fs.mkdirSync(tcDir, { recursive: true });
    fs.copyFileSync(video.path, path.join(tcDir, 'video.webm'));

    // Later attempts (retries) overwrite earlier ones, so the artifact reflects the final run.
    this.videosByTcId.set(tcId, video.path);
  }

  onEnd() {
    if (this.videosByTcId.size === 0) return;
    fs.mkdirSync(this.reportDir, { recursive: true });
    for (const [tcId, videoPath] of this.videosByTcId) {
      if (!fs.existsSync(videoPath)) continue;
      fs.copyFileSync(videoPath, path.join(this.reportDir, `video-${tcId}.webm`));
    }
  }
}

export default TestArtifactsReporter;
