/**
 * Utilities for dealing with hashtag annotations in transaction descriptions.
 *
 * The parser is intentionally strict: it only considers hashtags that start
 * with `#`, followed by at least one letter/number, and stops at whitespace
 * or punctuation that is not a valid tag character. Supports common accents
 * via Unicode letter classes.
 */

const HASHTAG_REGEX = /#([\p{L}\p{N}_][\p{L}\p{N}_-]*)/u;

/**
 * Extract the first hashtag found in the provided text.
 *
 * @param {string} text Raw description typed by the user.
 * @returns {string|null} The hashtag including the `#` prefix, or null.
 */
export function extractFirstHashtag(text) {
  if (typeof text !== 'string' || !text.includes('#')) return null;
  const match = text.match(HASHTAG_REGEX);
  if (!match || !match[0]) return null;
  return match[0];
}
