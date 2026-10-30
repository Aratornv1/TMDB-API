// Перетворення відповіді TMDB на текст для терміналу.

const PAGE_SIZE = 20; // стільки фільмів TMDB віддає на сторінку
const OVERVIEW_MAX = 110;

export const ATTRIBUTION = 'This product uses the TMDB API but is not endorsed or certified by TMDB.';

function shorten(text, max = OVERVIEW_MAX) {
  const flat = (text ?? '').replace(/\s+/g, ' ').trim();
  return flat.length > max ? `${flat.slice(0, max - 3).trimEnd()}...` : flat;
}

function formatRating(movie) {
  if (!movie.vote_count) return 'no ratings yet';
  const votes = movie.vote_count === 1 ? '1 vote' : `${movie.vote_count} votes`;
  return `${movie.vote_average.toFixed(1)}/10 (${votes})`;
}

export function formatMovie(movie, number) {
  const year = movie.release_date ? movie.release_date.slice(0, 4) : 'n/a';
  const head = `${number}. ${movie.title} (${year}) - ${formatRating(movie)}`;
  const overview = shorten(movie.overview);
  return overview ? `${head}\n   ${overview}` : head;
}

export function formatMovies(data, title) {
  const header = `${title} movies - page ${data.page} of ${data.total_pages}`;
  const results = data.results ?? [];
  if (results.length === 0) return `${header}\n\nNo movies found.`;
  const offset = (data.page - 1) * PAGE_SIZE; // нумерація наскрізна між сторінками
  const entries = results.map((movie, i) => formatMovie(movie, offset + i + 1));
  return `${header}\n\n${entries.join('\n\n')}`;
}
