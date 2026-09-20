# Il collante, tema v1

Due file:

- `theme.css`: il tema completo (colori, caratteri, componenti, modalità scura).
- `anteprima.html`: home e pagina articolo con tutti i componenti. Apri il file nel browser: è il riferimento del markup da riprodurre.

Non ho visto il codice del tuo sito, quindi le classi vanno abbinate ai tuoi componenti. Il modo più rapido è dare `theme.css` e `anteprima.html` al tuo assistente di codice con questa richiesta:

> Adatta i layout e i componenti del sito alle classi di `theme.css`, usando `anteprima.html` come riferimento del markup. Non cambiare i contenuti né le rotte. Importa il CSS nel layout principale e carica i font nell'head.

## Installazione (sito Astro)

1. Copia `theme.css` in `src/styles/`.
2. Importalo nel layout principale: `import '../styles/theme.css';`
3. Nell'`<head>` del layout aggiungi i font:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wdth,wght@12..96,75..100,300..800&family=Source+Serif+4:ital,opsz,wght@0,8..60,400..700;1,8..60,400..700&display=swap">
```

   Se preferisci ospitare i font sul tuo sito, usa i pacchetti `@fontsource` di questi due caratteri.
4. Copia in un tuo file JS lo script in fondo ad `anteprima.html`: gestisce filtro per argomento, pulsante copia sul codice, indice dell'articolo. L'ultima parte, "Solo anteprima", non va copiata.

## Componenti principali

| Classe | Uso |
| --- | --- |
| `.hero`, `.hero-lead`, `.hero-links` | Apertura della home |
| `.subscribe`, `.subscribe--inline` | Iscrizione: riquadro completo o riga compatta per l'hero |
| `.chart`, `.chart-head`, `.status` | Grafico e stato ("impianto reale" o "dati illustrativi") |
| `.stats`, `.stat`, `.stat-n`, `.stat-l` | Tre numeri grandi sotto l'hero |
| `.featured`, `.list`, `.item`, `.has-cover` | Articolo in evidenza e lista |
| `.cover`, `.cover-tag`, `.c-energia` `.c-ottim` `.c-proto` `.c-sist` | Copertina automatica a quadretti, o foto con `<img>` dentro `.cover` |
| `.projects-list`, `.project`, `.project-num`, `.tags` | Progetti con numero o parola chiave a sinistra |
| `.series`, `.series-bar`, `.series-list` | Blocco della serie, in cima all'articolo |
| `.post-layout`, `.toc`, `.post-head`, `.prose` | Pagina articolo con indice laterale |
| `.codeblock`, `.copy`, `.frame`, `.note`, `.eq` | Codice con copia, frame di protocollo, nota del sistemista, formule |
| `.post-end`, `.next`, `.discuss` | Chiusura articolo: prossimo, iscrizione, discussione |

Il colore delle categorie si assegna con `.c-energia`, `.c-ottim`, `.c-proto`, `.c-sist` sia sull'etichetta (`.cat`) sia sulla copertina.

## Da completare (non dipendono dal tema)

- **Iscrizione**: nei moduli `.subscribe` imposta `action` sull'indirizzo del servizio che scegli (newsletter o feed via email). Nell'anteprima non invia nulla.
- **Grafico**: quando hai i dati reali, sostituisci i punti e cambia l'etichetta in "impianto reale" con la data.
- **Foto**: dentro `.cover` metti `<img src="..." alt="...">` con una foto del banco o uno schema dell'architettura.
- **Anteprima social**: crea un'immagine PNG 1200×630 e usala come `og:image`. Correggi anche `og:url`, che ora è `http://localhost:4321/`, e verifica che il dominio indicato come canonico sia attivo.
