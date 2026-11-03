import { parseArgs } from 'node:util';
import { ListType } from './ListType.js';
import { PageNumber } from './PageNumber.js';
import { MovieFormatter } from './MovieFormatter.js';
import { UsageError, UserError } from './errors.js';

// Застосунок командного рядка: розбирає аргументи, просить клієнта список і друкує його.
// Усі залежності приходять через конструктор (ін'єкція залежностей), а не створюються тут:
//   • createClient(token) — фабрика клієнта, у тесті підставляємо фейковий;
//   • formatter — як показувати; • stdout/stderr — куди друкувати.
export class CliApp {
  static OPTIONS = {
    type: { type: 'string', short: 't' },
    page: { type: 'string', short: 'p' },
    language: { type: 'string', short: 'l' },
    region: { type: 'string', short: 'r' },
    help: { type: 'boolean', short: 'h' },
  };

  static HELP = `Usage: tmdb-app --type <${ListType.keys().join('|')}> [options]

Types:
  playing   movies that are in theatres now
  popular   popular movies
  top       top rated movies
  upcoming  upcoming movies

Options:
  --type <name>       which list to show (required)
  --page <n>          page number, 1-500 (default 1)
  --language <code>   language of titles and overviews, e.g. uk-UA (default en-US)
  --region <code>     country code for release dates, e.g. UA
  --help              show this help

The token is read from TMDB_ACCESS_TOKEN (environment variable or .env file).
`;

  #config;
  #createClient;
  #formatter;
  #stdout;
  #stderr;

  constructor({ config, createClient, formatter = new MovieFormatter(), stdout = console, stderr = console }) {
    this.#config = config;
    this.#createClient = createClient;
    this.#formatter = formatter;
    this.#stdout = stdout;
    this.#stderr = stderr;
  }

  // Повертає код виходу: 0 — успіх, 1 — помилка. Помилки не вилітають назовні, а друкуються тут.
  async run(argv) {
    try {
      await this.#execute(argv);
      return 0;
    } catch (err) {
      this.#stderr.error(CliApp.isKnownError(err) ? `Error: ${err.message}` : err);
      return 1;
    }
  }

  // «Відома» помилка = користувач міг її виправити (наша UserError або помилка розбору аргументів Node)
  static isKnownError(err) {
    return err instanceof UserError
      || err?.code === 'ERR_PARSE_ARGS_UNKNOWN_OPTION'
      || err?.code === 'ERR_PARSE_ARGS_INVALID_OPTION_VALUE';
  }

  async #execute(argv) {
    const { values } = parseArgs({ args: argv, options: CliApp.OPTIONS });
    if (values.help) return this.#stdout.log(CliApp.HELP);
    if (values.type === undefined) throw new UsageError(`Missing --type.\n\n${CliApp.HELP}`);

    const listType = ListType.parse(values.type);
    const page = PageNumber.parse(values.page);

    const client = this.#createClient(this.#config.token);
    const moviePage = await client.list(listType, { page, language: values.language, region: values.region });

    this.#stdout.log(this.#formatter.format(moviePage, listType));
    this.#stdout.log(`\n${MovieFormatter.ATTRIBUTION}`);
  }
}
