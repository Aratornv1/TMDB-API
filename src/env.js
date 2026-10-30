import { existsSync, readFileSync } from 'node:fs';

// Мінімальний розбір .env: рядки KEY=VALUE, коментарі з #, значення можна брати в лапки.
export function parseEnv(text) {
  const values = {};
  for (const line of text.split(/\r?\n/)) {
    const match = /^\s*([A-Za-z_]\w*)\s*=\s*(.*?)\s*$/.exec(line);
    if (!match) continue; // порожній рядок, коментар або сміття
    values[match[1]] = match[2].replace(/^(["'])(.*)\1$/, '$2');
  }
  return values;
}

export function loadEnvFile(file) {
  return existsSync(file) ? parseEnv(readFileSync(file, 'utf8')) : {};
}
