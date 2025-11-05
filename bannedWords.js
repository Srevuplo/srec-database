const SEP = "(?:[._\\-~|/\\\\]{0,1}|\\s{0,1})";

const EXPLICIT_CONTEXT_WORDS = /(porn|nsfw|explicit|nude|naked|fuck|hot|hard|wet|moan|jerk|hump|daddy|mommy)/i;

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
  z: "[z2žźżƶ]"
};

const W = s =>
  s
    .split("")
    .map(ch => (CHAR[ch] ? CHAR[ch] : ch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))
    .join(SEP);

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
        const suffixPlain = lc.slice(lc.indexOf(base) + base.length);
        if (!suffixPlain.length) continue;
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
  const lc = base.toLowerCase();
  const suffixes = EXCEPTIONS_AFTER.get(lc);
  const core = W(lc);
  const negative = suffixes && suffixes.length ? `(?!${SEP}(?:${suffixes.join("|")}))` : "";

  const boundary = lc.length <= 3 ? `\\b` : "";
  const sensitivity = lc.length <= 3 ? "{0,1}" : "{0,2}";
  const adjustedCore = core.replace(SEP, SEP.replace("{0,1}", sensitivity));

  return `${boundary}${adjustedCore}${negative}${boundary}`;
}

function contextAwareFilter(patterns) {
  return patterns.map(p => {
    const short = p.length <= 4;
    const baseRe = new RegExp(p, "i");
    return text => {
      const lower = text.toLowerCase();
      if (!baseRe.test(lower)) return false;
      if (!short) return true;
      const idx = lower.search(baseRe);
      if (idx === -1) return false;
      const before = lower.slice(Math.max(0, idx - 5), idx);
      const after = lower.slice(idx + p.length, idx + p.length + 5);
      const surrounding = (before + after).replace(/[^a-z]/g, "");
      return EXPLICIT_CONTEXT_WORDS.test(surrounding);
    };
  });
}

const BASE_PATTERNS = BASE_CONFIG.map(({ label, words }) => {
  const cores = words.map(w => patternForWord(w));
  const re = word(cores.join("|"));
  return { label, re };
});

const COMPILED_PATTERNS = BASE_PATTERNS.map(p => ({
  ...p,
  regex: new RegExp(p.re, "i")
}));

module.exports = { BASE_CONFIG, BASE_PATTERNS, COMPILED_PATTERNS, W, word };
