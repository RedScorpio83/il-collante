---
title: "HEMS Bi-Inverter & Centrale Solare 25 kWp con Copilota IA"
description: "Orchestrazione locale predittiva di 25.05 kWp fotovoltaico e 36 kWh di accumulo LiFePO4 unendo inverter Huawei (Grid-tied) e Datouboss (Off-grid) con AI su Proxmox."
pubDate: 2026-08-30
technologies: ["Proxmox VE (LXC)", "Modbus-TCP", "Voltronic PI30", "MQTT Mosquitto", "Python 3.11", "HiGHS MILP", "Jev-like AI", "React 18", "Tailwind CSS", "SQLite WAL", "PostgreSQL"]
status: "active"
featured: true
githubUrl: "https://github.com/alessandrocaliciotti"
---

## Il Contesto & La Sfida Ingegneristica

Gestire una centrale energetica residenziale complessa composta da:
- **25.05 kWp di fotovoltaico:** 14 kWp su tetto (Sud-Est e Sud-Ovest) + 11.05 kWp su pergola bifacciale.
- **36 kWh di batterie LiFePO4:** 20 kWh ad alto voltaggio (Huawei LUNA2000) e 16 kWh a 48V (HumsiENK 16S).
- **Due inverter concettualmente incompatibili:** un inverter trifase on-grid Huawei SUN2000-10KTL-M1 e un inverter monofase off-grid a isola Datouboss DT4811B (11 kW).

Il problema principale: le piattaforme commerciali non sono progettate per far dialogare apparati di marchi differenti, i dati cloud hanno latenze di minuti e i protocolli ufficiali dei costruttori spesso sono blindati o cloud-only.

## L'Architettura Implementata

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

### Ostacoli Superati sul Campo

1. **Ground Loop & Isolamento Galvanico:** Il disaccoppiamento tra il potenziale di terra di rete e il negativo delle batterie a 48V ha causato la vaporizzazione iniziale di un cavo seriale per correnti di massa vaganti. Risolto integrando un circuito optoisolato galvanico industriale.
2. **Reverse-Engineering & Hacking della Chiavetta Wi-Fi:** La chiavetta ufficiale inviava pacchetti a server esteri con ritardi mostruosi e vietava comandi locali. È stata dissaldata e riprogrammata con firmware custom per esporre un socket TCP raw (`socket://192.168.10.132:8888`) a 2400 baud, portando il campionamento a 2 secondi con latenza <5 ms.
3. **Doppio Protocollo Locale con Validazione CRC16:** Driver Modbus-TCP ad alta frequenza per Huawei e parser Voltronic PI30 con verifica matematica rigorosa del CRC16 a 2 byte per Datouboss.
4. **Copilota IA su Proxmox:** Modulo di supervisione e ottimizzazione neuro-simbolica che incrocia le previsioni meteo satellitari Solcast + DWD ICON-D2 con la curva di carico per anticipare o ritardare l'avvio delle pompe di calore e la ricarica degli accumulatori.

---

## La Nuova Architettura IASolar OS v2.0 (Microservizi & Layer 3 ML)

A settembre 2026 l'intero sistema è stato evoluto in un'architettura enterprise a **3 microservizi disaccoppiati** in esecuzione su Proxmox VE LXC CT 110:
- **`solar-core.service`**: Polling hardware ad alta frequenza (Huawei Modbus + Datouboss seriale), FSM di sicurezza a 4 stadi, calcolo del bilanciamento istantaneo e attuazione deterministica protetta da watchdog hardware.
- **`solar-planner.service`**: Ottimizzatore globale convesso **HiGHS MILP 48h**, interpolazione meteo satellitare, risoluzione prezzi PUN/ARERA e briefing vocale proattivo (VOX-01).
- **`solar-web.service`**: API REST FastAPI/Flask e SPA reattiva React 18 con streaming real-time SSE e bus MQTT Mosquitto.

### I 4 Pilastri di Intelligenza & Resilienza

1. **Baseload Learner (ML Closed-Loop)**: Algoritmo di regressione continua su SQLite (`hourly_stats` a 30 giorni) che clusterizza separatamente le curve di consumo orario feriali e festive con mediana al 20% anti-outlier, alimentando il solver MILP con la domanda reale e non con stime statiche.
2. **Digital Twin Termodinamico Involucro & Batterie**: Modello termico $1R-1C$ calibrato sulle sessioni di coasting passivo della villa ($\frac{dT_{in}}{dt} = \frac{1}{\tau} (T_{oda} - T_{in})$) che stima una costante inerziale reale $\tau \approx 51.0\text{ ore}$ per l'edificio di Lariano e monitora l'efficienza di accumulo ($\eta_{\text{LUNA}} \approx 92\%$, $\eta_{\text{Humsi}} \approx 88\%$).
3. **Decision Engine System 1 Jev-like (<1 ms)**: One-Pass Option Scorer a 128 dimensioni operante in **Shadow Mode** ogni 30 secondi con latenza di soli **0.24 millisecondi**, fornendo il ranking probabilistico in tempo reale delle strategie ottimali di autoconsumo, volano e travaso.
4. **NILM Engine Fine-Tuning & Disaster Recovery**: Disaggregazione dei carichi senza sensori con filtro di soppressione rumore inverter ($\pm 45\text{W}$) e debounce anti-flapping (45s). Hot-backup atomico SQLite WAL giornaliero compresso del **94.8%** (da 153 MB a 8 MB) sincronizzato via SFTP su host Proxmox con timer systemd notturno alle 03:30.

## Risultati Operativi

- Autoconsumo reale superiore al 92% annuo.
- Protezione totale da blackout tramite commutazione istantanea off-grid UPS (<15ms).
- Zero allucinazioni: vincoli fisici immutabili (Physical Safety Envelope) e test suite continua a **164/164 test verdi (100%)**.
- Totale sovranità sui dati: nessuna dipendenza da cloud esterni.

## Changelog / Diario di Bordo

- **[20/09/2026] Release IASolar OS v2.0 & 4 Pilastri Evolutivi**:
  - Audit completo di produzione risolto al 100% (P0, P1, P2, P3: 35/35 remediation).
  - Rilascio del Baseload Learner ML e del Gemello Digitale Involucro/Batterie ($\tau = 51\text{h}$).
  - Attivazione in produzione del motore decisionale System 1 Jev-like in Shadow Mode (latenza 0.24ms).
  - Deploy timer notturno systemd `solar-backup.timer` e validazione 164/164 test unitari.
- **[20/09/2026] Configurazione Regola Globale Antigravity**: Attivato il tracciamento e aggiornamento continuo dei progressi sul blog e portfolio.
