const SEP = "[\\s._*\\-~|()\\[\\]{}:;,+/\\\\]*";
const CHAR = {
  a: "[a@4]", e: "[e3€]", i: "[i1!|]", o: "[o0]",
  u: "[uüùúû]", s: "[s$5]", t: "[t7+]", g: "[g9]",
  r: "[r]", n: "[nñ]", h: "[h]", l: "[l1|]", d: "[d]",
  m: "[m]", f: "[f]", c: "[c(¢]", k: "[k]", w: "[wvv]", y: "[y]"
};

const W = s =>
  s.split("")
   .map(ch => (CHAR[ch] ? CHAR[ch] : ch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))
   .join(`${SEP}`);

const word = core => `(?:^|\\b|_)${core}(?:\\b|_|$)`;

const BASE_PATTERNS = [
   { label: "hate.nazi", 
    re: word(`heil|hitler`) 
  },
  { 
    label: "hate.slur.black", 
    re: word(`${W("n")}${SEP}(?:${W("i")}${SEP})?${W("g")}${W("g")}${W("e")}${W("r")}|${W("n")}${W("i")}?${W("g")}${W("g")}${W("a")}`) 
  },
  { 
    label: "hate.slur.gay", 
    re: word(`${W("f")}${W("a")}${W("g")}(?:${W("g")})?`) 
  },
  { 
    label: "hate.slur.asian", 
    re: word(`${W("c")}${W("h")}${W("i")}${W("n")}${W("k")}`) 
  },
  { 
    label: "abuse.harassment", 
    re: word(`${W("k")}${W("y")}${W("s")}`) 
  },
  { 
    label: "nsfw.sexual", 
    re: word(`${W("r")}${W("a")}${W("p")}${W("e")}|dildo|sex|slut|fuck|whore|${W("p")}${W("o")}${W("r")}${W("n")}|${W("c")}${W("u")}${W("m")}|${W("c")}${W("o")}${W("c")}${W("k")}|${W("d")}${W("i")}${W("c")}${W("k")}|${W("b")}${W("a")}${W("l")}${W("l")}${W("s")}`) 
  }
];

export { BASE_PATTERNS, W, word };
