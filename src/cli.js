#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { UserError, TYPES, parseType, parsePage, fetchMovies } from './tmdb.js';
import { formatMovies, ATTRIBUTION } from './format.js';
import { loadEnvFile } from './env.js';

const HELP = `Usage: tmdb-app --type <${Object.keys(TYPES).join('|')}> [options]

Types:
  playing   movies that are in theatres now
  popular   popular movies
  top       top rated movies
  upcoming  upcoming movies

Options:
  --type <name>       which list to show (required)
  --page <n>          page number, 1-500 (default 1)
  --language <code>   language of titles and overviews, e.g. uk-UA (default en-US)
  --region <code>     country code for release dates, e.g. UA
  --help              show this help

The token is read from TMDB_ACCESS_TOKEN (environment variable or .env file).
`;

const options = {
  type: { type: 'string', short: 't' },
  page: { type: 'string', short: 'p' },
  language: { type: 'string', short: 'l' },
  region: { type: 'string', short: 'r' },
  help: { type: 'boolean', short: 'h' },
};

const projectDir = join(dirname(fileURLToPath(import.meta.url)), '..');

async function main(argv) {
  const { values } = parseArgs({ args: argv, options });
  if (values.help) return console.log(HELP);
  if (values.type === undefined) throw new UserError(`Missing --type.\n\n${HELP}`);

  const type = parseType(values.type);
  const page = parsePage(values.page);
  const token = process.env.TMDB_ACCESS_TOKEN || loadEnvFile(join(projectDir, '.env')).TMDB_ACCESS_TOKEN;

  const data = await fetchMovies({ type, page, language: values.language, region: values.region, token });
  console.log(formatMovies(data, TYPES[type].title));
  console.log(`\n${ATTRIBUTION}`);
}

try {
  await main(process.argv.slice(2));
} catch (err) {
  const known = err instanceof UserError
    || err?.code === 'ERR_PARSE_ARGS_UNKNOWN_OPTION'
    || err?.code === 'ERR_PARSE_ARGS_INVALID_OPTION_VALUE';
  console.error(known ? `Error: ${err.message}` : err);
  process.exitCode = 1;
}
