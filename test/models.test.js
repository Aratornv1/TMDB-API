// Тести доменних класів і форматера: ListType, PageNumber, Movie, MoviePage, MovieFormatter, помилки.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ListType } from '../src/ListType.js';
import { PageNumber } from '../src/PageNumber.js';
import { Movie } from '../src/Movie.js';
import { MoviePage } from '../src/MoviePage.js';
import { MovieFormatter } from '../src/MovieFormatter.js';
import { ApiError, ConfigError, NetworkError, UsageError, UserError } from '../src/errors.js';

const formatter = new MovieFormatter();
const movie = (overrides = {}) => new Movie({
  title: 'Alpha', releaseDate: '2023-04-05', voteAverage: 7.456, voteCount: 1456, overview: 'Short.', ...overrides,
});

// ── помилки ──
test('усі прикладні помилки — UserError; імʼя дорівнює назві класу', () => {
  for (const E of [UsageError, ConfigError, NetworkError]) {
    const err = new E('x');
    assert.ok(err instanceof UserError && err instanceof Error);
    assert.equal(err.name, E.name);
  }
  const api = new ApiError('x', 503);
  assert.ok(api instanceof UserError);
  assert.equal(api.status, 503);
});

// ── ListType ──
test('ListType.parse приймає чотири типи без урахування регістру й пробілів', () => {
  for (const key of ['playing', 'popular', 'top', 'upcoming']) assert.equal(ListType.parse(key).key, key);
  assert.equal(ListType.parse(' TOP '), ListType.TOP); // той самий обʼєкт
});

test('ListType.parse відхиляє невідоме UsageError-ом зі списком допустимих', () => {
  for (const bad of ['', 'now_playing', 'toString', undefined]) {
    assert.throws(() => ListType.parse(bad), UsageError);
  }
  assert.throws(() => ListType.parse('nope'), /Use one of: playing, popular, top, upcoming/);
});

test('ListType: шлях і заголовок; екземпляри заморожені', () => {
  assert.equal(ListType.TOP.path, 'top_rated');
  assert.equal(ListType.PLAYING.title, 'Now Playing');
  assert.throws(() => { 'use strict'; ListType.TOP.path = 'x'; }, TypeError);
});

// ── PageNumber ──
test('PageNumber.parse: за замовчуванням 1, дозволені 1..500', () => {
  assert.equal(PageNumber.parse().value, 1);
  assert.equal(PageNumber.parse('3').value, 3);
  assert.equal(PageNumber.parse('500').value, 500);
  assert.equal(String(PageNumber.parse('7')), '7');
  for (const bad of ['0', '501', '-1', '2.5', 'abc', '']) {
    assert.throws(() => PageNumber.parse(bad), UsageError);
  }
});

test('PageNumber не дозволяє створити неправильне значення в обхід parse', () => {
  assert.throws(() => new PageNumber(0), RangeError);
  assert.throws(() => new PageNumber(501), RangeError);
});

// ── Movie ──
test('Movie.fromApi перекладає snake_case у свої поля', () => {
  const m = Movie.fromApi({ title: 'T', release_date: '2020-02-02', vote_average: 8, vote_count: 3, overview: 'o' });
  assert.deepEqual({ ...m }, { title: 'T', releaseDate: '2020-02-02', voteAverage: 8, voteCount: 3, overview: 'o' });
});

test('Movie: рік, наявність оцінок і короткий опис', () => {
  assert.equal(movie().year, '2023');
  assert.equal(movie({ releaseDate: '' }).year, 'n/a');
  assert.equal(movie({ voteCount: 0 }).hasRatings, false);
  const long = movie({ overview: `line one\n${'word '.repeat(60)}` }).shortOverview;
  assert.ok(long.length <= Movie.OVERVIEW_MAX && long.endsWith('...') && !long.includes('\n'));
  assert.equal(movie({ overview: undefined }).shortOverview, '');
});

// ── MoviePage ──
test('MoviePage.fromApi збирає Movie зі сторінки; відсутній results → порожній список', () => {
  const page = MoviePage.fromApi({ page: 2, total_pages: 5, results: [{ title: 'A' }, { title: 'B' }] });
  assert.ok(page.movies[0] instanceof Movie);
  assert.equal(page.movies.length, 2);
  assert.equal(MoviePage.fromApi({ page: 1, total_pages: 0 }).isEmpty, true);
});

test('MoviePage.numbered: нумерація наскрізна між сторінками', () => {
  const page = new MoviePage({ page: 2, totalPages: 5, movies: [movie({ title: 'X' }), movie({ title: 'Y' })] });
  assert.deepEqual([...page.numbered()].map((e) => e.number), [21, 22]);
  assert.equal(page.offset, MoviePage.SIZE);
});

// ── MovieFormatter ──
test('MovieFormatter.format: заголовок, рейтинг і опис', () => {
  const page = new MoviePage({ page: 1, totalPages: 3, movies: [movie()] });
  assert.equal(
    formatter.format(page, ListType.PLAYING),
    'Now Playing movies - page 1 of 3\n\n1. Alpha (2023) - 7.5/10 (1456 votes)\n   Short.',
  );
});

test('MovieFormatter: нумерація на сторінці 2 починається з 21', () => {
  const page = new MoviePage({ page: 2, totalPages: 5, movies: [movie({ title: 'B', releaseDate: '2024-01-01' })] });
  assert.match(formatter.format(page, ListType.POPULAR), /\n21\. B \(2024\)/);
});

test('MovieFormatter: немає дати, немає голосів, один голос, немає опису', () => {
  assert.equal(
    formatter.formatMovie(movie({ title: 'Ghost', releaseDate: '', voteCount: 0, overview: '' }), 1),
    '1. Ghost (n/a) - no ratings yet',
  );
  assert.match(formatter.formatMovie(movie({ voteAverage: 8, voteCount: 1 }), 4), /8\.0\/10 \(1 vote\)/);
});

test('MovieFormatter: порожній список', () => {
  assert.equal(
    formatter.format(new MoviePage({ page: 1, totalPages: 0, movies: [] }), ListType.TOP),
    'Top Rated movies - page 1 of 0\n\nNo movies found.',
  );
});
