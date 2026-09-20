---
title: "Dal Cavo Seriale Bruciato al Copilota IA: Nascita ed Evoluzione del Nostro HEMS Bi-Inverter"
description: "Come abbiamo domato due inverter incompatibili, craccato una chiavetta cloud e costruito un Home Energy Management System predittivo con Gemini IA per 25 kWp di fotovoltaico e 36 kWh di batterie."
pubDate: 2026-08-30
tags: ["hems", "fotovoltaico", "iot", "proxmox", "gemini-ai", "hardware-hacking", "modbus"]
---

Se qualcuno qualche anno fa mi avesse detto che un giorno avrei gestito **25.05 kWp di fotovoltaico e 36 kWh di batterie LiFePO4** con un modello di Intelligenza Artificiale su Proxmox che dialoga in tempo reale con due inverter di marche totalmente diverse, probabilmente mi sarei messo a ridere. 

La realtà dei progetti ingegneristici avanzati "fatti in casa" è che non si parte mai da un'architettura pulita e rifinita: si parte dal ferro, dalla polvere del quadro elettrico, da componenti chiusi che non vogliono parlarsi, da **cavi seriali che si bruciano per correnti di massa** e da **chiavette Wi-Fi cinesi bloccate sul cloud** che abbiamo dovuto aprire, dissaldare e riprogrammare al banco.

Questa è la storia completa di tutto quello che abbiamo affrontato e costruito: la nascita, i fallimenti, le sfide fisiche e il funzionamento completo del nostro **HEMS (Home Energy Management System)**.

---

## 1. L'Architettura Fisica: Due Mondi agli Antipodi

La nostra centrale energetica è una creatura ibrida, nata per unire il massimo rendimento economico alla sicurezza assoluta di non restare mai al buio:

```text
                                  ┌─────────────────────────────┐
                                  │   PV TETTO: 14.0 kWp        │
                                  │   (Sud-Est 8.2kW + SO 5.8kW)│
                                  └──────────────┬──────────────┘
                                                 │ DC
                                                 ▼
┌──────────────────────┐  Modbus-TCP     ┌─────────────────────────────┐   AC    ┌──────────────────────┐
│  BATTERIA HV LUNA    │◄───────────────►│  HUAWEI SUN2000-10KTL-M1    │────────►│  RETE ENEL          │
│  20 kWh (Buffer 95%) │                 │  Trifase Grid-Tied On-Grid  │         │  (Smart Meter DTSU)  │
└──────────────────────┘                 └──────────────┬──────────────┘         └──────────────────────┘
                                                        │ AC-IN Pass-Through
                                                        ▼
                                         ┌─────────────────────────────┐
                                         │  DATOUBOSS DT4811B (11 kW)  │◄────────┐
                                         │  Monofase Off-Grid ad Isola │         │ DC
                                         └──────────────┬──────────────┘         │
                                                        │ AC-OUT           ┌─────┴────────────────┐
                                                        ▼                  │ PV PERGOLA: 11.05kWp │
                                         ┌─────────────────────────────┐   │ (2x Stringhe 320V)   │
                                         │  🏠 CARICHI DI CASA         │   └──────────────────────┘
                                         │  (Clima, PDC, Auto, Carichi)│
                                         └──────────────┬──────────────┘
                                                        ▲
                                         ┌──────────────┴──────────────┐
                                         │  BATTERIA HUMSIENK 48V LV   │
                                         │  16 kWh LiFePO4 (UPS Isola) │
                                         └─────────────────────────────┘
```

1. **Sezione Grid-Tied (Tetto & LUNA2000)**:
   * **Inverter Huawei SUN2000-10KTL-M1** (Trifase): Gestisce i 14 kWp del tetto e la batteria ad alto voltaggio **LUNA2000 (20 kWh)**. È connesso alla rete ENEL con lo Smart Meter trifase DTSU666-H. È il nostro "motore ad altissima efficienza" (95% di rendimento diretto).
