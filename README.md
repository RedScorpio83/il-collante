# Blog & Portfolio di Alessandro Caliciotti

Sito personale, portfolio tecnico e blog per documentare architetture hardware/software, automazione, IoT, Proxmox e homelab.

Costruito con **[Astro](https://astro.build)** e **[Tailwind CSS](https://tailwindcss.com)**.

---

## Struttura del Progetto

```text
AlessandroCaliciottiBLOG/
├── src/
│   ├── consts.ts                 # Titolo sito, bio, link social (GitHub, LinkedIn, email)
│   ├── content/
│   │   ├── blog/                 # Articoli in Markdown (.md / .mdx)
│   │   └── projects/             # Schede di progetto in Markdown (.md / .mdx)
│   ├── components/               # Header, Footer, ThemeToggle, Card
│   ├── layouts/                  # BaseLayout con SEO e Dark Mode
│   ├── pages/                    # Home, Projects, Blog, About, RSS
│   └── styles/global.css         # Tailwind v4 e typography
└── public/                       # Icone, immagini statiche, avatar
```

---

## Comandi Principali

Nel tuo terminale (PowerShell o CMD):

| Comando | Descrizione |
|---|---|
| `astro dev --background` | Avvia il server di sviluppo in background su `http://localhost:4321` |
| `astro dev status` | Verifica lo stato del server di sviluppo |
| `astro dev logs` | Legge i log del server di sviluppo |
| `astro dev stop` | Arresta il server di sviluppo |
| `npm run build` | Compila l'intero sito statico nella cartella `dist/` |
| `npm run preview` | Mostra in anteprima locale la build di produzione |

---

## Come Aggiungere Nuovi Contenuti

### 1. Aggiungere un nuovo Progetto

Crea un nuovo file in `src/content/projects/nome-progetto.md`:

```markdown
---
title: "Nome del Tuo Progetto"
description: "Breve descrizione in 1-2 frasi dell'obiettivo e del funzionamento."
pubDate: 2026-09-20
technologies: ["Proxmox", "MQTT", "Python", "IoT"]
status: "active" # oppure: "in-progress", "completed"
featured: true   # true se vuoi mostrarlo nella home page
githubUrl: "https://github.com/tuo-username/tuo-repo" # opzionale
liveUrl: "https://tua-demo.com"                       # opzionale
---

## Il Problema
Spiega cosa mancava o quale problema pratico hai affrontato.

## L'Architettura
Descrivi come lo hai progettato (diagrammi, flussi, componenti).

## Risultati e codice
Mostra i risultati e inserisci snippet di codice.
```

### 2. Aggiungere un nuovo Articolo al Blog

Crea un nuovo file in `src/content/blog/titolo-articolo.md`:

```markdown
---
title: "Titolo del tuo Articolo Tecnico"
description: "Sintesi breve dell'articolo che apparirà nelle anteprime e sui social."
pubDate: 2026-09-20
tags: ["homelab", "proxmox", "linux", "networking"]
---

Il tuo testo in formato Markdown, con immagini, titoli e blocchi di codice!
```

---

## Personalizzazione Dati Personali

Per modificare il tuo nome, link ai social o email:
Apri [`src/consts.ts`](./src/consts.ts) e aggiorna i campi:
- `SITE_TITLE`
- `SOCIAL_LINKS.github`
- `SOCIAL_LINKS.linkedin`
- `SOCIAL_LINKS.email`
