import path from 'path'
import fs from 'fs'
import JSZip from 'jszip'
import initSqlJs, { type Database } from 'sql.js'

export interface ImportedCard {
  front: string
  back: string
}

export interface ImportedDeck {
  name: string
  cards: ImportedCard[]
}

const FIELD_SEP = '\x1f'

async function loadSql() {
  const wasmPath = path.join(process.cwd(), 'node_modules/sql.js/dist/sql-wasm.wasm')
  const wasmBinary = fs.readFileSync(wasmPath).buffer
  return initSqlJs({ wasmBinary })
}

function stripHtml(value: string) {
  return value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim()
}

function parseTxt(content: string, fallbackName: string): ImportedDeck {
  const cards: ImportedCard[] = []
  for (const raw of content.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line || line.startsWith('#') || line.startsWith('tags:')) continue
    const parts = line.includes('\t') ? line.split('\t') : line.split(';')
    if (parts.length < 2) continue
    const front = stripHtml(parts[0] ?? '')
    const back = stripHtml(parts.slice(1).join(' / '))
    if (front && back) cards.push({ front, back })
  }
  return { name: fallbackName.replace(/\.(txt|tsv|csv)$/i, ''), cards }
}

function readDecksMap(db: Database): Map<number, string> {
  const map = new Map<number, string>()
  try {
    const row = db.exec('SELECT decks FROM col LIMIT 1')
    const json = row[0]?.values[0]?.[0]
    if (typeof json === 'string') {
      const decks = JSON.parse(json) as Record<
        string,
        { id: number; name: string }
      >
      for (const deck of Object.values(decks)) {
        if (deck?.id != null && deck.name) {
          map.set(Number(deck.id), String(deck.name).split('::').pop() || deck.name)
        }
      }
    }
  } catch {
    // older schemas
  }
  return map
}

function parseApkgDb(db: Database, fallbackName: string): ImportedDeck[] {
  const decksMap = readDecksMap(db)
  const byDeck = new Map<string, ImportedCard[]>()

  const result = db.exec(`
    SELECT c.did, n.flds
    FROM cards c
    JOIN notes n ON n.id = c.nid
  `)

  if (!result[0]) {
    return [{ name: fallbackName, cards: [] }]
  }

  for (const row of result[0].values) {
    const did = Number(row[0])
    const flds = String(row[1] ?? '')
    const fields = flds.split(FIELD_SEP).map(stripHtml).filter(Boolean)
    if (fields.length < 2) continue
    const front = fields[0]
    const back = fields[1]
    const name = decksMap.get(did) || fallbackName
    const list = byDeck.get(name) ?? []
    list.push({ front, back })
    byDeck.set(name, list)
  }

  if (byDeck.size === 0) return [{ name: fallbackName, cards: [] }]
  return [...byDeck.entries()].map(([name, cards]) => ({ name, cards }))
}

export async function importAnkiFile(
  buffer: ArrayBuffer,
  filename: string,
): Promise<ImportedDeck[]> {
  const lower = filename.toLowerCase()
  const fallback = filename.replace(/\.[^.]+$/, '') || 'Import'

  if (lower.endsWith('.txt') || lower.endsWith('.tsv') || lower.endsWith('.csv')) {
    const text = new TextDecoder('utf-8').decode(buffer)
    return [parseTxt(text, fallback)]
  }

  if (!lower.endsWith('.apkg') && !lower.endsWith('.colpkg')) {
    throw new Error('Unterstützt: .apkg, .colpkg, .txt, .tsv, .csv')
  }

  const zip = await JSZip.loadAsync(buffer)
  const dbName =
    Object.keys(zip.files).find((n) =>
      /collection\.anki2(1)?$/i.test(n.split('/').pop() || ''),
    ) || Object.keys(zip.files).find((n) => n.endsWith('.anki2') || n.endsWith('.anki21'))

  if (!dbName) throw new Error('Keine Anki-Datenbank in der Datei gefunden')

  const dbBytes = await zip.files[dbName].async('uint8array')
  const SQL = await loadSql()
  const db = new SQL.Database(dbBytes)
  try {
    return parseApkgDb(db, fallback)
  } finally {
    db.close()
  }
}
