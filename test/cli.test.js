// Тести CliApp: усі залежності підроблені (клієнт, вивід), тож ні мережі, ні справжнього консолі.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CliApp } from '../src/CliApp.js';
import { Config } from '../src/Config.js';
import { ListType } from '../src/ListType.js';
import { Movie } from '../src/Movie.js';
import { MoviePage } from '../src/MoviePage.js';
import { MovieFormatter } from '../src/MovieFormatter.js';
import { ApiError } from '../src/errors.js';

// Підроблений «консоль»: збирає все, що друкується
const sink = () => {
  const lines = [];
  return { lines, log: (x) => lines.push(String(x)), error: (x) => lines.push(String(x)) };
};

function setup({ client, token = 'tok' } = {}) {
  const stdout = sink();
  const stderr = sink();
  const created = [];
  const defaultClient = {
    calls: [],
    async list(type, options) {
      this.calls.push({ type, options });
      return new MoviePage({
        page: 1, totalPages: 1,
        movies: [new Movie({ title: 'Alpha', releaseDate: '2023-01-01', voteAverage: 8, voteCount: 2, overview: 'ok' })],
      });
    },
  };
  const theClient = client ?? defaultClient;
  const app = new CliApp({
    config: new Config({ token }),
    createClient: (t) => { created.push(t); return theClient; },
    stdout,
    stderr,
  });
  return { app, stdout, stderr, created, client: theClient };
}

test('--help: друкує довідку, код 0, клієнта не створює', async () => {
  const { app, stdout, created } = setup();
  assert.equal(await app.run(['--help']), 0);
  assert.equal(stdout.lines[0], CliApp.HELP);
  assert.equal(created.length, 0);
});

test('без --type: код 1, повідомлення містить довідку', async () => {
  const { app, stderr } = setup();
  assert.equal(await app.run([]), 1);
  assert.match(stderr.lines[0], /^Error: Missing --type\./);
  assert.match(stderr.lines[0], /Usage: tmdb-app/);
});

test('успіх: клієнт отримує токен, тип і сторінку; друкується список і атрибуція', async () => {
  const { app, stdout, created, client } = setup();
  assert.equal(await app.run(['-t', 'TOP', '-p', '2', '-l', 'uk-UA', '-r', 'UA']), 0);
  assert.deepEqual(created, ['tok']);
  assert.equal(client.calls[0].type, ListType.TOP);
  assert.equal(client.calls[0].options.page.value, 2);
  assert.equal(client.calls[0].options.language, 'uk-UA');
  assert.equal(client.calls[0].options.region, 'UA');
  assert.match(stdout.lines[0], /^Top Rated movies - page 1 of 1/);
  assert.equal(stdout.lines[1], `\n${MovieFormatter.ATTRIBUTION}`);
});

test('невідомий тип або сторінка: код 1, клієнта не створено', async () => {
  for (const argv of [['--type', 'nope'], ['--type', 'top', '--page', '0']]) {
    const { app, stderr, created } = setup();
    assert.equal(await app.run(argv), 1);
    assert.match(stderr.lines[0], /^Error: /);
    assert.equal(created.length, 0);
  }
});

test('помилки розбору аргументів Node теж друкуються коротко', async () => {
  const { app, stderr } = setup();
  assert.equal(await app.run(['--bogus']), 1);
  assert.match(stderr.lines[0], /^Error: /);
});

test('помилка клієнта (UserError) → «Error: …», код 1', async () => {
  const failing = { list: async () => { throw new ApiError('TMDB rejected the token (401).', 401); } };
  const { app, stderr } = setup({ client: failing });
  assert.equal(await app.run(['--type', 'top']), 1);
  assert.equal(stderr.lines[0], 'Error: TMDB rejected the token (401).');
});

test('непередбачена помилка (баг) друкується повністю, а не як «Error: …»', async () => {
  const buggy = { list: async () => { throw new TypeError('boom'); } };
  const { app, stderr } = setup({ client: buggy });
  assert.equal(await app.run(['--type', 'top']), 1);
  assert.match(stderr.lines[0], /TypeError: boom/);
  assert.ok(!stderr.lines[0].startsWith('Error: '));
});
