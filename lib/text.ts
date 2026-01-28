const ACRONYM_MAP = new Map<string, string>([
  ["UMS", "UMS"],
  ["BTA", "BTA"],
  ["DS", "DS"],
  ["DG", "DG"],
  ["DU", "DU"],
  ["VK", "VK"],
  ["PHD", "PhD"],
  ["MSC", "MSc"],
  ["MBA", "MBA"],
]);

const normalizeCoreWord = (value: string) => {
  const upper = value.toUpperCase();
  if (ACRONYM_MAP.has(upper)) {
    return ACRONYM_MAP.get(upper) ?? value;
  }
  if (/[0-9]/.test(value) && value === upper) {
    return value;
  }
  if (value.length <= 3 && value === upper) {
    return value;
  }
  const lower = value.toLowerCase();
  return `${lower.charAt(0).toUpperCase()}${lower.slice(1)}`;
};

const normalizeSegment = (segment: string) => {
  const match = segment.match(/^([^A-Za-z0-9]*)([A-Za-z0-9]+)([^A-Za-z0-9]*)$/);
  if (!match) {
    return segment;
  }
  const [, leading, core, trailing] = match;
  return `${leading}${normalizeCoreWord(core)}${trailing}`;
};

const normalizeToken = (token: string) =>
  token
    .split(/([—–/\\-])/)
    .map((part) => (/[—–/\\-]/.test(part) ? part : normalizeSegment(part)))
    .join("");

export const normalizeTitleCase = (value: string) =>
  value
    .split(/(\s+)/)
    .map((token) => (token.trim() ? normalizeToken(token) : token))
    .join("");
