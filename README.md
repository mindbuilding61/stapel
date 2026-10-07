# Stapel (karteikarten.motizen.de)

Lernkarten mit Spaced Repetition, Login/Registrierung und Anki-Import (`.apkg`, `.txt`, `.tsv`, `.csv`).

## Lokal

```bash
cp .env.example .env
# AUTH_SECRET setzen
npm install
npx prisma migrate dev
npm run dev
```

Öffnen: http://localhost:3000

## Docker (Produktion)

```bash
export AUTH_SECRET="$(openssl rand -hex 32)"
docker compose up -d --build
```

App lauscht auf Port 3000. Daten liegen im Volume `stapel-data`.

## Domain karteikarten.motizen.de

1. DNS: A/AAAA oder CNAME auf den Server, auf dem Docker läuft.
2. Nginx-Beispiel: `deploy/nginx-karteikarten.motizen.de.conf`
3. TLS mit Certbot (`certbot --nginx -d karteikarten.motizen.de`)
4. `NEXT_PUBLIC_APP_URL=https://karteikarten.motizen.de` in der Compose-Umgebung

## Anki-Import

Nach dem Login: **Anki importieren**.

- `.apkg` / `.colpkg` aus Anki (Datei → Exportieren)
- oder Text-Export mit Tab oder Semikolon (`Front[TAB]Back`)
