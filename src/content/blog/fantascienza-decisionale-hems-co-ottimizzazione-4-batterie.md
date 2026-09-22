---
title: "Fantascienza Decisionale nel Nostro HEMS: Co-Ottimizzazione Predittiva tra Auto Elettrica, Clima e 4 Batterie"
description: "Come abbiamo insegnato alla nostra centrale solare bi-inverter a non temere le nuvole: cannibalizzazione calcolata delle batterie (E_free), inerzia termica a 65 ore, efficienza reale OBC della Dacia Spring e previsioni Solcast ad anello chiuso."
pubDate: 2026-09-22
tags: ["hems", "fotovoltaico", "ev-charging", "termodinamica", "bess", "machine-learning", "proxmox"]
---

C'è un momento preciso, quando sviluppi un sistema di automazione energetica per la tua casa, in cui la semplice logica reattiva non basta più. 

La logica reattiva è quella che usano quasi tutti i sistemi commerciali sul mercato:
* *C'è il sole e il contatore immette 2.0 kW in rete?* $\to$ Accendi la pompa di calore o fai partire la ricarica dell'auto elettrica.
* *Passa una nuvola per 5 minuti e l'immissione si azzera?* $\to$ Spegni tutto all'istante, stacca il compressore, azzera la Wallbox a 0A.
* *Torna il sole?* $\to$ Riavvia tutto.

Se avete un'auto elettrica o una pompa di calore, sapete esattamente cosa succede: la Wallbox si blocca o riparte da zero, i contattori meccanici sbattono continuamente e il compressore dell'aria condizionata subisce uno stress termico e meccanico devastante.

