export function cache<Arguments extends unknown[], Result>(
  implementation: (...arguments_: Arguments) => Result
) {
  return implementation;
}
