import { ApiError, NetworkError } from './errors.js';

// Абстрактний клієнт HTTP API. Тут лежить ЗАГАЛЬНИЙ алгоритм запиту (патерн «шаблонний метод»):
//   1. зробити запит із таймаутом;   2. мережа впала → NetworkError;
//   3. статус не 2xx → ApiError;     4. тіло не JSON → ApiError.
// А те, що різниться між сервісами (імʼя, заголовки, тексти помилок), нащадок дає сам, перевизначивши
// serviceName, buildHeaders і describeHttpError.
export class ApiClient {
  static DEFAULT_TIMEOUT_MS = 10_000;

  #fetchImpl;
  #timeoutMs;

  // fetchImpl передається ззовні: у тестах підставляємо підроблений fetch, мережа не потрібна
  constructor({ fetchImpl = fetch, timeoutMs = ApiClient.DEFAULT_TIMEOUT_MS } = {}) {
    if (new.target === ApiClient) throw new TypeError('ApiClient is abstract: use a subclass');
    this.#fetchImpl = fetchImpl;
    this.#timeoutMs = timeoutMs;
  }

  // ── Що має дати нащадок ──
  get serviceName() {
    throw new Error(`${this.constructor.name} must define serviceName`);
  }

  buildHeaders() {
    return { accept: 'application/json' };
  }

  describeHttpError(status, apiMessage) {
    return `${this.serviceName} error ${status}${apiMessage ? `: ${apiMessage}` : ''}`;
  }

  // ── Загальний алгоритм (шаблонний метод) ──
  async getJson(url) {
    let response;
    try {
      response = await this.#fetchImpl(url, {
        headers: this.buildHeaders(),
        signal: AbortSignal.timeout(this.#timeoutMs),
      });
    } catch (err) {
      const reason = err.name === 'TimeoutError' ? 'request timed out' : (err.cause?.code ?? err.message);
      throw new NetworkError(`Cannot reach ${this.serviceName}: ${reason}. Check your internet connection.`, { cause: err });
    }

    if (!response.ok) {
      let apiMessage;
      try {
        apiMessage = (await response.json()).status_message;
      } catch {
        // тіло помилки може бути не JSON — тоді вистачить коду статусу
      }
      throw new ApiError(this.describeHttpError(response.status, apiMessage), response.status);
    }

    try {
      return await response.json();
    } catch {
      throw new ApiError(`${this.serviceName} returned an invalid response.`, response.status);
    }
  }
}
