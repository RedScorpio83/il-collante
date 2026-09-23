---
title: "Come ho abbattuto dell'86% i token dell'IA guidandola come un Chief Architect"
description: "L'IA voleva riscrivere subito il codice e inviare 82.000 token per 12 bollette. Ecco come un approccio da sistemista ha tagliato i costi dell'86%, quadruplicato la velocità e garantito zero leak GDPR."
pubDate: 2026-09-23
tags: ["ia", "sistemi", "architettura", "prompt-engineering", "gdpr", "benchmark"]
---

Quando chiedi a un modello di Intelligenza Artificiale di risolvere un problema complesso di elaborazione dati, la sua risposta istintiva è simile a quella di un programmatore junior molto volenteroso ma privo di esperienza sul campo: **vuole modificare subito il codice in produzione**, manda in pasto al prompt intere pagine di documenti non filtrati e si fida ciecamente delle istruzioni verbali (come *"per favore non memorizzare i dati personali"*).

Il risultato tipico? Sistemi lenti che costano cifre esorbitanti di chiamate API, rischiano violazioni GDPR e generano allucinazioni contabili non appena incontrano un footer promozionale in un documento.

Recentemente, durante l'ingegnerizzazione della pipeline di acquisizione delle bollette energetiche ARERA per la piattaforma **EnergyLife**, ci siamo trovati esattamente di fronte a questo bivio: accettare la soluzione standard proposta dall'IA o **imporre un'architettura rigorosa da Chief Architect**.

Il risultato finale, misurato scientificamente su un set di test reale, parla chiaro:

| Metrica Chiave | Prima (Proposta Standard IA) | Dopo (Architettura Umano-IA) | Risultato |
| :--- | :---: | :---: | :---: |
| **Token Inviati all'IA** | $\sim 81.850$ token | **11.354 token** | **-86,1% di token** |
| **Latenza Totale Batch (12 PDF)** | $\sim 27,6$ secondi | **5,95 secondi** | **+364% più veloce** |
| **Tempo per File Successivi** | $\sim 2,3\text{s}$ a file | **$\sim 0,0005\text{s}$ (sub-millisecondo)** | **Quasi istantaneo** |
| **Accuratezza Contabile & GDPR** | Rischio leak & falsi positivi | **100% garantito a codice** | **Zero rischi** |

Ecco l'anatomia completa di come abbiamo ottenuto questi numeri, la ripartizione dei compiti e perché l'IA produce eccellenza solo quando è vincolata da una guida umana esperta.

---

## 1. Il Confronto: Proposta Iniziale dell'IA vs Iterazione Guidata

Nel nostro laboratorio abbiamo isolato un campione di test composto da **12 bollette PDF reali** (media di 9,2 pagine e 25.920 caratteri per documento, pari a circa 6.820 token a file).

Mettendo a confronto la proposta iniziale generata dall'assistente IA con l'architettura finale nata dalla nostra direzione tecnica, emergono le differenze sostanziali:

