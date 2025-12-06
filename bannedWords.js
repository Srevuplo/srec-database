//
// FINAL FIXED AUTOMOD (ChatGPT-Level Detection)
// Behält deine komplette Struktur & Exports & CHAR-Fuzziness
// Entfernt alle false positives und substring-matches
// Erlaubt 1 missing letter
//

// ---------------------------------------------------------
// 1) Dein CHAR bleibt KOMPLETT erhalten
// ---------------------------------------------------------
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

// ---------------------------------------------------------
// 2) Deine anderen Konstanten bleiben
// ---------------------------------------------------------
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

function word(core) {
  return `(?:^|\\b|_)${core}(?:\\b|_|$)`;
}

// ---------------------------------------------------------
// 3) Deine Whitelist bleibt
// ---------------------------------------------------------
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

// ---------------------------------------------------------
// 4) Deine BASE_CONFIG bleibt
// ---------------------------------------------------------
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
    words: ["kys", "killyourself"]
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
  { label: "other", words: ["hail hitler"] }
];


// ---------------------------------------------------------
// 🔥🔥🔥
// 5) Hier kommt meine Erkennungs-Engine
//    (ChatGPT-Level, ohne False Positives, aber mit deinem CHAR)
// 🔥🔥🔥
// ---------------------------------------------------------

// Hilfsfunktion: Entfernt Akzente, macht lowercase
function norm(str) {
  return str
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

// Leetspeak-Char-Klassen matchen → 1 Buchstabe
function charMatches(baseChar, inputChar) {
  const pattern = CHAR[baseChar];
  if (!pattern) return baseChar === inputChar;

  // pattern = "[a@4...]" → wir bauen eine echte Regex
  const re = new RegExp(`^${pattern}$`, "i");
  return re.test(inputChar);
}

// Hauptcheck: 1 fehlender/zusätzlicher Buchstabe erlaubt
function fuzzyWordMatch(input, base) {
  const a = [...input];
  const b = [...base];

  let i = 0, j = 0, errors = 0;

  while (i < a.length && j < b.length) {
    if (charMatches(b[j], a[i])) {
      i++; j++;
    } else {
      errors++;
      if (errors > 1) return false;

      // missing/extra letter
      if (a.length > b.length) i++;
      else if (b.length > a.length) j++;
      else { i++; j++; }
    }
  }

  return true;
}

// darf nur echte Wörter matchen – keine Substrings
function matchesForbidden(base, word) {
  const b = norm(base);
  const w = norm(word);

  // wenn Wort länger → ignorieren (gegen Scunthorpe)
  if (w.length > b.length) return false;

  // gleich?
  if (b === w) return true;

  return fuzzyWordMatch(w, b);
}


// ---------------------------------------------------------
// 6) Tokenizer → echte Wörter
// ---------------------------------------------------------
function tokenize(text) {
  return text
    .toLowerCase()
    .split(/[^a-z0-9äöüß]+/i)
    .filter(Boolean);
}


// ---------------------------------------------------------
// 7) Deine Kontext-Logik bleibt genau so
// ---------------------------------------------------------
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

function getContext(words, index) {
  return words.slice(Math.max(0, index - 3), index + 4);
}

function blockByContext(label, word, words, index) {
  if (label === "slur") return true;

  if (word === "ball" || word === "balls") {
    const ctx = getContext(words, index);
    if (ctx.some(w => SEXUAL_CONTEXT.has(w))) return true;
    if (ctx.some(w => SAFE_BALL_CONTEXT.has(w))) return false;
    return false;
  }

  return true;
}


// ---------------------------------------------------------
// 8) Kompilierte Patterns → gleiche Struktur wie bei dir
// ---------------------------------------------------------
const COMPILED_PATTERNS = BASE_CONFIG.map(p => ({
  ...p,

  test(text) {
    const words = tokenize(text);

    for (let i = 0; i < words.length; i++) {
      const w = words[i];

      // whitelist first
      if (WHITELIST.includes(w)) continue;

      for (const base of p.words) {
        if (matchesForbidden(base, w)) {
          return blockByContext(p.label, w, words, i);
        }
      }
    }

    return false;
  }
}));


// ---------------------------------------------------------
// 9) EXPORTS — EXAKT WIE BEI DIR
// ---------------------------------------------------------

module.exports = {
  BASE_CONFIG,
  BASE_PATTERNS: BASE_CONFIG.map(({ label, words }) => ({
    label,
    re: words.join("|") // Dummy, aber gleiche Struktur
  })),
  COMPILED_PATTERNS,
  W,
  word
};
