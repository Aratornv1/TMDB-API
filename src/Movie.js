// Один фільм. Приймає відповідь TMDB (snake_case) один раз у fromApi, а далі решта коду
// працює зі своїми полями й обчислюваними властивостями. Форматування для терміналу тут немає:
// воно в MovieFormatter, щоб модель не знала, як її показують.
export class Movie {
  static OVERVIEW_MAX = 110;

  static fromApi(raw) {
    return new Movie({
      title: raw.title,
      releaseDate: raw.release_date,
      voteAverage: raw.vote_average,
      voteCount: raw.vote_count,
      overview: raw.overview,
    });
  }

  constructor({ title, releaseDate, voteAverage, voteCount, overview }) {
    this.title = title;
    this.releaseDate = releaseDate;
    this.voteAverage = voteAverage;
    this.voteCount = voteCount;
    this.overview = overview;
  }

  get year() {
    return this.releaseDate ? this.releaseDate.slice(0, 4) : 'n/a';
  }

  get hasRatings() {
    return Boolean(this.voteCount);
  }

  // Опис в один рядок, обрізаний до OVERVIEW_MAX символів
  get shortOverview() {
    const flat = (this.overview ?? '').replace(/\s+/g, ' ').trim();
    const max = Movie.OVERVIEW_MAX;
    return flat.length > max ? `${flat.slice(0, max - 3).trimEnd()}...` : flat;
  }
}
