const SEP = "[\\s._\\-~|/\\\\\\d]*";

function normalize(str) {
    return str?.normalize("NFKC") || "";
}

function safeRegExp(pattern, flags = "i") {
    try {
        pattern = normalize(pattern);
        return new RegExp(pattern, flags);
    } catch (err) {
        console.warn("Invalid regex skipped:", pattern, "→", err.message);
        return null;
    }
}

const CHAR = {
    a: "[a@4^∆ΛªÀÁÂÃÄÅàáâãäåɑæɐ]",
    b: "[bßƀƃ8]",
    c: "[c¢©<]",
    d: "[dđð]",
    e: "[e3€£êëèéēėęěÊËÈÉĒĖ]",
    f: "[fƒ]",
    g: "[g9ɢɣ]",
    h: "[h#ɦĦ]",
    i: "[i1!|íìîïİÌÍÎÏɪ]",
    j: "[jʝ]",
    k: "[kκ]",
    l: "[l1!|ɫ£]",
    m: "[mµ]",
    n: "[nñηńņňƞ]",
    o: "[o0°øöòóôõōŏőÒÓÔÕÖØɵ]",
    p: "[pþρ]",
    q: "[q9]",
    r: "[r®Яɹ]",
    s: "[s$5§šśŝşß]",
    t: "[t7+†]",
    u: "[uüùúûūŭůűųÙÚÛÜµ]",
    v: "[vν\\\\/]",
    w: "[wŵẅVVvv]",
    x: "[x×χ]",
    y: "[y¥ýÿŷŸÝɣ]",
    z: "[z2žźżƶ]"
};

const W = s =>
    normalize(s)
        .split("")
        .map(ch =>
            CHAR[ch.toLowerCase()]
                ? CHAR[ch.toLowerCase()]
                : ch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
        )
        .join(SEP);

const word = core =>
    `(?:^|[^a-z0-9])(?:${core})(?:[!@#$%^&*()_+\\-=\\[\\]{};':"\\\\|,.<>/?\\d]*)(?:[^a-z0-9]|$)`;

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
        words: ["kys", "tard", "kill yourself", "kms", "neck yourself", "go die"]
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
            "loli", "shota"
        ]
    },
    {
        label: "other",
        words: [
            "hail", "heil", "hitler",
            "1488", "14words", "14w", "88",
            "wpww", "rahowa", "bloodandsoil",
            "whitegenocide", "stormfront",
            "kkk", "skrewdriver", "zov", "boogaloo",
            "daesh", "isil"
        ]
    }
];

function buildExceptionSuffixes(config, whitelist) {
    const map = new Map();
    const allFlagged = new Set(
        config.flatMap(c => c.words.map(w => normalize(w.toLowerCase())))
    );

    for (const term of whitelist) {
        const lc = normalize(term.toLowerCase());
        for (const base of allFlagged) {
            const pos = lc.indexOf(base);
            if (pos < 0) continue;

            const suffix = lc.slice(pos + base.length);
            if (!suffix) continue;

            const pat = W(suffix);
            if (!map.has(base)) map.set(base, []);
            map.get(base).push(pat);
        }
    }
    return map;
}

const EXCEPTIONS_AFTER = buildExceptionSuffixes(BASE_CONFIG, WHITELIST);

function patternForWord(base) {
    const lc = normalize(base.toLowerCase());
    let pattern = W(lc);

    const suffixes = EXCEPTIONS_AFTER.get(lc);
    if (suffixes?.length) {
        const suffixAlternation = suffixes.join("|");
        pattern = `${pattern}(?!${SEP}(?:${suffixAlternation}))`;
    }

    return pattern;
}

const BASE_PATTERNS = BASE_CONFIG.map(({ label, words }) => {
    const core = words.map(w => patternForWord(w)).join("|");
    return { label, re: word(core) };
});

const COMPILED_PATTERNS = BASE_PATTERNS
    .map(p => ({ ...p, regex: safeRegExp(p.re, "i") }))
    .filter(p => p.regex);

module.exports = {
    BASE_CONFIG,
    BASE_PATTERNS,
    COMPILED_PATTERNS,
    W,
    word
};