2. **Sezione Off-Grid / Isola UPS (Pergola & HumsiENK)**:
   * **Inverter Datouboss DT4811B (11 kW)** (Monofase): Gestisce gli 11.05 kWp della Pergola bifacciale e il banco batterie a 48V **HumsiENK 16S LiFePO4 (16 kWh)**.
   * L'ingresso AC-IN del Datouboss è collegato all'uscita di Huawei; l'uscita AC-OUT alimenta l'intero quadro elettrico della casa. È la nostra "scialuppa di salvataggio UPS" che garantisce elettricità continua anche in caso di blackout di rete.

---

## 2. Le Origini: Il Cavo Seriale Bruciato e l'Hacking del Dongle Cloud-Only

Per creare un cervello intelligente, la prima regola è avere una **comunicazione locale in tempo reale, affidabile e senza intermediari**. Ed è qui che sono iniziati i dolori.

### Il giorno del "Pop": il cavo seriale fritto
Per dialogare con l'inverter Datouboss (che usa il protocollo Voltronic PI30 a 2400 baud), all'inizio usavamo un convertitore USB-RS232 standard. 
A causa delle forti correnti di commutazione ad alta frequenza e di un ground loop tra la terra di rete e il polo negativo delle batterie a 48V, c'è stato un lampo seguito dall'odore di bachelite bruciata: **il cavo seriale e la porta USB del convertitore si erano letteralmente vaporizzati**. Risolto introducendo un circuito optoisolato galvanico industriale.

### La chiavetta ufficiale: una trappola "Solo Cloud"
Assieme all'inverter c'era la chiavetta Wi-Fi ufficiale:
* Era un sistema **totalmente blindato e chiuso sul cloud estero**.
* Inviava pacchetti telemetrici ogni 5 minuti con ritardi inaccettabili e zero garanzie di privacy.
* **Non permetteva di inviare comandi locali**: era impossibile cambiare al volo la priorità di alimentazione (`POP00/POP01`) o la corrente di ricarica.

### L'Hacking Hardware al Banco
Abbiamo aperto la chiavetta, analizzato la piedinatura del microcontroller e l'abbiamo riprogrammata/sostituita per esporre un **socket TCP raw trasparente** in rete locale:

```text
socket://192.168.10.132:8888 (2400 baud, 8N1, Raw TCP Socket)
```

Da quel momento, l'inverter viene interrogato in locale ogni **2 secondi**, con latenza inferiore a **5 millisecondi**, senza passare per il cloud.

---

## 3. Reverse Engineering dei Protocolli: PI30, Modbus-TCP e BMS

1. **Protocollo Datouboss PI30 / PI17**: Calcolo con algoritmo CRC16 proprietario a 2 byte, parsing di comandi `QPIGS` per telemetria e comandi `POP00-POP03` per la commutazione di priorità.
2. **Driver Huawei SUN2000 Modbus-TCP**: Interrogazione concorrente thread-safe dei registri industriali su porta 502 (potenza attiva, stringhe, SoC LUNA2000 e Smart Meter DTSU666-H).
3. **Driver BMS HumsiENK 16S**: Monitoraggio celle LiFePO4 e algoritmo di **Stima OCV (Open-Circuit Voltage)** di emergenza se cade il cavo dati.

---

## 4. Architettura HEMS & Copilota IA su Proxmox

L'HEMS è un **sistema operativo energetico autonomo**:

