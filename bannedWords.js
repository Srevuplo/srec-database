const SEP = "[\\s._*\\-~|()\\[\\]{}:;,+/\\\\]*";

const CHAR = {
  a: "[a@4^∆ΛªÀÁÂÃÄÅàáâãäåɑæ]",
  b: "[bß8฿]",
  c: "[c(¢<{©]",
  d: "[dÐđ]",
  e: "[e3€£êëèéēĕėęěĒĖÈÉÊË€]",
  f: "[fƒph]",
  g: "[g9qɢɣ]",
  h: "[h#ɦĦ]",
  i: "[i1!|íìîïİÌÍÎÏ]",
  j: "[jʝ]",
  k: "[kqκ]",
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
  s.split("")
   .map(ch => (CHAR[ch] ? CHAR[ch] : ch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))
   .join(`${SEP}`);

const word = core => `(?:^|\\b|_)${core}(?:\\b|_|$)`;

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
      "gassy", "fetish", "horny", "rape", "dildo", "sex", "gex", "slut", "whore", "skank",
      "goon", "jerking", "stroking", "pounding", "cranking",
      "fingering", "fingered", "cum", "porn",
      "cock", "dick", "balls", "goodboy", "goodgirl", "bust", "daddy", "mommy", "shlong", "meat", "condom", "booty", "gyatt"
    ]
  },
    {
    label: "other",
    words: [
     "tinder", "grindr", "hail", "heil", "hitler"
    ]
  }
];

const BASE_PATTERNS = BASE_CONFIG.map(({ label, words }) => ({
  label,
  re: word(words.map(w => W(w)).join("|"))
}));

const COMPILED_PATTERNS = BASE_PATTERNS.map(p => ({
  ...p,
  regex: new RegExp(p.re, "i")
}));

module.exports = { BASE_CONFIG, BASE_PATTERNS, COMPILED_PATTERNS, W, word };
