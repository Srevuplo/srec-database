const SEP = "[\\s._*\\-~|()\\[\\]{}:;,+/\\\\]?";

const CHAR = {
  a: "[a@4^∆ΛªÀÁÂÃÄÅàáâãäåɑæ]",
  b: "[bß8฿]",
  c: "[c¢<{©]",
  d: "[dÐđ]",
  e: "[e3€£êëèéēĕėęěĒĖÈÉÊË]",
  f: "[fƒph]",
  g: "[g9ɢɣ]",
  h: "[h#ɦĦ]",
  i: "[i1!|íìîïİÌÍÎÏ]",
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
  z: "[z2žźżƶ]",
};

const W = s =>
  s
    .split("")
    .map(ch => (CHAR[ch] ? CHAR[ch] : ch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))
    .join(`${SEP}`);

const word = core => `(?:^|\\b|_)${core}(?:\\b|_|$)`;

const WHITELIST = [
  "sexual", "sexuality", "asexual", "asexuality", "pansexual", "bisexual", "homosexual",
  "sexism", "unisex", "intersection", "midsection", "sexton", "sextonary",
  "scumbag", "scum", "dickhead"
];

const BASE_CONFIG = [
  {
    label: "slur",
    words: ["nigg", "negg", "fag", "faggot", "chink", "chigga"]
  },
  {
    label: "harassment",
    words: ["kys", "retard", "bastard"]
  },
  {
    label: "nsfw",
    words: [
      "fetish", "horny", "rape", "dildo", "sex", "slut", "whore", "skank",
      "jerking", "stroking", "pounding",
      "fingering", "fingered", "cum", "porn",
      "cock", "dick", "balls", "daddy", "mommy", "shlong",
      "condom", "booty", "gyatt"
    ]
  },
  {
    label: "other",
    words: ["tinder", "grindr", "hail", "heil", "hitler"]
  }
];

function buildExceptionSuffixesPerWord(config, whitelist) {
  const map = new Map();

  const allFlagged = new Set(config.flatMap(c => c.words.map(w => w.toLowerCase())));

  for (const term of whitelist) {
    const lc = term.toLowerCase();
    for (const base of allFlagged) {
      if (lc.includes(base) && lc.length >= base.length) {
        const suffixPlain = lc.slice(base.indexOf(base) + base.length);
        if (suffixPlain.length === 0) continue;
        const suffixPattern = W(suffixPlain);
        if (!map.has(base)) map.set(base, []);
        map.get(base).push(suffixPattern);
      }
    }
  }

  return map;
}

const EXCEPTIONS_AFTER = buildExceptionSuffixesPerWord(BASE_CONFIG, WHITELIST);

function patternForWord(base) {
  const core = W(base.toLowerCase());
  const suffixes = EXCEPTIONS_AFTER.get(base.toLowerCase());
  if (suffixes && suffixes.length) {
    const negative = `(?!${SEP}(?:${suffixes.join("|")}))`;
    return `${core}${negative}`;
  }
  return core;
}

const BASE_PATTERNS = BASE_CONFIG.map(({ label, words }) => {
  const core = words.map(w => patternForWord(w)).join("|");
  return {
    label,
    re: word(core)
  };
});

const COMPILED_PATTERNS = BASE_PATTERNS.map(p => ({
  ...p,
  regex: new RegExp(p.re, "i")
}));

module.exports = { BASE_CONFIG, BASE_PATTERNS, COMPILED_PATTERNS, W, word };