1. **HEMSEngine:** Simula la traiettoria energetica sulle 24 ore incrociando ClearSky e previsioni Solcast.
2. **HourlyOptimizer:** Incrocia il meteo con i prezzi PUN orari del mercato elettrico GME e fasce ARERA F1/F2/F3.
3. **HEMSActuator:** Applica le strategie: *Max Autoconsumo*, *Storm Defense (Anti-Blackout)* con pre-riserva batterie, *Arbitraggio Notturno* e derating termico delle celle.
4. **ControllableDeviceManager:** Gestisce i carichi (clima, PDC, wallbox auto) con protezioni anti-cycling sul compressore (minimo 90s/180s) e rispetto degli override manuali dell'utente.
5. **Livello di Sicurezza Deterministico (L0 Safety Clamp):** Nessuna proposta dell'Intelligenza Artificiale viene applicata se viola i vincoli fisici di potenza, amperaggio o riserva delle batterie.

---

## 5. Il Fattore Umano: La Simbiosi Centauro

Uno dei messaggi fondamentali è che **l'Intelligenza Artificiale, da sola, non avrebbe mai potuto creare né ottimizzare questo sistema**. 

Mancano infatti il colpo d'occhio fisico e il buon senso dell'impiantista:
* È stato l'occhio umano a notare il sole splendente e a sbloccare il *paradosso del deficit* dell'MPPT chiedendosi *"Perché non siamo ad isola?"*.
* È stato lo sguardo critico a smascherare i grafici di simulazione e pretendere la verità dei dati SQLite reali.
* È stata l'esperienza dell'utente a spiegare all'algoritmo i ritmi circadiani di comfort della casa (preraffrescamento della zona giorno di giorno, silenzio e risparmio nelle camere di notte).

Questo è il vero modello del **Centauro Tecnico**: l'essere umano che fornisce la visione strategica, il contesto e il giudizio critico; l'IA e il codice deterministico che eseguono calcoli continui e manovre istantanee 24/7.

---

## 6. Il Salto Quantico: IASolar OS v2.0 & Layer 3 ML (Settembre 2026)

Con la crescita dell'impianto e l'aggiunta di carichi critici (pompa di calore, Wallbox Tuya a 32A, VMC e accumulo differenziato), abbiamo affrontato un refactoring radicale per trasformare il sistema in un'architettura **enterprise di grado industriale**:

1. **Scomposizione in 3 Microservizi Systemd (`solar-core`, `solar-planner`, `solar-web`)**:
   - Isolamento dei processi: se il pianificatore orario o l'interfaccia web si riavviano, il controllo hardware in tempo reale non subisce nemmeno un millisecondo di ritardo o jitter.
   - Comunicazione ultra-rapida tramite broker **MQTT Mosquitto locale** (`127.0.0.1:1883`) e bus di eventi asincrono.
2. **Baseload Learner (Closed-Loop Machine Learning)**:
   - Sostituito il carico statico ipotizzato con un algoritmo che analizza le letture orarie SQLite degli ultimi 30 giorni, separando automaticamente i profili feriali (486W medi) da quelli festivi (539W medi) con mediana al 20% anti-outlier. Il solver MILP 48h pianifica ora su dati reali.
3. **Gemello Digitale Involucro & Rendimenti**:
   - Modello termodinamico $1R-1C$ che sfrutta le ore di coasting passivo a split spenti per calcolare la costante inerziale della villa ($\tau \approx 51.0\text{ ore}$), monitorando costantemente l'efficienza di accumulo ($\eta_{\text{LUNA}} \approx 92\%$, $\eta_{\text{Humsi}} \approx 88\%$).
4. **Motore Decisionale System 1 Jev-like (<1 ms)**:
   - One-Pass Option Scorer a 128 dimensioni in esecuzione come osservatore silenzioso (*Shadow Mode*) ogni 30 secondi: calcola il ranking vettoriale probabilistico delle strategie di gestione in soli **0.24 millisecondi**, senza costi di token né latenze di rete.
5. **Audit di Produzione & Disaster Recovery**:
   - Risoluzione completa di 35 vulnerabilità e colli di bottiglia (P0-P3) con certificazione su **164/164 test unitari automatizzati continui**.
   - Backup a caldo SQLite con compressione del **94.8%** (da 153 MB a 8 MB) e timer systemd notturno programmato per le 03:30.
