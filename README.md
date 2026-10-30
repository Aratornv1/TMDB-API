# TMDB CLI

CLI, що показує списки фільмів з [TMDB API](https://developer.themoviedb.org) — рішення задачі
[roadmap.sh/projects/tmdb-cli](https://roadmap.sh/projects/tmdb-cli).
Node.js ≥ 18, без залежностей (використано вбудований `fetch`).

## Налаштування токена

1. Створи акаунт на [themoviedb.org](https://www.themoviedb.org), відкрий Settings → API і скопіюй **API Read Access Token**.
2. Скопіюй `.env.example` у `.env` і встав токен:

   ```
   TMDB_ACCESS_TOKEN=eyJ...
   ```

   Або задай змінну середовища `TMDB_ACCESS_TOKEN`. Вона має пріоритет над `.env`.
   Файл `.env` у git не потрапляє.

## Використання

```bash
node src/cli.js --type playing     # зараз у кінотеатрах
node src/cli.js --type popular     # популярні
node src/cli.js --type top         # найвищий рейтинг
node src/cli.js --type upcoming    # скоро вийдуть
node src/cli.js --type top --page 2 --language uk-UA --region UA
```

Щоб викликати як `tmdb-app --type playing`, виконай `npm link` у цій папці.

| Опція | Що робить |
| ----- | --------- |
| `--type` (`-t`) | список: `playing`, `popular`, `top`, `upcoming`. Обов'язкова |
| `--page` (`-p`) | сторінка від 1 до 500 (TMDB не віддає далі), за замовчуванням 1 |
| `--language` (`-l`) | мова назв і описів, наприклад `uk-UA` |
| `--region` (`-r`) | код країни для дат виходу, наприклад `UA` |
| `--help` (`-h`) | довідка |

Приклад виводу (дані умовні):

```
Now Playing movies - page 1 of 3

1. The Super Mario Bros. Movie (2023) - 7.5/10 (1456 votes)
   While working underground to fix a water main, Brooklyn plumbers and brothers Mario and Luigi are...

2. Evil Dead Rise (2023) - 7.0/10 (207 votes)
   Two sisters find an ancient vinyl that gives birth to bloodthirsty demons that run amok in a Los...

This product uses the TMDB API but is not endorsed or certified by TMDB.
```

Нумерація наскрізна: на сторінці 2 перший фільм має номер 21.

## Помилки

Усі помилки друкуються як `Error: ...`, код виходу 1.

| Ситуація | Повідомлення |
| -------- | ------------ |
| немає токена | `TMDB access token is missing...` |
| токен не підійшов | `TMDB rejected the token (401)...` |
| забагато запитів | `Too many requests (429)...` |
| помилка на боці TMDB | `TMDB is having problems (5xx)...` |
| немає інтернету, DNS, таймаут 10 с | `Cannot reach TMDB: ...` |
| невідомий `--type` або неправильна сторінка | пояснення й список допустимих значень |

## Умови TMDB

За [FAQ](https://developer.themoviedb.org/docs/faq) API безкоштовний для некомерційного використання,
якщо вказати TMDB як джерело. Тому після кожного списку виводиться
«This product uses the TMDB API but is not endorsed or certified by TMDB.» Для комерційного
використання потрібна ліцензія від TMDB.

## Структура

- `src/tmdb.js` — URL, запит до API, перетворення помилок на зрозумілі повідомлення (`fetch` передається параметром)
- `src/format.js` — форматування списку для терміналу
- `src/env.js` — мінімальний розбір `.env`
- `src/cli.js` — розбір аргументів і запуск
- `test/` — `npm test` (вбудований `node:test`, мережа в тестах не використовується)
