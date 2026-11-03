// Тести EnvFile і Config.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EnvFile } from '../src/EnvFile.js';
import { Config } from '../src/Config.js';

test('EnvFile.parse читає KEY=VALUE, пропускає коментарі й знімає лапки', () => {
  const env = EnvFile.parse('# comment\nTMDB_ACCESS_TOKEN="abc.def"\r\n\nOTHER = plain value \nbad line\n');
  assert.deepEqual(env.toObject(), { TMDB_ACCESS_TOKEN: 'abc.def', OTHER: 'plain value' });
  assert.equal(env.get('OTHER'), 'plain value');
  assert.equal(env.get('MISSING'), undefined);
});

test('EnvFile.toObject повертає копію: зміна копії не псує EnvFile', () => {
  const env = EnvFile.parse('A=1');
  env.toObject().A = '2';
  assert.equal(env.get('A'), '1');
});

test('EnvFile.load: файлу немає → порожній EnvFile, не помилка', () => {
  assert.deepEqual(EnvFile.load('definitely-not-here.env').toObject(), {});
});

test('Config.load: змінна середовища важливіша за .env', () => {
  const envFile = EnvFile.parse('TMDB_ACCESS_TOKEN=from-file');
  assert.equal(Config.load({ env: { TMDB_ACCESS_TOKEN: 'from-env' }, envFile }).token, 'from-env');
  assert.equal(Config.load({ env: {}, envFile }).token, 'from-file');
  assert.equal(Config.load({ env: {}, envFile: new EnvFile() }).token, undefined);
});
