export function isValidISBN(isbn: string): boolean {
  const clean = isbn.replace(/[-\s]/g, '');
  return isISBN10(clean) || isISBN13(clean);
}

function isISBN10(isbn: string): boolean {
  if (isbn.length !== 10) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    const d = parseInt(isbn[i]);
    if (isNaN(d)) return false;
    sum += d * (10 - i);
  }
  const last = isbn[9];
  sum += last === 'X' ? 10 : parseInt(last);
  return sum % 11 === 0;
}

function isISBN13(isbn: string): boolean {
  if (isbn.length !== 13) return false;
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const d = parseInt(isbn[i]);
    if (isNaN(d)) return false;
    sum += d * (i % 2 === 0 ? 1 : 3);
  }
  const check = (10 - (sum % 10)) % 10;
  return check === parseInt(isbn[12]);
}

export function normalizeISBN(isbn: string): string {
  return isbn.replace(/[-\s]/g, '');
}
