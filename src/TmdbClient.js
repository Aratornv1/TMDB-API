import { ApiClient } from './ApiClient.js';
import { ConfigError } from './errors.js';
import { MoviePage } from './MoviePage.js';
import { PageNumber } from './PageNumber.js';

// Клієнт TMDB API v3. Успадковує загальний алгоритм запиту від ApiClient
// і додає лише те, що відомо про TMDB: адреса, токен, тексти помилок.
export class TmdbClient extends ApiClient {
  static BASE_URL = 'https://api.themoviedb.org/3';

  #token;

  constructor({ token, ...options }) {
    super(options); // fetchImpl, timeoutMs
    this.#token = token;
  }

  // ── Перевизначені методи базового класу (поліморфізм) ──
  get serviceName() {
    return 'TMDB';
  }

  buildHeaders() {
    return { ...super.buildHeaders(), Authorization: `Bearer ${this.#token}` };
  }

  describeHttpError(status, apiMessage) {
    if (status === 401) return 'TMDB rejected the token (401). Check TMDB_ACCESS_TOKEN.';
    if (status === 404) return 'TMDB returned 404: nothing found at this address.';
    if (status === 429) return 'Too many requests (429). Wait a moment and try again.';
    if (status >= 500) return `TMDB is having problems (${status}). Try again later.`;
    return super.describeHttpError(status, apiMessage); // решта — загальний текст із базового класу
  }

  // ── Своє ──
  buildUrl(listType, { page = PageNumber.parse(), language, region } = {}) {
    const url = new URL(`${TmdbClient.BASE_URL}/movie/${listType.path}`);
    url.searchParams.set('page', String(page));
    if (language) url.searchParams.set('language', language);
    if (region) url.searchParams.set('region', region);
    return url;
  }

  // Головний метод: список фільмів → MoviePage. Без токена в мережу не ходимо.
  async list(listType, options = {}) {
    if (!this.#token) {
      throw new ConfigError('TMDB access token is missing. Put TMDB_ACCESS_TOKEN in .env (see README).');
    }
    const data = await this.getJson(this.buildUrl(listType, options));
    return MoviePage.fromApi(data);
  }
}
