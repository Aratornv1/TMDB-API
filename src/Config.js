import { EnvFile } from './EnvFile.js';

// Налаштування програми. Токен береться зі змінної середовища, а якщо її немає, з .env-файлу.
export class Config {
  static TOKEN_KEY = 'TMDB_ACCESS_TOKEN';

  // env і envFile передаються ззовні, тож у тестах не треба чіпати process.env чи диск
  static load({ env = process.env, envFile = new EnvFile() } = {}) {
    return new Config({ token: env[Config.TOKEN_KEY] || envFile.get(Config.TOKEN_KEY) });
  }

  constructor({ token }) {
    this.token = token;
  }
}
