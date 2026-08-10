import fs from 'fs';
import path from 'path';
import environments from './environments.json';

export type EnvName = keyof typeof environments;

export interface EnvironmentConfig {
  env: EnvName;
  baseUrl: string;
  githubRepo: string;
}

const VALID_ENVS = Object.keys(environments) as EnvName[];
const CONFIG_FILE_PATH = path.resolve(process.cwd(), 'env.config.json');

/**
 * Resolution order (as required by the challenge spec):
 *   1. Command line:      --env=<name>            (e.g. npx playwright test --env=staging)
 *   2. Environment var:   TEST_ENV=<name>          (convenient for CI / Docker / Jenkins)
 *   3. Config file:       env.config.json -> "env"
 *   4. Hard default:      "local"
 *
 * The system checks the CLI option first; if it isn't present it transparently
 * falls back to the config file, satisfying "verify which one is the preferred
 * option, and select the other one if the primary one is not present".
 */
function resolveEnvName(): EnvName {
  const cliArg = process.argv.find((arg) => arg.startsWith('--env='));
  if (cliArg) {
    const value = cliArg.split('=')[1]?.trim();
    if (value && isValidEnv(value)) return value;
    if (value) {
      throw new Error(
        `Invalid --env value "${value}". Valid options: ${VALID_ENVS.join(', ')}`
      );
    }
  }

  if (process.env.TEST_ENV && isValidEnv(process.env.TEST_ENV)) {
    return process.env.TEST_ENV as EnvName;
  }

  if (fs.existsSync(CONFIG_FILE_PATH)) {
    try {
      const fileContents = fs.readFileSync(CONFIG_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(fileContents) as { env?: string };
      if (parsed.env && isValidEnv(parsed.env)) return parsed.env;
    } catch (err) {
      console.warn(
        `[env-resolver] Failed to parse env.config.json, falling back to default. Reason: ${(err as Error).message}`
      );
    }
  }

  return 'local';
}

function isValidEnv(value: string): value is EnvName {
  return VALID_ENVS.includes(value as EnvName);
}

export function getEnvironmentConfig(): EnvironmentConfig {
  const envName = resolveEnvName();
  const config = environments[envName];
  return { env: envName, ...config };
}
