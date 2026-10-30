import { test } from 'node:test';
import assert from 'node:assert/strict';
import { UserError, parseType, parsePage, buildUrl, fetchMovies } from '../src/tmdb.js';
import { formatMovie, formatMovies } from '../src/format.js';
import { parseEnv } from '../src/env.js';

// Підроблений fetch: повертає задану відповідь і запам'ятовує, з чим його викликали.
function fakeFetch(response) {
  const calls = [];
  const impl = async (url, init) => {
    calls.push({ url: String(url), init });
    if (response instanceof Error) throw response;
    return response;
  };
  return { impl, calls };
}

const ok = (body) => ({ ok: true, status: 200, json: async () => body });
const fail = (status, body) => ({
  ok: false,
  status,
  json: async () => {
    if (body === undefined) throw new SyntaxError('not json');
    return body;
  },
});

test('parseType accepts the four types, case-insensitively', () => {
  for (const type of ['playing', 'popular', 'top', 'upcoming']) assert.equal(parseType(type), type);
  assert.equal(parseType(' TOP '), 'top');
});

test('parseType rejects unknown values', () => {
  for (const bad of ['', 'now_playing', 'toString', undefined]) {
    assert.throws(() => parseType(bad), UserError);
  }
  assert.throws(() => parseType('nope'), /Use one of: playing, popular, top, upcoming/);
});

test('parsePage defaults to 1 and accepts 1..500 only', () => {
  assert.equal(parsePage(), 1);
  assert.equal(parsePage('3'), 3);
  assert.equal(parsePage('500'), 500);
  for (const bad of ['0', '501', '-1', '2.5', 'abc', '']) {
    assert.throws(() => parsePage(bad), UserError);
  }
});

test('buildUrl maps types to TMDB paths and adds optional params', () => {
  assert.equal(buildUrl({ type: 'playing' }).href, 'https://api.themoviedb.org/3/movie/now_playing?page=1');
  assert.equal(buildUrl({ type: 'top', page: 2 }).pathname, '/3/movie/top_rated');
  const url = buildUrl({ type: 'upcoming', language: 'uk-UA', region: 'UA' });
  assert.equal(url.searchParams.get('language'), 'uk-UA');
  assert.equal(url.searchParams.get('region'), 'UA');
  assert.equal(url.pathname, '/3/movie/upcoming');
});

test('fetchMovies sends the bearer token and returns parsed JSON', async () => {
  const data = { page: 1, results: [] };
  const { impl, calls } = fakeFetch(ok(data));
  const result = await fetchMovies({ type: 'popular', page: 1, token: 'abc', fetchImpl: impl });
  assert.deepEqual(result, data);
  assert.match(calls[0].url, /\/3\/movie\/popular\?page=1$/);
  assert.equal(calls[0].init.headers.Authorization, 'Bearer abc');
});

test('fetchMovies refuses to call the API without a token', async () => {
  const { impl, calls } = fakeFetch(ok({}));
  await assert.rejects(fetchMovies({ type: 'top', fetchImpl: impl }), /token is missing/);
  assert.equal(calls.length, 0);
});

test('fetchMovies turns HTTP errors into readable messages', async () => {
  const cases = [
    [401, { status_message: 'Invalid API key' }, /rejected the token \(401\)/],
    [404, undefined, /404/],
    [429, undefined, /Too many requests/],
    [503, undefined, /having problems \(503\)/],
    [400, { status_message: 'Invalid page' }, /TMDB error 400: Invalid page/],
  ];
  for (const [status, body, pattern] of cases) {
    const { impl } = fakeFetch(fail(status, body));
    await assert.rejects(
      fetchMovies({ type: 'top', token: 't', fetchImpl: impl }),
      (err) => err instanceof UserError && pattern.test(err.message),
    );
  }
});

test('fetchMovies reports network failures and timeouts', async () => {
  const down = Object.assign(new TypeError('fetch failed'), { cause: { code: 'ENOTFOUND' } });
  await assert.rejects(
    fetchMovies({ type: 'top', token: 't', fetchImpl: fakeFetch(down).impl }),
    /Cannot reach TMDB: ENOTFOUND/,
  );
  const slow = Object.assign(new Error('timeout'), { name: 'TimeoutError' });
  await assert.rejects(
    fetchMovies({ type: 'top', token: 't', fetchImpl: fakeFetch(slow).impl }),
    /request timed out/,
  );
});

test('fetchMovies rejects a body that is not JSON', async () => {
  const broken = { ok: true, status: 200, json: async () => { throw new SyntaxError('bad'); } };
  await assert.rejects(
    fetchMovies({ type: 'top', token: 't', fetchImpl: fakeFetch(broken).impl }),
    /invalid response/,
  );
});

test('formatMovies prints header, rating and overview', () => {
  const data = {
    page: 1,
    total_pages: 3,
    results: [{ title: 'Alpha', release_date: '2023-04-05', vote_average: 7.456, vote_count: 1456, overview: 'Short.' }],
  };
  assert.equal(
    formatMovies(data, 'Now Playing'),
    'Now Playing movies - page 1 of 3\n\n1. Alpha (2023) - 7.5/10 (1456 votes)\n   Short.',
  );
});

test('formatMovies numbers movies continuously across pages', () => {
  const movie = { title: 'B', release_date: '2024-01-01', vote_average: 5, vote_count: 2, overview: 'x' };
  assert.match(formatMovies({ page: 2, total_pages: 5, results: [movie] }, 'Popular'), /\n21\. B \(2024\)/);
});

test('formatMovie handles missing date, no votes, one vote and no overview', () => {
  assert.equal(
    formatMovie({ title: 'Ghost', release_date: '', vote_count: 0, overview: '' }, 1),
    '1. Ghost (n/a) - no ratings yet',
  );
  assert.match(formatMovie({ title: 'One', release_date: '2020-02-02', vote_average: 8, vote_count: 1, overview: 'x' }, 4), /8\.0\/10 \(1 vote\)/);
});

test('formatMovie shortens long overviews to one line', () => {
  const movie = { title: 'Long', release_date: '2020-01-01', vote_average: 1, vote_count: 5, overview: `line one\n${'word '.repeat(60)}` };
  const second = formatMovie(movie, 1).split('\n')[1];
  assert.ok(second.length <= 3 + 110);
  assert.ok(second.endsWith('...'));
});

test('formatMovies says so when the list is empty', () => {
  assert.equal(formatMovies({ page: 1, total_pages: 0, results: [] }, 'Top Rated'), 'Top Rated movies - page 1 of 0\n\nNo movies found.');
});

test('parseEnv reads KEY=VALUE, skips comments and strips quotes', () => {
  const env = parseEnv('# comment\nTMDB_ACCESS_TOKEN="abc.def"\r\n\nOTHER = plain value \nbad line\n');
  assert.deepEqual(env, { TMDB_ACCESS_TOKEN: 'abc.def', OTHER: 'plain value' });
});
