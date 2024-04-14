// src/utils/typography.js

export const fixSmartQuotes = text => text.replace(/(\W|^)"(\S)/g, '$1“$2').replace(/(\S)"(\W|$)/g, '$1”$2').replace(/(\W|^)'(\S)/g, '$1‘$2').replace(/(\S)'(\W|$)/g, '$1’$2');

export const fixMDash = text => text.replace(/--/g, '—');

export const fixBahaITerms = text => {
   return text
       .replace(/\bbah[aá]['’]?[íi]s?\b/ig, match => match.toLowerCase().endsWith('s') ? "Bahá’ís" : "Bahá’í")
       .replace(/\bbah[aá]['’]?u['’]?ll[aá]h['’]s?\b/ig, match => match.toLowerCase().endsWith('s') ? "Bahá’u’lláh’s" : "Bahá’u’lláh")
       .replace(/\b(?:the\s)?b[aá]b['’]s?\b/ig, match => match.toLowerCase().includes('s') ? "the Báb’s" : "the Báb")
       .replace(/\b(?:'|‘)abdu['’]?l[- ]?bah[aá]['’]?s?\b/ig, match => {
           const strippedMatch = match.replace(/^(?:'|‘)/, '');
           const possessive = strippedMatch.toLowerCase().endsWith('s') || strippedMatch.toLowerCase().endsWith('s’') || strippedMatch.toLowerCase().endsWith('s\'');
           return possessive ? "‘Abdu’l-Bahá’s" : "‘Abdu’l-Bahá";
       })
       .replace(/\bbah[aá]['’]í's\b/ig, "Bahá’í’s")
       .replace(/'/g, "’");
};

export const fixCommonBahaiWords = text => {
   return text
       .replace(/\b[R]i[ḍd]v[aá]n\b/g, "Riḍván") // رضوان
       .replace(/\b[A]kk[aá]\b/g, "Akká") // عكاء
       .replace(/\b[R]uh[ií]yyih\b/g, "Ruḥiyyih") // روحیه
       .replace(/\b[B]ah[ií]yyih\b/g, "Bahíyyih") // بهیه
       .replace(/\bK[hḥ]ánum\b/g, "Ḵhánum") // خانم
       .replace(/\b[A]bh[aá]\b/g, "Abhá") // ابهی
       .replace(/\bMashriqu['’]?l-Adhkar\b/g, "Mas̱hriqu’l-Aḏhkár") // مشرق الاذكار
       .replace(/\b[I]rf[aá]n\b/g, "Irfán") // عرفان
       .replace(/\b[A][zẓ]amat\b/g, "Aẓamat") // عظمت
       .replace(/\b[A]sm[aá]’\b/g, "Asmá’") // اسماء
       .replace(/\b[A]yy[aá]m[- ]?i[- ]?[Hh][aá]\b/g, "Ayyám-i-Há") // ایامی حا
       .replace(/\b[N]aw[- ]?[Rr][uú]z\b/g, "Naw-Rúz") // نوروز
       .replace(/\b[Q]iblih\b/g, "Qiblih") // قبله
       .replace(/\b[J]al[aá]l\b/g, "Jalál") // جلال
       .replace(/\b[J]am[aá]l\b/g, "Jamál") // جمال
       .replace(/Kit[aá]b[- ]?i[- ]?[Íí]q[aá]n\b/g, "Kitáb-i-Íqán") // كتاب اقان
       .replace(/\b[HḤ]uq[uú]qu['’]?ll[aá]h\b/g, "Ḥuqúq’u’lláh"); // حقوق الله
};


export const fixPlaceNames = text => {
   return text
       .replace(/\bT(e|i)hr(a|á)n\b/g, "Tihrán") // تهران
       .replace(/\bM(a|á)shh(a|á)d\b/g, "Mas̱ẖhad") // مشهد
       .replace(/\bIsf(a|á)h(a|á)n\b/g, "Iṣfahán") // اصفهان
       .replace(/\bSh(i|í)r(a|á)z\b/g, "S̱híráz") // شیراز
       .replace(/\bT(a|á)br(i|í)z\b/g, "Tabríz") // تبریز
       .replace(/\bK(i|í)rm(a|á)n\b/g, "Kirmán") // کرمان
       .replace(/\bR(a|á)sht\b/g, "Ras̱ẖt") // رشت
       .replace(/\bHam(a|á)d(a|á)n\b/g, "Hamadán") // همدان
       .replace(/\bAdhirbayj(a|á)n\b/g, "Aḏẖirbayján") // آذربایجان
       .replace(/\bKh(u|ú)r(a|á)s(a|á)n\b/g, "Ḵẖurasán") // خراسان
       .replace(/\bF(a|á)rs\b/g, "Fárs") // فارس
       .replace(/\bK(a|á)rbil(a|á)\b/g, "Karbilá") // کربلاء
       .replace(/\bBaghd(a|á)d\b/g, "Bag̱ẖdád") // بغداد
       .replace(/\bK(i|í)rm(a|á)nsh(a|á)h\b/g, "Kirmáns̱ẖáh") // کرمانشاه
       .replace(/\bB(a|á)d(a|á)sht\b/g, "Badas̱ẖt") // بدشت
       .replace(/\bMah-K(u|ú)\b/g, "Mah-Kú") // مه کو
       .replace(/\bHus(a|á)yn\b/g, "Ḥusayn") // حسین
       .replace(/\bMuhammad\b/g, "Muḥammad"); // محمد
};

export const fixTransliteration = text => {
  return text
    .replace(/([HhDdZzSsTtZz])\.([A-Za-z])/g, "$1̣$2")
    .replace(/([KkSsDdGgTtZz])_([Hh])/g, "$1̱$2")
    .replace(/([AaIiUu])\^/g, m => ({ 'A^': 'Á', 'a^': 'á', 'I^': 'Í', 'i^': 'í', 'U^': 'Ú', 'u^': 'ú' })[m]);
};

//export const fixTypography = [fixSmartQuotes, fixMDash, fixBahaITerms, fixCommonBahaiWords, fixPlaceNames, fixTransliteration];



export const allFixes = [fixSmartQuotes, fixBahaITerms, fixCommonBahaiWords, fixPlaceNames, fixTransliteration];

const applyTypographicFixes = (text, fixes=allFixes) => {
    return fixes.reduce((acc, fix) => fix(acc), text);
}

