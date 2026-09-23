---
title: "EnergyLife (EnerlyApp): Piattaforma di Intelligenza Energetica & OCR Bollette"
description: "Suite full-stack per la sintesi dei consumi, audit tariffario ARERA con OCR intelligente a zero GDPR leak, simulatore predittivo di ROI solare e server MCP su Proxmox."
pubDate: 2026-07-25
technologies: ["TypeScript", "React", "Python", "FastAPI", "OCR Vision", "Proxmox (CT 116)", "PostgreSQL", "Docker", "Model Context Protocol (MCP)"]
status: "active"
featured: true
githubUrl: "https://github.com/RedScorpio83"
---

![Scanner Intelligente Bollette e OCR ARERA](/images/projects/energylife/bill-scanner-tech.webp)

## Il Problema: L'Opacità delle Bollette e delle Tariffe Energetiche

Chiunque abbia provato ad analizzare una fattura elettrica o del gas in Italia si è scontrato con una giungla inestricabile: tra **quote fisse, corrispettivi di potenza, oneri di sistema (ASOS/ARIM), dispacciamento, scaglioni e accise**, capire quanto si paga realmente per chilowattora o metro cubo è quasi impossibile.

I comparatori commerciali online non offrono una soluzione reale: richiedono dati personali, vendono i contatti ai call center e propongono solo i fornitori con cui hanno accordi commerciali. Dall'altro lato, chi progetta o installa impianti solari con accumulo spesso si affida a calcoli approssimativi basati su medie annuali, senza incrociare le curve orarie di carico con le tariffe effettive applicate dal proprio gestore.

---

## L'Architettura Software: Pipeline Ibrida a Due Fasi

**EnergyLife** (nota anche come **EnerlyApp**) è nata per risolvere questo problema con un approccio ingegneristico e rigoroso. Il cuore dell'applicazione è una **pipeline ibrida client/server a due stadi** che unisce l'intelligenza visiva dei modelli multimodali con la velocità fulminea del parsing deterministico locale.

```text
┌────────────────────────┐
│  Fattura PDF / Foto    │
└───────────┬────────────┘
            │ 1. Redazione GDPR Locale (Off-screen Canvas)
            ▼
┌────────────────────────┐
│ Single Patchwork Canvas│  (Oscura PII: Nome, CF, Indirizzo, POD/PDR)
└───────────┬────────────┘
            │
            ├──► Se PRIMA bolletta del fornitore:
            │    Chiamata AI Vision ──► Apprende "patternSchema" (Ancore & Coordinate)
            │
            └──► Se bolletta successiva (2..12 del batch):
                 Motore Locale (0.01s) ──► Estrazione deterministica a costo zero
```

### 1. Zero GDPR Leak: Il Patchwork Canvas
Prima che qualunque immagine o testo lasci il browser dell'utente, un modulo client-side (`billRedactorCanvas.js`) identifica e maschera preventivamente tutti i dati personali identificativi (PII):
- Codice Fiscale, Nome e Cognome dell'intestatario.
- Indirizzo esatto di fornitura.
- **Nessun codice identificativo POD o PDR viene mai trasmesso o salvato**. La localizzazione climatica fa fede esclusivamente a livello di Comune dal profilo dell'utenza.

### 2. Batch Learning a Costo Computazionale Zero
Quando un utente carica uno storico di 12 bollette dello stesso fornitore (es. Enel, Eni Plenitude, Hera, A2A):
1. **Fase 1 (Apprendimento Layout):** L'IA Vision analizza solo la prima pagina anonimizzata della prima fattura, estraendo i valori ed esportando un dizionario di **ancore testuali e geometriche** (`patternSchema`).
2. **Fase 2 (Replicazione Deterministica):** Le restanti 11 fatture vengono elaborate istantaneamente dal motore regex locale (`billPatternLearner.js` e `billRegexParser.js`) in meno di **10 millisecondi** a documento, senza consumare token API o inviare ulteriori dati all'esterno.

---

## Snippet di Codice: Il Motore di Apprendimento Ancore

