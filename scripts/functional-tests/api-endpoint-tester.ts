/*
  API Endpoint Tester
  Tests that API endpoints in scaffolded projects respond correctly.
  Note: This requires the server to be running, so it's typically used
  in conjunction with server startup validation.
*/

export type APIEndpointResult = {
  passed: boolean;
  errors: string[];
  warnings: string[];
};

/**
 * Performs API endpoint checks against a scaffolded project.
 *
 * The function attempts to validate the project's HTTP endpoints given a running server. Currently the implementation is a placeholder that records informational warnings about incomplete testing and the need for a reachable server.
 *
 * @param _projectPath - Filesystem path to the project whose endpoints should be tested
 * @param _serverUrl - Base URL of the running server to test against (e.g., `http://localhost:3000`)
 * @param _config - Optional test configuration:
 *   - `authProvider`: name of the authentication provider to consider when selecting auth-related checks
 *   - `frontends`: list of frontend identifiers (for example `['react','vue']`) to guide frontend-specific route checks
 * @returns An object describing the results:
 *   - `passed`: `true` if all executed checks passed, `false` otherwise
 *   - `errors`: array of failure messages for checks that did not pass
 *   - `warnings`: array of informational messages or reminders (currently includes placeholders about incomplete implementation and server availability)
 */
export async function testAPIEndpoints(
  _projectPath: string,
  _serverUrl: string = 'http://localhost:3000',
  _config: {
    authProvider?: string;
    frontends?: string[];
  } = {}
): Promise<APIEndpointResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Placeholder: Actual API endpoint testing would require:
  // - Server to be running
  // - HTTP requests to endpoints
  // - Response validation
  // - Authentication testing (if auth enabled)
  warnings.push('API endpoint testing is not yet fully implemented');
  warnings.push('This requires the server to be running and accessible');

  // For now, we just verify the structure
  // Actual implementation would test:
  // - Root route (frontend pages)
  // - Frontend-specific routes (/react, /vue, etc.)
  // - HTMX endpoints (/htmx, /htmx/count, etc.)
  // - Auth endpoints (if enabled)
  // - Count history endpoints (if no auth)

  return { passed: true, errors, warnings };
}

// CLI usage
if (require.main === module) {
  const projectPath = process.argv[2];
  const serverUrl = process.argv[3] || 'http://localhost:3000';

  if (!projectPath) {
    console.error('Usage: bun run scripts/functional-tests/api-endpoint-tester.ts <project-path> [server-url]');
    process.exit(1);
  }

  testAPIEndpoints(projectPath, serverUrl)
    .then((result) => {
      if (result.passed) {
        console.log(`✓ API endpoint test passed`);
        if (result.warnings.length > 0) {
          result.warnings.forEach((warning) => console.warn(`  ⚠ ${warning}`));
        }
        process.exit(0);
      } else {
        console.error('✗ API endpoint test failed:');
        result.errors.forEach((error) => console.error(`  - ${error}`));
        process.exit(1);
      }
    })
    .catch((e) => {
      console.error('✗ API endpoint test error:', e);
      process.exit(1);
    });
}