Ma la cosa ancora più assurda è questa: **nella nostra centrale solare abbiamo 36 kWh di batterie stazionarie LiFePO4** (20 kWh ad alto voltaggio della Huawei LUNA2000 sul tetto da 14 kWp + 16 kWh a 48V dell'inverter Datouboss sulla pergola da 11 kWp). 

Se abbiamo decine di chilowattora stipati nelle batterie, perché trattare una nuvola passeggera o una giornata variabile come un'emergenza da blackout? Perché non permettere al sistema di "cannibalizzare" un po' di carica dalle batterie stazionarie per mantenere viva la ricarica dell'auto o preriscaldare la casa, **sapendo già matematicamente se e quando il sole pomeridiano ripristinerà quell'energia prima del tramonto?**

È nata così quella che scherzosamente abbiamo chiamato **"Fantascienza Decisionale"**: trasformare il nostro HEMS in un cervello predittivo a circuito chiuso. Ecco come lo abbiamo progettato, i colli di bottiglia fisici scoperti sul campo e come funziona oggi in produzione sul nostro nodo Proxmox VE (LXC CT 110).

---

## 1. I Due Bug Architetturali Che Bloccavano Tutto

Prima di poter implementare qualsiasi algoritmo predittivo, abbiamo dovuto fare i conti con la realtà del codice. Un'ispezione chirurgica del backend ha rivelato due problemi strutturali che rendevano impossibile la cooperazione:

### Bug 1: La Direttiva "Fantasma" del Solutore MILP
Il nostro pianificatore orario su Proxmox esegue ogni 60 minuti un'ottimizzazione matematica globale (MILP con solutore HiGHS) che incrocia le curve di irraggiamento solare Solcast a 48 ore con i prezzi orari PUN dell'energia. Il piano calcolava la potenza ideale per il comfort termico (`thermal_w`), ma... **il messaggio MQTT veniva scartato dal router dei comandi e il dominio termico non lo riceveva affatto**. Il volano termico dell'edificio era di fatto sordo alle previsioni del giorno dopo.

### Bug 2: La Guerra Cieca per il Surplus (Overbooking da 3.8 kW)
Quando a mezzogiorno si liberava un surplus solare di 2.5 kW al contatore, sia il modulo dell'auto elettrica che quello dei climatizzatori leggevano contemporaneamente l'intero valore. Risultato?
* La Wallbox Tuya impostava 10A (~2.3 kW).
* I climatizzatori avviavano il compressore (~1.5 kW).
* **Totale richiesto: 3.8 kW**, a fronte dei 2.5 kW disponibili!
La casa finiva istantaneamente per prelevare 1.3 kW dalla rete Enel o scaricare a tradimento le batterie, facendo scattare le protezioni anti-crossfeed e azzerando la ricarica. Un classico problema di *concorrenza non coordinata*.

### La Cura: Il Water-Filling Budget Allocator
Abbiamo riscritto l'arbitraggio centralizzato in `DeviceManager`:
$$P_{\text{ev\_budget}} + P_{\text{th\_budget}} \le P_{\text{avail\_surplus}} + P_{\text{bess\_boost}}$$

Ora un unico arbitro valuta i contratti energetici:
1. Se l'auto ha una partenza imminente o la batteria è sotto il 50%, l'EV ha priorità assoluta.
2. Se il piano MILP ha individuato una finestra pomeridiana ad altissima efficienza o la casa è fuori comfort, la climatizzazione prende i suoi 1.5 kW e il residuo esatto va all'auto.
3. Se il surplus supera i 2.8 kW, entrambi i vettori modulano contemporaneamente in perfetta armonia, con **zero prelievi dalla rete**.

---

## 2. Il Modello $E_{\text{free}}$: Quanta Batteria Possiamo Sacrificare?

"Cannibalizzare" la batteria di casa per caricare l'auto o riscaldare le stanze è un'idea brillante solo se non ti lascia al buio alle due di notte. 

Per formalizzare questo concetto, abbiamo creato il modello deterministico in tempo reale di **$E_{\text{free}}$** (Energia Libera Sacrificabile):

```text
┌────────────────────────────────────────────────────────┐
│  ENERGIA TOTALE NEI BESS: 36.0 kWh Max                 │
│  (LUNA2000 HV 20 kWh + HumsiENK LV 16 kWh)             │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
 ┌──────────────────────────────────────────────────────┐
 │ [-] Fabbisogno Notturno Casa (P_baseline x ore_buio) │
 └──────────────────────────┬───────────────────────────┘
                            │
                            ▼
 ┌──────────────────────────────────────────────────────┐
 │ [-] Riserva Anti-Blackout (Humsi 20% + LUNA 15%)     │
 └──────────────────────────┬───────────────────────────┘
                            │
                            ▼
 ┌──────────────────────────────────────────────────────┐
 │ [+] Contrazione Riserva se Solcast Domani >= 35 kWh  │
 └──────────────────────────┬───────────────────────────┘
                            │
                            ▼
                 ═════════════════════════
                   E_free (Energia Libera)
                 ═════════════════════════
                   │                   │
                   ▼                   ▼
           Se E_free >= 2.5 kWh   Se E_free >= 1.2 kWh
           [Abilita EV Boost]     [Abilita Clima Boost]
```

La formula matematica:
$$E_{\text{free}} = \max\left(0, \, E_{\text{stored}} - E_{\text{night\_need}} - E_{\text{reserve}}\right)$$

Se le batterie stazionarie hanno 30 kWh e la casa la notte ne consumerà al massimo 5 kWh con una riserva di emergenza di 6 kWh, abbiamo **19 kWh di $E_{\text{free}}$**. Bloccare la ricarica dell'auto solo perché una nuvola oscura il sole per venti minuti sarebbe un'assurdità ingegneristica!

---

## 3. La Sorpresa dell'OBC: Perché Non Bisogna Caricare a 6A

Quando si collega un'auto elettrica (nel nostro caso una Dacia Spring da 26.8 kWh) a una presa domestica o a una Wallbox, l'auto deve convertire la corrente alternata (AC) della casa in continua (DC) per la batteria chimica tramite il caricatore di bordo (**OBC**, *On-Board Charger*).

Molti pensano che l'auto assorba energia come una stufetta elettrica: se le dai 1.38 kW (6A monofase), lei immagazzina 1.38 kW. **Falso.**

A bordo dell'auto ci sono ausiliari fissi sempre attivi durante la carica:
* Il computer di bordo (ECU) e il display del cruscotto.
* La pompa di circolazione del liquido refrigerante della batteria.
* Il circuito di controllo del BMS.

Questi ausiliari assorbono una potenza fissa parassita tra i **150 W e i 250 W costanti**. 

Se caricate l'auto a **6A (1380 W)**:
* 250 W se ne vanno per tenere accesa l'auto.
* Altri 120 W si perdono per il calore dei semiconduttori del convertitore AC/DC.
* Alla batteria arrivano a malapena 1000 W. **La resa è di appena il 73%!**

Se quell'energia la state prendendo dalle batterie di casa (che già hanno subito una perdita chimica del 15% nel ciclo di carica/scarica), l'efficienza complessiva crolla al:
$$\eta_{\text{tot}} = 0.85 \times 0.73 \approx 62\%$$
State letteralmente buttando via quasi il 40% dell'energia in calore!

Abbiamo quindi implementato la **curva di efficienza dinamica dell'OBC** nel modulo di surplus:
* **6A (1.38 kW):** Efficienza $73\%$.
* **10A (2.30 kW):** Efficienza $79\%$.
* **16A (3.68 kW):** Efficienza $84\%$.
* **32A (7.36 kW):** Efficienza $>87\%$.

**La decisione dell'HEMS:** quando si decide di cannibalizzare la batteria stazionaria con $E_{\text{free}}$, il sistema **evita i 6A** e spinge preferenzialmente a **$\ge 10\text{A}-16\text{A}$**, dove l'OBC lavora al massimo della sua resa termodinamica.

---

## 4. La Matrice di Saturazione a 4 Batterie

A questo punto avevamo un quadro chiaro: in casa non abbiamo "una batteria e dei carichi", ma **4 serbatoi di accumulo energetico interconnessi**:

| Vettore | Capacità / Dimensione | Monitoraggio Hardware | Obiettivo di Saturazione |
| :--- | :--- | :--- | :--- |
| **1. Huawei LUNA2000** | 20.0 kWh (LiFePO4 HV) | Modbus TCP (Porta 6607) | 100% (o cut-off hardware 90%) entro il tramonto |
| **2. Datouboss HumsiENK** | 16.0 kWh (LiFePO4 48V) | Seriale RS232 PI30 | Raggiungimento soglia Float (54.0V) senza clipping solare |
| **3. EV Dacia Spring** | 26.8 kWh (Trazione) | Tuya Local DPS + HA | Target SoC desiderato prima dell'orario di partenza |
| **4. Volano Termico Casa** | $\tau = 65\text{h}$, $H_{\text{tr}} = 84.6\text{W/K}$ | Submetering PZEM Ch2 + Sensori HA | Accumulo termico nelle pareti sfruttando ore ad alto COP |

Il nuovo modulo `MultiBatterySaturationTracker` calcola in tempo reale il tempo a saturazione $t_{\text{full}}$ per tutti e 4 i vettori.

### L'Inerzia della Casa: Una Batteria Termica da 65 Ore
La nostra calibrazione sperimentale dell'edificio ha dimostrato che la casa ha una costante di tempo termica di **$\tau = 65.0\text{ ore}$** e una trasmittanza globale di $H_{\text{tr}} = 84.6\text{ W/K}$.
Significa che se spegnete il riscaldamento o l'aria condizionata durante un transitorio nuvoloso di 30 minuti, la temperatura interna cala (o sale) di meno di **$0.04^\circ\text{C}$**!

Allo stesso tempo, il coefficiente di prestazione ($COP$) della nostra pompa di calore (monitorata dal canale submetering dedicato PZEM Ch2) varia con la temperatura esterna:
* In inverno a $2^\circ\text{C}$ di notte: $COP \approx 2.7$.
* Nel primo pomeriggio a $15^\circ\text{C}$: $COP > 4.2$.

Sfruttare $E_{\text{free}}$ della batteria alle due del pomeriggio per saturare il volano termico delle pareti al doppio dell'efficienza è mille volte più intelligente che scaldare la casa di notte a basso COP.

---

## 5. La Garanzia Matematica: Solcast Solar Recovery Margin

Resta un'ultima domanda cruciale: *come fa il sistema a sapere con certezza se può svuotare 5 kWh di batteria nell'auto a mezzogiorno senza rimpiangerlo la sera?*

Semplice: **con il margine di recupero solare.**
L'algoritmo integra la produzione solare residua prevista dai satelliti meteo di Solcast da adesso fino al tramonto:
$$E_{\text{pv\_remaining}} = \int_{t_{\text{now}}}^{t_{\text{sunset}}} P_{\text{solcast}}(t) \, dt$$

E la confronta con l'energia necessaria per riempire al 100% le due batterie stazionarie:
$$E_{\text{deficit\_bess}} = E_{\text{mancante\_luna}} + E_{\text{mancante\_humsi}}$$

### La Regola Aurea:
$$E_{\text{pv\_remaining}} \ge 1.2 \times E_{\text{deficit\_bess}}$$

Se il sole residuo atteso copre il deficit delle batterie con un **margine di sicurezza del 20%**, scatta il flag:
`is_solar_recovery_guaranteed = True`

Il motore decisionale AI System 1 (Jev-like Scorer a sub-millisecondo) riceve il segnale e attiva senza esitazione la macro-strategia:
`STRATEGY_PREDICTIVE_BESS_CANNIBALIZATION_EV`

L'auto carica a piena potenza, la nuvola passa inosservata grazie al cuscinetto BESS e alle 17:30 entrambe le batterie di casa sono regolarmente al 100%.

---

## 6. Risultati dal Campo su Proxmox CT 110

Tutto questo non è rimasto su un foglio di calcolo. È stato interamente tradotto in codice Python modulare, integrato nei tre demoni systemd (`core_daemon`, `planner_daemon`, `web_daemon`) e verificato con **206 test unitari deterministici**:

```text
Ran 206 tests in 40.361s
OK (failures=0, errors=0)
```

Sul nostro container Proxmox CT 110 (`solar-hub`), il log live di `solar-core` testimonia la nuova sinfonia:
```text
[INFO] SolarCoreDaemon: Starting Solar Core Daemon loop...
[INFO] Domain.BuildingEnvelope: Historical thermodynamic calibration SUCCESSFUL: Tau=65.0h, H_tr=84.6W/K
[INFO] TuyaEVCharger: Polled DPS: {'3': 'charger_free', '4': 6, '14': 'charge_now', '27': 'online'}
[INFO] HEMSActuator: AI Auto-Adaptive Resolver: Selected 'SUMMER_AUTONOMY'
[INFO] HEMSActuator: Inverter Relays ACK: POP01, MUCHGC002, PCP02 (Only Solar)
[INFO] DeviceManager: [HEMS Arbitration] Proposta emessa da 'thermal' (23.0°C rispetto al setpoint)
[INFO] DeviceManager: [HEMS Arbitration] Proposta emessa da 'ev' (Fabbisogno deficit 0.8 kWh)
```

Niente più ricariche a singhiozzo. Niente più scatti parassiti della rete. Niente più energia solare sprecata a basso rendimento. 

Quando la fisica dell'edificio, l'elettronica di potenza degli inverter e l'Intelligenza Artificiale decisionale si incontrano su una solida architettura locale, la casa smette di essere un semplice consumatore passivo: diventa una vera e propria **micro-centrale energetica autonoma e predittiva**.