| Aspetto dell'Architettura | Proposta Iniziale dell'IA | Risultato Finale con Iterazione Umana | Impatto dell'Intervento Umano |
| :--- | :--- | :--- | :--- |
| **Metodologia di Lavoro** | Modifiche dirette al codice di produzione ed analisi in-line. | **"NON agire, studiamo prima"**: creazione di un sandbox di test isolato su 12 PDF reali. | **Zero rischi di regressione:** ha protetto il server di produzione durante tutti i test. |
| **Gestione Batch Multi-File** | Chiamate IA sequenziali file per file con caching semplice (che si sovrascriveva tra Luce e Gas). | **Pipeline a 4 Stadi con Bucketing Preventivo:** classificazione client in *Luce*, *Gas*, *Duale* prima di qualsiasi chiamata. | **Eliminazione chiamate ridondanti:** da 12 chiamate IA a **sole 3 chiamate totali per batch**. |
| **Payload Inviato all'IA** | Invio del testo del PDF quasi integrale ($\sim 6.800$ token per bolletta). | **Filtering AGGRESSIVO3:** deduplicazione header, whitelist contabile e word-level pruning delle frasi burocratiche. | **Abbattimento dell'86,1% dei token:** da 81.849 token totali a soli 11.354 inviati alla rete. |
| **Algoritmo di Categorizzazione** | Regex generica su tutto il documento (con falsi positivi causati dalle pubblicità a piè di pagina). | **Categorizzazione sull'Header di Pagina 1-2:** rilevamento mirato delle sole etichette contabili reali. | **Accuratezza al 100%:** azzerato l'errore per cui bollette Luce con promozioni venivano scambiate per Gas. |
| **Latenza Complessiva Batch** | $\sim 27,6$ secondi di attesa utente. | **5,95 secondi totali** ($\sim 0,0005\text{s}$ per i file successivi al primo grazie alla Fase 2 locale). | **+364% più veloce** (riduzione dell'attesa utente del 78,4%). |
| **Garanzia GDPR e Privacy** | Affidata all'istruzione testuale nel prompt dell'IA (*"ignora i dati personali"*). | **Stripping Tassativo lato Client:** eliminazione preventiva a codice di POD, PDR, Codice Fiscale, IBAN e Nomi. | **Privacy by Design:** garanzia matematica che nessun dato sensibile viaggi in rete. |

---

## 2. Il Ruolo dell'Umano: Visione Strategica, Architettura & Rigore

Se ti limiti a usare l'IA come una scatola magica a cui delegare le decisioni, otterrai sistemi fragili e costosi. In questa sessione di ingegnerizzazione ho operato come **Chief Software Architect**, applicando cinque regole ferree:

1. **Il Principio di Cautela ("NON agire, studiamo prima"):**  
   Quando l'IA ha proposto di ritoccare subito i file di produzione, ho imposto lo stop immediato: prima si allestisce un ambiente di sandbox in cartella separata (`scratch`), si caricano i 12 file di riferimento e si misurano i valori di partenza.
2. **Ideazione dell'Architettura a 4 Stadi:**  
   Ho suddiviso il flusso in quattro passaggi stagni:
   * **Stadio 1 (Client):** Categorizzazione istantanea e bucketing (*Luce* vs *Gas*).
   * **Stadio 2 (Client):** Stripping GDPR matematico via Canvas / regex locali prima dell'invio.
   * **Stadio 3 (IA Vision):** Interrogazione dell'IA **solo sul primo documento** per estrarre lo schema geometrico e testuale delle ancore (`patternSchema`).
   * **Stadio 4 (Deterministico):** Estrazione locale fulminea a codice per tutti i successivi documenti del fornitore a costo token zero.
3. **Direzione Progressiva dell'Ottimizzazione:**  
   Invece di accontentarsi del primo risultato, ho guidato l'ottimizzazione del testo attraverso quattro livelli di potatura crescente: *Non Aggressiva* $\to$ *Aggressivo 1* $\to$ *Aggressivo 2* $\to$ *Aggressivo 3*, verificando ad ogni step che nessun campo contabile ARERA venisse cancellato per errore.
4. **Individuazione dell'Anomalia Subdola:**  
   Durante i test, una bolletta elettrica veniva classificata come gas metano. L'IA non capiva il motivo. Analizzando il testo grezzo ho notato che nel footer promozionale a pagina 6 c'era la scritta *"Scopri le nostre offerte Gas"*. Ho imposto all'IA la regola di escludere il corpo del documento e analizzare **esclusivamente il blocco contabile delle prime due pagine**.
5. **Pretesa del Ground Truth Certificato:**  
   Non ci siamo accontentati di un generico *"funziona"*: ho preteso la creazione di uno script di audit che confrontasse, cella per cella, il valore estratto con la realtà ufficiale dei 12 PDF (costi kWh, quote fisse, quote potenza, accise e IVA al centesimo).

---

## 3. Il Ruolo dell'IA: Ingegnerizzazione, Benchmark & Calcolo ad Alta Frequenza

Una volta definiti i binari architetturali e i vincoli invalicabili, l'IA (Antigravity) ha operato come un **Lead Engineer e Data Scientist instancabile**:

* **Sviluppo degli Algoritmi di Filtraggio:** Ha tradotto le direttive in espressioni regolari per la deduplicazione degli header di pagina, logica *Whitelist-Only* e *Word-Level Pruning* di tutte le clausole legali e burocratiche.
* **Costruzione della Suite di Benchmark Empirico:** Ha generato ed eseguito una serie di script di test dedicati (`test_pipeline_4stadi.py`, `test_pipeline_aggressivo.py`, `audit_ground_truth.py`).
* **Misurazione Matematica Rigorosa:** Ha analizzato i 12 PDF misurando la dimensione media, i caratteri esatti e calcolando l'abbattimento effettivo dei token dall'81.849 iniziali a 11.354.
* **Audit Contabile Automatico:** Ha verificato la corrispondenza dei 23 campi estratti rispetto ai documenti originali, certificando l'accuratezza al 100%.

---

## 4. Tabella di Ripartizione delle Responsabilità

```text
┌─────────────────────────────────┬──────────────────────────────────┐
│        CONTRIBUTO UMANO         │          CONTRIBUTO IA           │
│    (Chief Software Architect)   │     (Lead Engineer & Data Sci)   │
├─────────────────────────────────┼──────────────────────────────────┤
│ Regola "NON agire, studiamo"    │ Creazione del sandbox isolato    │
│ Formulazione architettura 4 stadi│ Traduzione in diagrammi e codice │
│ Direttiva di pruning progressivo│ Sviluppo regex e filtri inline   │
│ Individuazione errore nei footer│ Riscrittura parser su pag 1-2    │
│ Pretesa di verifica Ground Truth│ Scansione e confronto cella-cella│
│ Richiesta calcolo token/latenze │ Misurazione analitica metriche   │
│ Direttiva di archivio scientifico│ Redazione report e tabelle       │
└─────────────────────────────────┴──────────────────────────────────┘
```

---

## 5. La Conclusione

Questo caso studio dimostra una verità fondamentale per chiunque sviluppi software oggi:

1. **Senza la guida strategica dell'Umano**, l'IA si sarebbe limitata a un'estrazione sequenziale standard: lenta, con costi di token quintuplicati, vulnerabile a livello GDPR e suscettibile di allucinazioni contabili.
2. **Senza la potenza esecutiva dell'IA**, l'Umano avrebbe impiegato giorni a scrivere manualmente decine di espressioni regolari, script di benchmark ed elaborazioni statistiche.

L'eccellenza ingegneristica non nasce dal delegare ciecamente all'Intelligenza Artificiale, ma dall'**imporre il proprio rigore architettonico per moltiplicarne la forza esecutiva**. Questo è esattamente ciò che intendo quando dico che il mio ruolo è fare da **collante**.
