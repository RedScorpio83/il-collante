---
title: "Dal groviglio di if all'AI System 1: reflex loop a sub-millisecondo con kill-switch hardware"
description: "Coordinare due inverter con un motore decisionale neurale-simbolico: allineamento del registro Modbus 47081, watchdog per Wallbox Tuya e rollback in 10 ms."
pubDate: 2026-09-20
tags: ["ia", "hems", "modbus", "machine-learning", "sistemi", "fotovoltaico"]
---

Quando gestisci un impianto fotovoltaico con carichi concorrenti (batterie di casa, auto elettrica, pompe di calore), la tentazione iniziale è quella di scrivere regole statiche: *se c'è sole fai questo, se la batteria è carica fai quello*. 

Con il tempo, questa logica a regole fisse si trasforma in un **groviglio di if ingestibile**. Una nuvola improvvisa o l'accensione di un forno manda in confusione la macchina a stati, provocando oscillazioni continue nei contattori e decisioni sub-ottimali.

Per superare questo limite abbiamo implementato un'architettura decisionale a due cervelli (**Dual-Brain**), affiancando al pianificatore orario matematico un motore reattivo **System 1 neurale-simbolico (Jev-like)** capace di valutare la strategia migliore in meno di **1 millisecondo (<1ms)**.

Ecco come l'abbiamo testato in sicurezza sul campo, risolto un blocco critico sul registro Modbus della batteria Huawei e implementato un **kill-switch sub-10ms** per garantire che il sistema rimanga sempre stabile.

---

## 1. L'Architettura Dual-Brain: System 1 (Riflesso) e System 2 (Pianificazione)

Prendendo in prestito i concetti delle scienze cognitive, la gestione energetica è suddivisa su due livelli cooperativi:

```text
┌────────────────────────────────────────────────────────┐
│     SYSTEM 2: Pianificatore Orario HiGHS MILP 48h      │
│   • Ottimizzazione convessa globale su orizzonte 48h   │
│   • Previsioni meteo satellitari Solcast + Prezzi PUN  │
│   • Assegna i budget energetici di massima per la giornata│
└───────────────────────────┬────────────────────────────┘
                            │ Budget & Contratti di Flessibilità
                            ▼
┌────────────────────────────────────────────────────────┐
│      SYSTEM 1: Jev-like Neural-Symbolic Scorer         │
│   • Single-pass forward pass a latenza <0.3 ms         │
│   • Valuta 128 dimensioni di telemetria istantanea     │
│   • Seleziona la strategia con softmax ad alta confidenza│
└───────────────────────────┬────────────────────────────┘
                            │ Direttiva Esecutiva
                            ▼
┌────────────────────────────────────────────────────────┐
│          Physical Safety Envelope & Kill-Switch        │
│   • Verifica vincoli fisici immutabili (Safety Clamps) │
│   • Rollback immediato a FSM deterministica in <10 ms  │
└────────────────────────────────────────────────────────┘
```

1. **System 2 (Lento e Ragionato):** Ogni 60 minuti calcola il piano orario ideale per i due giorni successivi.
2. **System 1 (Rapido e Reattivo):** Ogni 30 secondi esegue un ranking probabilistico tra diverse strategie (es. *EV Solar Divert*, *BESS Priority Storage*, *Thermal Inertia Flywheel*). Se le condizioni reali cambiano istantaneamente (una nuvola o un carico imprevisto), adatta l'allocazione in una frazione di millisecondo.

![JEV-like System 1 Decision Engine: Ranking Opzioni e Closed-Loop](/images/projects/dashboard_jev_decision_engine.jpg)

---

## 2. Il Mistero del Registro Modbus 47081: La Batteria Bloccata

Durante i primi test estivi, l'AI continuava a non inviare il surplus all'auto elettrica, insistendo nel voler caricare la batteria di casa **Huawei LUNA2000**. Eppure l'inverter indicava che la batteria era al 91% e assorbiva appena 3 Watt (in idle).

Ispezionando i registri raw via Modbus-TCP abbiamo scoperto la discrepanza:
* **Registro 47081 (`battery_charging_cutoff_capacity`):** impostato a livello hardware sull'inverter a **90.0%** (una soglia conservativa impostata dall'installatore per allungare la vita chimica delle celle).
* L'AI assumeva che il limite fosse il 100%: vedendo il 91%, calcolava un "finto deficit" di 1 kWh e continuava a sottrarre energia all'auto per caricare una batteria che l'inverter si rifiutava fisicamente di alimentare!

Allineando la formula del modello direttamente al valore letto dinamicamente dal registro 47081, l'anomalia è scomparsa istantaneamente: appena l'accumulo tocca il 90%, l'intero surplus viene dirottato all'auto elettrica senza disperdere un solo wattora.

---

## 3. Il Kill-Switch Sub-10ms per l'Attuazione Sicura

L'incubo di ogni ingegnere di automazione è un modello di intelligenza artificiale che allucina ed esegue comandi distruttivi sull'hardware di potenza. Per scongiurarlo abbiamo introdotto il principio del **Supervisore con Kill-Switch Hardware**:

* **Shadow Mode Iniziale:** Il motore neurale ha operato per giorni in modalità "ombra", calcolando decisioni senza inviare comandi agli inverter, confrontandole con le decisioni della macchina a stati deterministica.
* **Watchdog Attuativo a Ciclo Chiuso:** Quando il sistema comanda alla Wallbox di passare da 6A a 12A, il watchdog monitora l'effettivo assorbimento del contatore entro 15 secondi. Se la colonnina si blocca o non risponde, l'AI interviene per sbloccarla o azzera il comando.
* **Pulsante di Rollback Istantaneo:** Dalla dashboard o via API è possibile premere il Kill-Switch: in meno di **10 millisecondi** il motore System 1 viene isolato e il controllo torna al 100% alla FSM statica tradizionale.

Con questa architettura ibrida, la flessibilità dell'Intelligenza Artificiale non è un rischio, ma uno strumento di precisione protetto dalle leggi invalicabili della fisica.

![Copilota Energetico Intelligente NLP e Guardrail L0](/images/projects/dashboard_copilota_nlp.jpg)
