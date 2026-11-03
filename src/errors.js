// Ієрархія помилок (успадкування). Усе, що користувач може виправити сам, — це UserError:
// Cli друкує його коротко («Error: ...»). Будь-що інше вважається багом і друкується зі стеком.
//
//   Error
//    └─ UserError
//        ├─ UsageError    — неправильні аргументи (--type, --page)
//        ├─ ConfigError   — немає токена
//        ├─ NetworkError  — немає звʼязку з сервісом
//        └─ ApiError      — сервіс відповів помилкою (status зберігається в полі)
export class UserError extends Error {
  constructor(message, options) {
    super(message, options);
    this.name = new.target.name; // імʼя класу-нащадка: UsageError, ApiError, ...
  }
}

export class UsageError extends UserError {}

export class ConfigError extends UserError {}

export class NetworkError extends UserError {}

export class ApiError extends UserError {
  constructor(message, status, options) {
    super(message, options);
    this.status = status;
  }
}
