import { Movie } from './Movie.js';

// Одна сторінка відповіді TMDB: номер, скільки всього сторінок і фільми (колекція обʼєктів Movie).
export class MoviePage {
  static SIZE = 20; // стільки фільмів TMDB віддає на сторінку

  static fromApi(data) {
    return new MoviePage({
      page: data.page,
      totalPages: data.total_pages,
      movies: (data.results ?? []).map((raw) => Movie.fromApi(raw)),
    });
  }

  constructor({ page, totalPages, movies }) {
    this.page = page;
    this.totalPages = totalPages;
    this.movies = movies;
  }

  get isEmpty() {
    return this.movies.length === 0;
  }

  // Нумерація наскрізна між сторінками: на сторінці 2 перший фільм має номер 21
  get offset() {
    return (this.page - 1) * MoviePage.SIZE;
  }

  // Ітерація «номер + фільм». Генератор: значення віддаються по одному.
  *numbered() {
    for (const [i, movie] of this.movies.entries()) {
      yield { number: this.offset + i + 1, movie };
    }
  }
}
