import { UsageError } from './errors.js';

// Тип списку фільмів: значення --type, шлях у TMDB і заголовок для виводу.
// Це «value object»: екземпляри створюються лише тут, як статичні константи, і заморожені.
export class ListType {
  static PLAYING = new ListType('playing', 'now_playing', 'Now Playing');
  static POPULAR = new ListType('popular', 'popular', 'Popular');
  static TOP = new ListType('top', 'top_rated', 'Top Rated');
  static UPCOMING = new ListType('upcoming', 'upcoming', 'Upcoming');

  static all() {
    return [ListType.PLAYING, ListType.POPULAR, ListType.TOP, ListType.UPCOMING];
  }

  static keys() {
    return ListType.all().map((type) => type.key);
  }

  // Рядок користувача → ListType (без урахування регістру й пробілів). Невідомий → UsageError.
  static parse(value) {
    const key = String(value ?? '').trim().toLowerCase();
    const found = ListType.all().find((type) => type.key === key);
    if (!found) {
      throw new UsageError(`Unknown type "${value ?? ''}". Use one of: ${ListType.keys().join(', ')}.`);
    }
    return found;
  }

  constructor(key, path, title) {
    this.key = key; // значення --type
    this.path = path; // частина URL у TMDB
    this.title = title; // заголовок списку у виводі
    Object.freeze(this);
  }
}
