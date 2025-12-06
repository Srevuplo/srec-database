const CHAR = {
  a: "[a@4^∆ΛªÀÁÂÃÄÅàáâãäåɑæ]",
  b: "[bß฿]",
  c: "[c¢<{©]",
  d: "[dÐđ]",
  e: "[e3€£êëèéēĕėęěĒĖÈÉÊË]",
  f: "[fƒ]",
  g: "[gɢɣĝğġģĞĠĢ]",
  h: "[h#ɦĦ]",
  i: "[i!|íìîïİÌÍÎÏ¹]",
  j: "[jʝ]",
  k: "[kκ]",
  l: "[l|!ɫ£]",
  m: "[mµ]",
  n: "[nñηńņň]",
  o: "[o0°øöòóôõōŏőÒÓÔÕÖØ]",
  p: "[pþρ]",
  q: "[q]",
  r: "[r®Я]",
  s: "[s$§šśŝşß]",
  t: "[t+†]",
  u: "[uüùúûūŭůűųÙÚÛÜµ]",
  v: "[v\\/ν]",
  w: "[wvŵẅ]",
  x: "[x×χ]",
  y: "[y¥ýÿŷŸÝ]",
  z: "[z2žźżƶ]"
};

// Separators
const SEP = "[._\\-~|/\\\\]*";

function W(s) {
  return s
    .toLowerCase()
    .split("")
    .map((ch) =>
      CHAR[ch] ? CHAR[ch] : ch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    )
    .join(SEP);
}

// Boundary handling
function word(core) {
  return `(?<![a-z0-9])${core}(?![a-z0-9])`;
}

const WHITELIST = [
  "sexual", "sexuality", "asexual", "asexuality", "pansexual", "bisexual",
  "homosexual", "sexism", "unisex", "intersection", "midsection",
  "sexton", "sextonary", "scumbag", "scum", "dickhead",
  "transgender", "trans", "transition", "intersex", "queer", "nonbinary",
  "aromantic", "demisexual", "sapiosexual",
  "dickinson", "cocktail", "breastplate", "scunthorpe",
  "cucumber", "assessor", "succumb",
  "essex", "essexshire", "https", "fa", "suspicious"
];

// Forbidden word sets
const BASE_CONFIG = [
  {
    label: "slur",
    words: [
      "nigg", "negg", "fag", "chink", "chigga",
      "spic", "spick", "beaner", "wetback", "gook", "zipperhead",
      "sandnigg", "raghead", "towelhead", "porchmonkey",
      "coon", "jigaboo", "pickaninny", "gyppo", "gypsy", "pajeet",
      "dyke", "tranny", "shemale", "thot",
      "retard", "spaz", "cripple", "mongoloid", "tard"
    ]
  },
  {
    label: "harassment",
    words: ["kys", "kill yourself"]
  },
  {
    label: "nsfw",
    words: [
      "fetish", "horny", "rape", "dildo", "sex", "slut", "whore", "skank",
      "jerking", "stroking", "pounding", "fingering", "fingered",
      "cum", "porn", "cock", "dick", "balls", "daddy", "mommy",
      "shlong", "condom", "booty", "gyatt", "tinder", "grindr",
      "boobs", "tits", "nipples", "clit", "pussy", "vag", "anus",
      "anal", "buttplug", "creampie",
      "gangbang", "hentai", "futanari", "bdsm", "milf", "gilf", "futa",
      "bondage", "squirting", "deepthroat",
      "blowjob", "handjob", "rimjob", "doggystyle", "missionary",
      "orgasm", "ejaculate", "masturbate", "fap", "fapping"
    ]
  },
  {
    label: "other",
    words: ["hail hitler"]
  }
];

// Whitelist matching
function buildExceptionSuffixesPerWord(config, whitelist) {
  const map = new Map();
  const flagged = new Set(config.flatMap((c) => c.words.map((w) => w.toLowerCase())));

  for (const term of whitelist) {
    const lc = term.toLowerCase();

    for (const base of flagged) {

      const boundary = new RegExp(`(?:^|[^a-z0-9])${base}(?![a-z0-9])`);
      if (!boundary.test(lc)) continue;

      const pos = lc.indexOf(base);
      const suffix = lc.slice(pos + base.length);
      if (!suffix) continue;

      const pat = W(suffix);

      if (!map.has(base)) map.set(base, []);
      map.get(base).push(pat);
    }
  }

  return map;
}

const EXCEPTIONS_AFTER = buildExceptionSuffixesPerWord(BASE_CONFIG, WHITELIST);

// Build fuzzy patterns per forbidden word
function patternForWord(base) {
  const lc = base.toLowerCase();
  const suffixes = EXCEPTIONS_AFTER.get(lc);
  const noSuffix = suffixes ? `(?!${SEP}(?:${suffixes.join("|")}))` : "";

  if (lc.length <= 3) {
    let tight = lc
      .split("")
      .map((ch) =>
        CHAR[ch] ? CHAR[ch] : ch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
      )
      .join("");

    const fuzzy = [
      tight,
      tight.replace(/^\[[^\]]+\]/, ""),
      tight.replace(/\[[^\]]+\]$/, "")
    ].filter(Boolean);

    return `(?:${fuzzy.join("|")})${noSuffix}`;
  }

  return `${W(lc)}${noSuffix}`;
}

const BASE_PATTERNS = BASE_CONFIG.map(({ label, words }) => {
  const core = words.map((w) => patternForWord(w)).join("|");
  return { label, re: word(core) };
});

// Context logic for “balls”
const SAFE_BALL_CONTEXT = new Set([
  "golf", "tennis", "soccer", "football", "basketball",
  "baseball", "softball", "volleyball", "pickleball",
  "paintball", "cannon", "canon", "meat", "dragon",
  "crystal", "eyeball", "eye"
]);

const SEXUAL_CONTEXT = new Set([
  "lick", "grab", "suck", "jerk", "stroke", "touch",
  "fondle", "horny", "dick", "cock", "cum", "ass"
]);

function tokenize(text) {
  return text.toLowerCase().split(/\s+/);
}

function getContext(text, index, window = 3) {
  const tokens = tokenize(text);
  let pos = 0;
  let offset = 0;

  for (let i = 0; i < tokens.length; i++) {
    const at = text.toLowerCase().indexOf(tokens[i], offset);
    if (at === index) {
      pos = i;
      break;
    }
    offset = at + tokens[i].length;
  }

  return tokens.slice(Math.max(0, pos - window), pos + window + 1);
}

const isSexual = (words) => words.some((w) => SEXUAL_CONTEXT.has(w));
const safeBall = (words) => words.some((w) => SAFE_BALL_CONTEXT.has(w));

function blockByContext(label, matched, text, index) {
  if (label === "slur") return true;

  if (/^balls?$/i.test(matched)) {
    const ctx = getContext(text, index, 3);
    if (isSexual(ctx)) return true;
    if (safeBall(ctx)) return false;
    return false;
  }

  return true;
}

// Compile patterns
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

// Exports
module.exports = {
  BASE_CONFIG,
  BASE_PATTERNS,
  COMPILED_PATTERNS,
  W,
  word
};
