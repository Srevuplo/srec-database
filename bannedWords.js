const CHAR = {
  a: "[a@4^∆ΛªÀÁÂÃÄÅàáâãäåɑæ]",
  b: "[bß8฿]",
  c: "[c¢<{©]",
  d: "[dÐđ]",
  e: "[e3€£êëèéēĕėęěĒĖÈÉÊË]",
  f: "[fƒph]",
  g: "[g9ɢɣĝğġģĞĠĢ]",
  h: "[h#ɦĦ]",
  i: "[i1!|íìîïİÌÍÎÏ¹]",
  j: "[jʝ]",
  k: "[kκ]",
  l: "[l1|!ɫ£]",
  m: "[mµ]",
  n: "[nñηńņň]",
  o: "[o0°øöòóôõōŏőÒÓÔÕÖØ]",
  p: "[pþρ]",
  q: "[q9]",
  r: "[r®Я]",
  s: "[s$5§šśŝşß]",
  t: "[t7+†]",
  u: "[uüùúûūŭůűųÙÚÛÜµ]",
  v: "[v\\/ν]",
  w: "[wvvŵẅ]",
  x: "[x×χ]",
  y: "[y¥ýÿŷŸÝ]",
  z: "[z2žźżƶ]"
};

const SEP = "[\\s._\\-~|/\\\\]*";

function W(s) {
  return s
    .toLowerCase()
    .split("")
    .map((ch) =>
      CHAR[ch] ? CHAR[ch] : ch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    )
    .join(SEP);
}

function word(core) {
  return `(?:^|\\b|_)${core}(?:\\b|_|$)`;
}

const WHITELIST = [
  "sexual", "sexuality", "asexual", "asexuality", "pansexual", "bisexual",
  "homosexual", "sexism", "unisex", "intersection", "midsection",
  "sexton", "sextonary", "scumbag", "scum", "dickhead",
  "transgender", "trans", "transition", "intersex", "queer", "nonbinary",
  "aromantic", "demisexual", "sapiosexual",
  "dickinson", "cocktail", "breastplate", "scunthorpe",
  "cucumber", "assessor", "succumb",
  "essex", "essexshire"
];

const BASE_CONFIG = [
  {
    label: "slur",
    words: [
      "nigg", "negg", "fag", "chink", "chigga",
      "spic", "spick", "beaner", "wetback", "gook", "zipperhead",
      "sandnigg", "raghead", "towelhead", "porchmonkey",
      "coon", "jigaboo", "pickaninny", "gyppo", "gypsy", "pajeet",
      "dyke", "tranny", "shemale",
      "kike", "heeb", "yid",
      "hoe", "thot",
      "retard", "spaz", "cripple", "mongoloid"
    ]
  },
  {
    label: "harassment",
    words: [
      "kys", "tard",
      "kill yourself", "kms", "neck yourself", "go die"
    ]
  },
  {
    label: "nsfw",
    words: [
      "fetish", "horny", "rape", "dildo", "sex", "slut", "whore", "skank",
      "jerking", "stroking", "pounding", "fingering", "fingered",
      "cum", "porn", "cock", "dick", "balls", "daddy", "mommy",
      "shlong", "condom", "booty", "gyatt", "tinder", "grindr",
      "boobs", "tits", "nipples", "clit", "pussy", "vag", "anus",
      "anal", "buttplug", "creampie", "facial",
      "gangbang", "hentai", "futanari", "bdsm", "milf", "gilf",
      "bondage", "squirting", "deepthroat",
      "blowjob", "handjob", "rimjob", "doggystyle", "missionary",
      "orgasm", "ejaculate", "masturbate", "fap", "fapping",
      "loli", "shota", "kiddo"
    ]
  },
  {
    label: "other",
    words: [
      "hail", "heil", "hitler",
      "1488", "14words", "14w", "88",
      "wpww", "rahowa", "bloodandsoil",
      "whitegenocide", "stormfront",
      "kkk", "klan", "skrewdriver", "zov", "boogaloo",
      "daesh", "isil"
    ]
  }
];

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

      const pat = W(suffix);

      if (!map.has(base)) map.set(base, []);
      map.get(base).push(pat);
    }
  }

  return map;
}

const EXCEPTIONS_AFTER = buildExceptionSuffixesPerWord(BASE_CONFIG, WHITELIST);

function patternForWord(base) {
  const lc = base.toLowerCase();
  const suffixes = EXCEPTIONS_AFTER.get(lc);
  const noSuffix = suffixes ? `(?!${SEP}(?:${suffixes.join("|")}))` : "";

  if (lc.length <= 3) {
    const tight = lc
      .split("")
      .map((ch) =>
        CHAR[ch] ? CHAR[ch] : ch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
      )
      .join("");
    return `\\b${tight}${noSuffix}\\b`;
  }

  return `${W(lc)}${noSuffix}`;
}

const BASE_PATTERNS = BASE_CONFIG.map(({ label, words }) => {
  const core = words.map((w) => patternForWord(w)).join("|");
  return { label, re: word(core) };
});

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

module.exports = {
  BASE_CONFIG,
  BASE_PATTERNS,
  COMPILED_PATTERNS,
  W,
  word
};
