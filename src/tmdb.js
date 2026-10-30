// Робота з TMDB API v3. fetch передається параметром, тому в тестах мережа не потрібна.

export class UserError extends Error {}

export const BASE_URL = 'https://api.themoviedb.org/3';
export const MAX_PAGE = 500; // TMDB не віддає сторінки далі за 500
const TIMEOUT_MS = 10_000;

// Ключ — значення --type, path — частина URL у TMDB.
export const TYPES = {
  playing: { path: 'now_playing', title: 'Now Playing' },
  popular: { path: 'popular', title: 'Popular' },
  top: { path: 'top_rated', title: 'Top Rated' },
  upcoming: { path: 'upcoming', title: 'Upcoming' },
};

export function parseType(value) {
  const key = String(value ?? '').trim().toLowerCase();
  if (!Object.hasOwn(TYPES, key)) {
    throw new UserError(`Unknown type "${value ?? ''}". Use one of: ${Object.keys(TYPES).join(', ')}.`);
  }
  return key;
}

export function parsePage(value = '1') {
  const page = Number(value);
  if (!/^\d+$/.test(String(value)) || page < 1 || page > MAX_PAGE) {
    throw new UserError(`Page must be an integer from 1 to ${MAX_PAGE}.`);
  }
  return page;
}

export function buildUrl({ type, page = 1, language, region }) {
  const url = new URL(`${BASE_URL}/movie/${TYPES[type].path}`);
  url.searchParams.set('page', String(page));
  if (language) url.searchParams.set('language', language);
  if (region) url.searchParams.set('region', region);
  return url;
}

function httpErrorMessage(status, apiMessage) {
  if (status === 401) return 'TMDB rejected the token (401). Check TMDB_ACCESS_TOKEN.';
  if (status === 404) return 'TMDB returned 404: nothing found at this address.';
  if (status === 429) return 'Too many requests (429). Wait a moment and try again.';
  if (status >= 500) return `TMDB is having problems (${status}). Try again later.`;
  return `TMDB error ${status}${apiMessage ? `: ${apiMessage}` : ''}`;
}

export async function fetchMovies({ type, page, language, region, token, fetchImpl = fetch }) {
  if (!token) {
    throw new UserError('TMDB access token is missing. Put TMDB_ACCESS_TOKEN in .env (see README).');
  }

  let response;
  try {
    response = await fetchImpl(buildUrl({ type, page, language, region }), {
      headers: { Authorization: `Bearer ${token}`, accept: 'application/json' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    const reason = err.name === 'TimeoutError' ? 'request timed out' : (err.cause?.code ?? err.message);
    throw new UserError(`Cannot reach TMDB: ${reason}. Check your internet connection.`);
  }

  if (!response.ok) {
    let apiMessage;
    try {
      apiMessage = (await response.json()).status_message;
    } catch {
      // тіло помилки може бути не JSON — тоді вистачить коду статусу
    }
    throw new UserError(httpErrorMessage(response.status, apiMessage));
  }

  try {
    return await response.json();
  } catch {
    throw new UserError('TMDB returned an invalid response.');
  }
}
