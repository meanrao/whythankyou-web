const LENGTH_CAP = 55;

export function cleanProductTitle(raw: string): string {
  let s = raw.trim();
  if (!s) return raw;

  // 1. Leading "Featuring" prefix
  s = s.replace(/^Featuring\s+/i, '').trim();

  // 2. Leading site-name prefix (e.g. "Amazon.com: ...")
  const sitePrefix = s.replace(/^[^:–\-]{1,30}[:\-–]\s*/i, '').trim();
  if (sitePrefix.length > 0) s = sitePrefix;

  // 3. Author/publisher suffix (": First Last")
  s = s.replace(/:\s*[A-Z][a-z'-]+,\s+[A-Z][a-z'-]+.*$/, '').trim();

  // 4. Inline SEO filler phrases
  const filler: RegExp[] = [
    /,?\s*(?:Perfect|Great|Amazing|Best|Unique)\s+Gifts?\s+for\b[^|:–—]*/gi,
    /,?\s*Gifts?\s+for\s+(?:Kids?(?:\s+and\s+Adults?)?|Boys?|Girls?|(?:Him|Her|Them))\b[^|:–—]*/gi,
    /,?\s*for\s+Kids?\s+and\s+Adults?\b[^|:–—]*/gi,
    /,?\s*for\s+(?:Boys?|Girls?|Kids?|Him|Her|Them|Everyone)\b(?:\s+\d[^|:–—]*)?/gi,
    /,?\s*(?:for\s+)?Ages?\s+\d+\s*[-–—+]\s*\d*\+?/gi,
    /,?\s*for\s+\d+\s+to\s+\d+\s+[Yy]ear/gi,
    /,?\s*\d+\s*[-–]\s*\d+\s*[Yy]ears?\s+[Oo]ld/gi,
    /,?\s*(?:Great\s+)?Coloring\s+Pages?\s+for\b[^|:–—]*/gi,
    /\s*\(\d+\s*(?:Pieces?|Packs?|Sets?|Count|PCS|CT)\)/gi,
    /,?\s*ISBN(?:-1[03])?\s*:?\s*[\d-X]{9,17}/gi,
    /,?\s*(?:Creative\s+)?(?:Birthday|Christmas|Holiday|Easter|Valentine(?:'s)?)\s+Gift[s\s]?\S*/gi,
    /,?\s*Stocking\s+Stuffer[s]?\b[^|:–—]*/gi,
    /,?\s*(?:Creative\s+Sports?\s+)?Coloring\s+Page[s]?\b[^|:–—]*/gi,
  ];
  for (const re of filler) s = s.replace(re, '').trim();

  // 5. Remove leading "Creative" only when left dangling at start
  s = s.replace(/^Creative\s+/i, '').trim();

  // 6. Pipe split
  if (s.includes('|')) {
    const parts = s.split('|').map(p => p.trim()).filter(p => p.length >= 4);
    if (parts.length > 0) s = parts[0];
  }

  // 7. Spaced em/en dash split
  const dashParts = s.split(/\s[–—]\s/);
  if (dashParts.length > 1 && dashParts[0].trim().length >= 8) s = dashParts[0].trim();

  // 8. Trailing retail-category suffix
  s = s.replace(
    /:\s*(?:Books?|Electronics?|Toys?\s*(?:&|and)\s*Games?|Sports?\s*(?:&|and)\s*Outdoors?|Clothing|Amazon\.com|Amazon)\s*$/i,
    '',
  ).trim();

  // 9. Marketing adjective / noise-word removal
  s = s.replace(/\bThe\s+Original\b\s*/gi, '').trim();
  s = s.replace(/\bMusical\s+Instrument\b\s*/gi, '').trim();
  s = s.replace(/\bElectronic\b\s+(?=(?:Keyboard|Synthesizer|Synth|Drum\s+Machine|Beat\s+Machine|Theremin|Organ|Piano)\b)/gi, '').trim();
  s = s.replace(/\bOfficial\b\s*/gi, '').trim();
  s = s.replace(/(?<=\S\s)\b(?:Premium|Ultimate|Deluxe|Professional|Amazing|Perfect|Best|Great)\b\s*/gi, '').trim();

  // 10. Comma truncation for long titles — keep everything before the first comma
  //     that appears after a meaningful core (>= 10 chars before it)
  if (s.length > LENGTH_CAP) {
    const commaIdx = s.indexOf(',');
    if (commaIdx >= 10) {
      s = s.slice(0, commaIdx).trim();
    }
  }

  // 11. Hard length cap — break at last space before cap
  if (s.length > LENGTH_CAP) {
    const cut = s.lastIndexOf(' ', LENGTH_CAP);
    s = (cut > 20 ? s.slice(0, cut) : s.slice(0, LENGTH_CAP)).trim();
  }

  // 12. Final tidy
  s = s.replace(/[,.:;|–—]+$/, '').replace(/\s{2,}/g, ' ').trim();

  return s.length >= 3 ? s : raw.trim();
}
