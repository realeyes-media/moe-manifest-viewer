/**
 * Sum items in an Array by certain counts
 *
 * **Note** currently droping the last element if not equal to bycount
 * ```
 * e.g const arr = [1,2,3,4,5,6,7,8,9,10];
 * arraySum(arr, 2) === [3, 7, 11, 15, 19];
 * arraySum(arr, 3) === [6, 15, 24];
 * arraySum(arr, 4) === [10, 26];
 * etc
 * ```
 *
 * @param arr Array of numbers to perform sum on
 * @param byCount By how many elements count
 */
export const arraySum = (arr: number[], byCount = 2) => {
  let cache: number[] = [];
  const sumArray: number[] = [];
  if (!arr || !Array.isArray(arr)) {
    return sumArray;
  }

  arr.forEach((elem) => {
    // use bycount to check and clear
    if (cache.length === byCount) {
      // sum all item in cache
      const totalCache = cache.reduce((acc, cur) => acc + cur, 0);
      sumArray.push(totalCache);
      cache = [elem];
    } else {
      cache.push(elem);
    }
  });

  if (cache.length === byCount) {
    // add whatever is left in cache
    sumArray.push(cache.reduce((acc, cur) => acc + cur, 0));
  }
  cache = [];
  return sumArray;
};
