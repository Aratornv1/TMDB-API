// Тести клієнтів: TmdbClient і абстрактний ApiClient. Мережа не потрібна: fetch підроблений.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ApiClient } from '../src/ApiClient.js';
import { TmdbClient } from '../src/TmdbClient.js';
import { ListType } from '../src/ListType.js';
import { MoviePage } from '../src/MoviePage.js';
import { PageNumber } from '../src/PageNumber.js';
import { ApiError, ConfigError, NetworkError, UserError } from '../src/errors.js';

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

const client = (response, token = 't') => {
  const fake = fakeFetch(response);
  return { client: new TmdbClient({ token, fetchImpl: fake.impl }), calls: fake.calls };
};

test('ApiClient абстрактний: напряму створити не можна', () => {
  assert.throws(() => new ApiClient(), TypeError);
});

test('нащадок без serviceName одразу падає з пояснення', () => {
  class Broken extends ApiClient {}
  assert.throws(() => new Broken().serviceName, /must define serviceName/);
});

test('TmdbClient є і ApiClient (успадкування)', () => {
  const c = new TmdbClient({ token: 't' });
  assert.ok(c instanceof ApiClient);
  assert.equal(c.serviceName, 'TMDB');
});

test('buildUrl: шлях за типом списку, сторінка за замовчуванням 1, language і region необовʼязкові', () => {
  const c = new TmdbClient({ token: 't' });
  assert.equal(c.buildUrl(ListType.PLAYING).href, 'https://api.themoviedb.org/3/movie/now_playing?page=1');
  assert.equal(c.buildUrl(ListType.TOP, { page: PageNumber.parse('2') }).pathname, '/3/movie/top_rated');
  const url = c.buildUrl(ListType.UPCOMING, { language: 'uk-UA', region: 'UA' });
  assert.equal(url.searchParams.get('language'), 'uk-UA');
  assert.equal(url.searchParams.get('region'), 'UA');
  assert.equal(url.pathname, '/3/movie/upcoming');
});

test('list: надсилає Bearer-токен і повертає MoviePage (а не сирий JSON)', async () => {
  const { client: c, calls } = client(ok({ page: 1, total_pages: 2, results: [{ title: 'A' }] }), 'abc');
  const page = await c.list(ListType.POPULAR);
  assert.ok(page instanceof MoviePage);
  assert.equal(page.movies[0].title, 'A');
  assert.match(calls[0].url, /\/3\/movie\/popular\?page=1$/);
  assert.equal(calls[0].init.headers.Authorization, 'Bearer abc');
  assert.equal(calls[0].init.headers.accept, 'application/json'); // заголовок із базового класу теж на місці
});

test('list без токена: ConfigError, у мережу не йде', async () => {
  const { client: c, calls } = client(ok({}), null); // null, бо undefined у client() замінюється токеном за замовчуванням
  await assert.rejects(c.list(ListType.TOP), (err) => err instanceof ConfigError && /token is missing/.test(err.message));
  assert.equal(calls.length, 0);
});

test('HTTP-помилки стають ApiError зі зрозумілим повідомленням і статусом', async () => {
  const cases = [
    [401, { status_message: 'Invalid API key' }, /rejected the token \(401\)/],
    [404, undefined, /404/],
    [429, undefined, /Too many requests/],
    [503, undefined, /having problems \(503\)/],
    [400, { status_message: 'Invalid page' }, /TMDB error 400: Invalid page/], // текст із базового класу
  ];
  for (const [status, body, pattern] of cases) {
    const { client: c } = client(fail(status, body));
    await assert.rejects(c.list(ListType.TOP), (err) => (
      err instanceof ApiError && err instanceof UserError && err.status === status && pattern.test(err.message)
    ));
  }
});

test('помилки мережі й таймаут: NetworkError', async () => {
  const down = Object.assign(new TypeError('fetch failed'), { cause: { code: 'ENOTFOUND' } });
  await assert.rejects(
    client(down).client.list(ListType.TOP),
    (err) => err instanceof NetworkError && /Cannot reach TMDB: ENOTFOUND/.test(err.message) && err.cause === down,
  );
  const slow = Object.assign(new Error('timeout'), { name: 'TimeoutError' });
  await assert.rejects(client(slow).client.list(ListType.TOP), /request timed out/);
});

test('тіло, що не JSON: ApiError «invalid response»', async () => {
  const broken = { ok: true, status: 200, json: async () => { throw new SyntaxError('bad'); } };
  await assert.rejects(
    client(broken).client.list(ListType.TOP),
    (err) => err instanceof ApiError && /invalid response/.test(err.message),
  );
});
