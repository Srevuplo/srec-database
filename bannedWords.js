const CHAR = {
  a: "[a@4ªàáâãäå]",
  b: "[bß]",
  c: "[c¢<{©]",
  d: "[dÐ]",
  e: "[e3€êëèéēėęě]",
  f: "[fƒ]",
  g: "[gĝğġģ]",
  h: "[h#]",
  i: "[i1íìîï]",
  j: "[j]",
  k: "[kκ]",
  l: "[l|!£]",
  m: "[mµ]",
  n: "[nñńņň]",
  o: "[o0°øöòóôõōő]",
  p: "[pþ]",
  q: "[q]",
  r: "[r]",
  s: "[s$§šśş]",
  t: "[t+†]",
  u: "[uüùúûūů]",
  v: "[v]",
  w: "[wŵ]",
  x: "[x×]",
  y: "[yýÿŷ]",
  z: "[z2žźż]"
};


const SEP = "[._\\-~|/\\\\]?";

function W(s) {
  return s
    .toLowerCase()
    .split("")
    .map((ch) =>
      CHAR[ch] ? CHAR[ch] : ch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    )
    .join(SEP);
}

// SEPERATOR
function word(core) {
  return `(?:^|\\b)${core}(?:\\b|$)`;
}

// WHITELIST
const WHITELIST = [
  "sexual", "sexuality", "asexual", "asexuality", "pansexual", "bisexual",
  "homosexual", "sexism", "unisex", "intersection", "midsection",
  "sexton", "sextonary", "scumbag", "scum", "dickhead",
  "transgender", "trans", "transition", "intersex", "queer", "nonbinary",
  "aromantic", "demisexual", "sapiosexual",
  "dickinson", "cocktail", "breastplate", "scunthorpe",
  "cucumber", "assessor", "succumb",
  "essex", "essexshire", "https", "fa", "suspicious", "grapes", "savage"
];

// BASE CONFIG
const BASE_CONFIG = [
  {
    label: "slurs",
    words: [
      "nigg", "fag", "chink", "spic", "beaner", "wetback",
      "gook", "raghead", "towelhead", "coon", "dyke",
      "tranny", "shemale", "retard", "tard"
    ]
  },
  {
    label: "harassment",
    words: ["kys", "kill yourself"]
  },
  {
    label: "nsfw",
    words: [
      "fetish", "horny", "rape", "dildo", "sex", "slut",
      "whore", "skank", "jerking", "stroking", "cum",
      "porn", "cock", "balls", "pussy", "vag",
      "anus", "anal", "creampie", "gangbang", "hentai",
      "bdsm", "milf", "futa", "deepthroat", "blowjob", "goon"
    ]
  },
  {
    label: "other",
    words: ["pedo"]
  }
];

// EXCEPTION SUFFIX BUILDER
function buildExceptionSuffixesPerWord(config, whitelist) {
  const map = new Map();
  const flagged = new Set(config.flatMap((c) => c.words.map((w) => w.toLowerCase())));

  for (const term of whitelist) {
    const lc = term.toLowerCase();
    for (const base of flagged) {
      if (!lc.includes(base)) continue;

      const pos = lc.indexOf(base);
      const suffix = lc.slice(pos + base.length);
      if (!suffix) continue;

      const pat = suffix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

      if (!map.has(base)) map.set(base, []);
      map.get(base).push(pat);
    }
  }

  return map;
}

const EXCEPTIONS_AFTER = buildExceptionSuffixesPerWord(BASE_CONFIG, WHITELIST);


// Pattern builder — **LOW SENSITIVITY VERSION**
function patternForWord(base) {
  const lc = base.toLowerCase();
  const suffixes = EXCEPTIONS_AFTER.get(lc);
  const noSuffix = suffixes ? `(?!${SEP}(?:${suffixes.join("|")}))` : "";

  return `${W(lc)}${noSuffix}`;
}

const BASE_PATTERNS = BASE_CONFIG.map(({ label, words }) => {
  const core = words.map((w) => patternForWord(w)).join("|");
  return { label, re: word(core) };
});

// Context
const SAFE_BALL_CONTEXT = new Set([
  "golf", "tennis", "soccer", "football", "basketball",
  "baseball", "softball", "volleyball", "pickleball",
  "paintball", "cannon", "canon", "meat", "dragon",
  "crystal", "eyeball"
]);

const SEXUAL_CONTEXT = new Set([
  "lick", "grab", "suck", "jerk", "stroke", "touch",
  "fondle", "horny", "dick", "cock", "cum", "ass", "deep"
]);

function tokenize(text) {
  return text.toLowerCase().split(/\s+/);
}

function getContext(text, index) {
  const tokens = tokenize(text);
  const wordAt = tokens.findIndex((t) => text.toLowerCase().indexOf(t) === index);
  if (wordAt === -1) return tokens;

  return tokens.slice(Math.max(0, wordAt - 3), wordAt + 4);
}

function blockByContext(label, matched, text, index) {
  if (label === "slur") return true;

  if (/^balls?$/i.test(matched)) {
    const ctx = getContext(text, index);
    if (ctx.some((w) => SEXUAL_CONTEXT.has(w))) return true;
    if (ctx.some((w) => SAFE_BALL_CONTEXT.has(w))) return false;
    return false;
  }

  return true;
}

// FINAL COMPILED PATTERNS
const COMPILED_PATTERNS = BASE_PATTERNS.map((p) => ({
  ...p,
  regex: new RegExp(p.re, "i"),

  test(text) {
    const m = text.match(this.regex);
    if (!m) return false;

    const matched = m[0];
    const index = text.toLowerCase().indexOf(matched.toLowerCase());
    return blockByContext(this.label, matched, text, index);
  }
}));

// EXPORTS
module.exports = {
  BASE_CONFIG,
  BASE_PATTERNS,
  COMPILED_PATTERNS,
  W,
  word
};
