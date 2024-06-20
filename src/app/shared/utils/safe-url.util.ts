/**
 * Test if URL is valid.
 * @param url URL to test.
 */
const isValidUrl = (url: string) =>
  /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/.test(url);

/**
 * URL Extension with handling of invalid URLs (it adds `valid` boolean property).
 */
export const safeURL = (url: string, base?: string | URL) => {
  const valid = isValidUrl(url);
  return Object.assign(new URL(valid ? url : 'https://invalid.com', base), {
    valid,
  });
};
