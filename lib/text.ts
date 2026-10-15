export type TextPart = { text: string; match: boolean };

/** Minuscules sans accents, caractère par caractère (garde les positions du texte d'origine). */
function fold(char: string): string {
  return char.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

/**
 * Découpe `text` pour mettre en gras ce qui correspond à la saisie : chaque mot saisi
 * est cherché au début d'un mot du texte, sans tenir compte des accents ni de la casse.
 */
export function highlight(text: string, query: string): TextPart[] {
  const chars = [...text];
  const folded = chars.map(fold);
  const marked = new Array<boolean>(chars.length).fill(false);
  const words = query.split(/[\s,]+/).map((w) => [...w].map(fold).join("")).filter(Boolean);

  for (const word of words) {
    for (let i = 0; i < chars.length; i++) {
      const wordStart = i === 0 || /[\s,'’-]/.test(chars[i - 1]);
      if (!wordStart) continue;
      let j = i;
      let k = 0;
      while (j < chars.length && k < word.length && word.startsWith(folded[j], k) && folded[j]) {
        k += folded[j].length;
        j++;
      }
      if (k === word.length) {
        for (let m = i; m < j; m++) marked[m] = true;
        break;
      }
    }
  }

  const parts: TextPart[] = [];
  chars.forEach((char, i) => {
    const last = parts.at(-1);
    if (last && last.match === marked[i]) last.text += char;
    else parts.push({ text: char, match: marked[i] });
  });
  return parts;
}
