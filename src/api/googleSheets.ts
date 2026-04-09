import type { Book } from '../types'

const SHEETS_BASE = 'https://sheets.googleapis.com/v4/spreadsheets'
const DRIVE_BASE  = 'https://www.googleapis.com/drive/v3/files'

// Column order: A-P (16 columns)
const HEADERS = [
  'ISBN', 'Titolo', 'Autore', 'Editore', 'Anno', 'Genere', 'Lingua', 'Pagine',
  'Cover URL', 'Data Aggiunta', 'Valore Stimato (€)', 'Piattaforma',
  'Ultimo Controllo', 'Da Vendere', 'Stato', 'Note',
]

function bookToRow(book: Partial<Book>): (string | number | boolean)[] {
  return [
    book.isbn ?? '',
    book.title ?? '',
    (book.authors ?? []).join(', '),
    book.publisher ?? '',
    book.year ?? 0,
    (book.genre ?? []).join(', '),
    book.language ?? '',
    book.pages ?? 0,
    book.coverUrl ?? '',
    book.dateAdded ?? '',
    book.estimatedValue ?? '',
    book.valuePlatform ?? '',
    book.lastChecked ?? '',
    book.worthSelling ? 'Sì' : 'No',
    book.status ?? 'unread',
    book.notes ?? '',
  ]
}

function rowToBook(row: string[], rowIndex: number): Book {
  const [
    isbn, title, authors, publisher, year, genre, language, pages,
    coverUrl, dateAdded, estimatedValue, valuePlatform,
    lastChecked, worthSelling, status, notes,
  ] = row

  return {
    id: crypto.randomUUID(),
    isbn: isbn ?? '',
    title: title ?? '',
    authors: authors ? authors.split(', ') : [],
    publisher: publisher ?? '',
    year: year ? parseInt(year, 10) : 0,
    genre: genre ? genre.split(', ') : [],
    language: language ?? '',
    pages: pages ? parseInt(pages, 10) : 0,
    coverUrl: coverUrl ?? '',
    description: '',
    dateAdded: dateAdded ?? new Date().toISOString(),
    estimatedValue: estimatedValue ? parseFloat(estimatedValue) : null,
    valuePlatform: valuePlatform || null,
    lastChecked: lastChecked || null,
    worthSelling: worthSelling === 'Sì',
    status: (status as Book['status']) ?? 'unread',
    notes: notes ?? '',
    priceHistory: [],
    sheetsRowIndex: rowIndex,
  }
}

// ─── initializeSpreadsheet ─────────────────────────────────────────────────

export async function initializeSpreadsheet(accessToken: string): Promise<string> {
  // Search for existing sheet first
  const searchRes = await fetch(
    `${DRIVE_BASE}?q=name%3D'Codex+Petri'+and+mimeType%3D'application%2Fvnd.google-apps.spreadsheet'&fields=files(id,name)`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  )
  if (!searchRes.ok) throw new Error(`Drive search error: ${searchRes.status}`)
  const { files } = await searchRes.json()
  if (files?.length) return files[0].id as string

  // Create new spreadsheet
  const createRes = await fetch(`${SHEETS_BASE}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: { title: 'Codex Petri' },
      sheets: [{ properties: { title: 'Libri', index: 0 } }],
    }),
  })
  if (!createRes.ok) throw new Error(`Create spreadsheet error: ${createRes.status}`)
  const sheet = await createRes.json()
  const spreadsheetId: string = sheet.spreadsheetId

  // Write header row
  await fetch(
    `${SHEETS_BASE}/${spreadsheetId}/values/Libri!A1:P1?valueInputOption=RAW`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values: [HEADERS] }),
    },
  )

  return spreadsheetId
}

// ─── appendBook ────────────────────────────────────────────────────────────

export async function appendBook(
  accessToken: string,
  sheetsId: string,
  book: Book,
): Promise<number> {
  const res = await fetch(
    `${SHEETS_BASE}/${sheetsId}/values/Libri!A:P:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values: [bookToRow(book)] }),
    },
  )
  if (!res.ok) throw new Error(`appendBook error: ${res.status}`)
  const data = await res.json()

  // Parse row index from updatedRange e.g. "Libri!A5:P5"
  const range: string = data.updates?.updatedRange ?? ''
  const match = range.match(/!A(\d+)/)
  return match ? parseInt(match[1], 10) : -1
}

// ─── updateBook ────────────────────────────────────────────────────────────

export async function updateBook(
  accessToken: string,
  sheetsId: string,
  rowIndex: number,
  book: Partial<Book>,
): Promise<void> {
  const res = await fetch(
    `${SHEETS_BASE}/${sheetsId}/values/Libri!A${rowIndex}:P${rowIndex}?valueInputOption=RAW`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values: [bookToRow(book)] }),
    },
  )
  if (!res.ok) throw new Error(`updateBook error: ${res.status}`)
}

// ─── fetchAllBooks ─────────────────────────────────────────────────────────

export async function fetchAllBooks(
  accessToken: string,
  sheetsId: string,
): Promise<Book[]> {
  const res = await fetch(
    `${SHEETS_BASE}/${sheetsId}/values/Libri!A2:P`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  )
  if (!res.ok) throw new Error(`fetchAllBooks error: ${res.status}`)
  const data = await res.json()

  const rows: string[][] = data.values ?? []
  return rows
    .filter((row) => row[0]) // skip empty rows
    .map((row, i) => rowToBook(row, i + 2)) // row 1 = headers, data starts at row 2
}
