// Показ: перетворює MoviePage на текст для терміналу. Окремий клас, бо «як показати» — це
// незалежне рішення: CliApp отримує форматер ззовні, і його можна замінити (наприклад, на JSON).
export class MovieFormatter {
  static ATTRIBUTION = 'This product uses the TMDB API but is not endorsed or certified by TMDB.';

  formatRating(movie) {
    if (!movie.hasRatings) return 'no ratings yet';
    const votes = movie.voteCount === 1 ? '1 vote' : `${movie.voteCount} votes`;
    return `${movie.voteAverage.toFixed(1)}/10 (${votes})`;
  }

  formatMovie(movie, number) {
    const head = `${number}. ${movie.title} (${movie.year}) - ${this.formatRating(movie)}`;
    const overview = movie.shortOverview;
    return overview ? `${head}\n   ${overview}` : head;
  }

  format(moviePage, listType) {
    const header = `${listType.title} movies - page ${moviePage.page} of ${moviePage.totalPages}`;
    if (moviePage.isEmpty) return `${header}\n\nNo movies found.`;
    const entries = [...moviePage.numbered()].map(({ number, movie }) => this.formatMovie(movie, number));
    return `${header}\n\n${entries.join('\n\n')}`;
  }
}