Ecco l'implementazione del prompt e della struttura di estrazione dei 23 campi ARERA in `src/engine/billPatternLearner.js`:

```javascript
/**
 * MOTORE DINAMICO DI APPRENDIMENTO ANCORE & REPLICAZIONE BATCH (billPatternLearner.js)
 * 
 * FASE 1: L'IA Vision analizza la 1ª bolletta redacted, estrae i dati ed apprende lo schema ("patternSchema").
 * FASE 2..N: Il parser locale usa il patternSchema per estrarre tutti i 23 campi ARERA in 0.01s.
 */
import { callActiveAiProvider, cleanAndParseAiJson } from './aiClient';
import { parseBillTextStrict } from './billRegexParser';

export const PATTERN_LEARNING_SYSTEM_PROMPT = `Sei un ingegnere specializzato nell'analisi di layout per bollette energetiche italiane ARERA.
Analizza il documento fornito (già depurato da dati sensibili GDPR).

La tua missione è duplice:
1. Estrarre i dati contabili ed energetici anonimizzati.
2. Identificare lo SCHEMA DI ANCORE DI TESTO ("patternSchema") per questo gestore, indicando le frasi chiave per individuare ciascun campo.

Rispondi ESCLUSIVAMENTE con un JSON valido:
{
  "extractedData": {
    "supplier": "Nome Fornitore",
    "type": "luce" | "gas" | "duale",
    "month": "Mese",
    "year": 2024,
    "amount": 120.50,
    "potenzaImpegnataKw": 3.0,
    "tensioneFasi": "monofase" | "trifase",
    "f1Kwh": 140, "f2Kwh": 95, "f3Kwh": 115,
    "quotaFissaMateria": 12.00,
    "quotaEnergiaMateria": 95.45,
    "quotaFissaTrasporto": 3.68,
    "quotaPotenzaTrasporto": 5.60,
    "spesaOneriSistema": 14.20,
    "accise": 6.52,
    "iva": 14.15
  },
  "patternSchema": {
    "anchors": {
      "f1": "Fascia F1",
      "spesaTrasporto": "Spesa per il trasporto e la gestione del contatore",
      "potenza": "Potenza impegnata"
    }
  }
}`;
```

---

![Simulatore Predittivo ROI e Autoconsumo](/images/projects/energylife/ai-simulation-roi.webp)

## Simulatore di ROI & Integrazione con Inverter Solari

I dati estratti dalle bollette confluiscono nel motore di simulazione energetica:

1. **Deanonymizer Tariffario:** Riconosce la formula contrattuale reale (es. *PUN Orario + Spread*, *Tariffa Fissa Bloccata*, *Monoraria vs Multioraria*).
2. **Dimensionamento Fotovoltaico & Batterie:** Simula l'effetto di diverse potenze di picco (kWp) e capacità di accumulo (kWh LiFePO4) applicate alla curva di carico oraria reale dell'utente, calcolando il tempo di ammortamento al centesimo.
3. **Simulazione Pompa di Calore (PDC) & Climatizzazione:** Stima il coefficiente COP orario basato sulla temperatura climatica locale per calcolare l'impatto economico dell'abbandono del gas metano.

![Inverter and Storage Hub](/images/projects/energylife/inverter-storage-hub.webp)

---

## Integrazione Proxmox & Server MCP (Model Context Protocol)

Per integrarsi con gli assistenti IA e con il cluster di automazione di casa, EnergyLife espone un server **MCP** dedicato in esecuzione nel container Proxmox LXC CT 116:

* **`energylife_architecture_schema`**: Fornisce lo schema DB e la topologia dei microservizi.
* **`energylife_app_status`**: Riporta lo stato dei servizi in tempo reale (PostgreSQL, FastAPI, Docker).
* **`energylife_doc_lookup`**: Permette agli agenti IA di consultare le specifiche tecniche dei moduli e i log applicativi direttamente da terminale o chat.

L'infrastruttura è completamente containerizzata con Docker Compose e salvaguardata con backup automatici cifrati e ridondati su pool ZFS.
