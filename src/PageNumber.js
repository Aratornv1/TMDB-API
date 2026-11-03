import { UsageError } from './errors.js';

// Номер сторінки, який уже пройшов перевірку. Не можна створити PageNumber(0) чи PageNumber(501):
// якщо в руках є PageNumber, його значення правильне, і далі перевіряти не треба.
export class PageNumber {
  static MAX = 500; // TMDB не віддає сторінки далі за 500

  static parse(value = '1') {
    const number = Number(value);
    if (!/^\d+$/.test(String(value)) || number < 1 || number > PageNumber.MAX) {
      throw new UsageError(`Page must be an integer from 1 to ${PageNumber.MAX}.`);
    }
    return new PageNumber(number);
  }

  #value;

  constructor(value) {
    if (!Number.isInteger(value) || value < 1 || value > PageNumber.MAX) {
      throw new RangeError(`Invalid page number: ${value}`);
    }
    this.#value = value;
    Object.freeze(this);
  }

  get value() {
    return this.#value;
  }

  toString() {
    return String(this.#value);
  }
}
