#!/usr/bin/env node
// Точка входу й composition root: єдине місце, де створюються обʼєкти й з'єднуються між собою.
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CliApp } from './CliApp.js';
import { Config } from './Config.js';
import { EnvFile } from './EnvFile.js';
import { TmdbClient } from './TmdbClient.js';

const projectDir = join(dirname(fileURLToPath(import.meta.url)), '..');

const app = new CliApp({
  config: Config.load({ envFile: EnvFile.load(join(projectDir, '.env')) }),
  createClient: (token) => new TmdbClient({ token }),
});

process.exitCode = await app.run(process.argv.slice(2));
