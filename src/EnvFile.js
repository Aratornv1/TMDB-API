import { existsSync, readFileSync } from 'node:fs';

// Вміст .env-файлу: рядки KEY=VALUE, коментарі з #, значення можна брати в лапки.
// Значення ховаються в приватне поле (#values): ззовні їх читають лише через get().
export class EnvFile {
  #values;

  constructor(values = {}) {
    this.#values = { ...values };
  }

  // Розбір тексту (без файлової системи: легко тестувати)
  static parse(text) {
    const values = {};
    for (const line of text.split(/\r?\n/)) {
      const match = /^\s*([A-Za-z_]\w*)\s*=\s*(.*?)\s*$/.exec(line);
      if (!match) continue; // порожній рядок, коментар або сміття
      values[match[1]] = match[2].replace(/^(["'])(.*)\1$/, '$2');
    }
    return new EnvFile(values);
  }

  // Файлу немає — це не помилка: повертаємо порожній EnvFile
  static load(file) {
    return existsSync(file) ? EnvFile.parse(readFileSync(file, 'utf8')) : new EnvFile();
  }

  get(key) {
    return this.#values[key];
  }

  toObject() {
    return { ...this.#values };
  }
}
