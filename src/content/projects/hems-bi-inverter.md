---
title: "SolarDashboard & HEMS Bi-Inverter: Centrale Solare 25 kWp con Copilota IA"
description: "Piattaforma di supervisione SCADA e orchestrazione predittiva locale per 25.05 kWp di fotovoltaico e 36 kWh di batterie LiFePO4: driver Modbus/PI30, SSOT a microservizi, solutore HiGHS MILP e cockpit reattivo."
pubDate: 2026-08-30
technologies: ["Proxmox VE (LXC)", "Python 3.11", "Modbus-TCP", "Voltronic PI30 (RS232)", "HiGHS MILP Solver", "React 18", "SSE Streaming", "MQTT Mosquitto", "SQLite WAL", "Docker", "ESP32-P4"]
status: "active"
featured: true
githubUrl: "https://github.com/RedScorpio83"
---

![Dashboard Solare: Sinottico Flussi Real-Time](/images/projects/dashboard-solare/screen_0_sinottico.png)

## Il Contesto Fisico: Unire Due Inverter Incompatibili

Gestire la produzione e i consumi di un'abitazione con grande capacità energetica presenta una sfida enorme se gli apparati provengono da produttori con filosofie differenti:
* **25.05 kWp di campo solare:** 14.0 kWp su falda tetto principale (Sud-Est e Sud-Ovest) + 11.05 kWp su pergola fotovoltaica bifacciale.
* **36.0 kWh di accumulo LiFePO4:** 20.0 kWh ad alto voltaggio (doppia torre Huawei LUNA2000 HV) e 16.0 kWh a bassa tensione 48V (banco HumsiENK 16S).
* **Due inverter concettualmente divergenti:**
  1. **Huawei SUN2000-10KTL-M1 (Trifase On-Grid):** Connesso alla rete Enel e allo Smart Meter DTSU666-H. Lavora con altissima efficienza (95%) e dialoga via porta di rete con protocollo **Modbus-TCP** (porta 6607).
  2. **Datouboss DT4811B 11 kW (Monofase Off-Grid):** Alimentato in AC-IN dall'uscita di Huawei e dotato di un canale inverter a isola pura che eroga energia a tutto il quadro di casa garantendo commutazione UPS istantanea (<15ms) in caso di blackout. Comunica via porta seriale RS232 a 2400 baud con protocollo **Voltronic PI30**.

Nessun software commerciale al mondo è in grado di far cooperare queste due macchine. Senza un'orchestrazione software centralizzata, i due inverter entrerebbero in conflitto costante, ricaricando le batterie a vicenda o prelevando dalla rete a pagamento.

---

![Schema SCADA Unifilare Centrale](/images/projects/dashboard-solare/scada_unifilar_diagram.png)

## L'Architettura Software: Single Source of Truth (SSOT)

Per garantire la massima sicurezza elettrica e scongiurare corruzioni di configurazione causate da accessi concorrenti, la **SolarDashboard** e il motore **Solar Hub v4.0** sono strutturati attorno al principio del **Single Source of Truth (SSOT)**:

```text
┌────────────────────────────────────────────────────────┐
│             1. Ingestione Hardware Eterogenea          │
│   • Huawei Modbus-TCP (192.168.200.1:6607)             │
│   • Datouboss Seriale RS232 / PI30 (2400 baud CRC-16)  │
│   • Wallbox EV Tuya Local (192.168.10.231)             │
│   • Clima & VMC Fantini Cosmi (Sensori PM2.5, T_oda)   │
│   • Previsioni Satellitari Solcast + Prezzi GME PUN    │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│             2. Single Source of Truth (SSOT)           │
│   • ConfigManager: Lock kernel fcntl + scrittura atomica│
│   • SystemStateHub: Normalizzazione fisica in memoria  │
│   • Physical Safety Envelope: Vincoli termoelettrici   │
└───────────────┬────────────────────────┬───────────────┘
                │                        │
                ▼                        ▼
┌──────────────────────────┐  ┌──────────────────────────┐
│  solar-planner.service   │  │    solar-web.service     │
│  • HiGHS MILP 48h Solver │  │  • Real-Time SSE Stream  │
│  • Co-Ottimizzazione EV  │  │  • React 18 SPA Cockpit  │
└──────────────────────────┘  └──────────────────────────┘
```

1. **`ConfigManager` Autorativo:** Garantisce scritture atomiche su file system (`os.replace`) con locking a livello di kernel Linux (`fcntl.flock`) per eliminare ogni rischio di corruzione JSON in caso di riavvio improvviso.
2. **`SystemStateHub`:** Riceve e normalizza tutti i canali hardware eterogenei, calcola lo stato della **batteria combinata reale (36 kWh)**, applica il safe-zero defaulting per le letture che diventano stale e distribuisce snapshot immutabili agli altri microservizi con latenza inferiore a 1 millisecondo.
3. **Physical Safety Envelope:** Involucro di protezione invalicabile dal software che impone limiti fisici invalicabili su correnti massime, temperature delle celle e soglie di scarica profonda.

---

## Snippet di Codice: Calcolo CRC16 e Driver Seriale PI30

Il protocollo seriale Datouboss PI30 impiega un checksum ciclico proprietario a 2 byte per convalidare ogni comando e ogni stringa di telemetria. Ecco la funzione ottimizzata in `core/datouboss_driver.py`:

```python
def calc_crc(cmd: bytes) -> bytes:
    """
    Calcola il checksum CRC-16 per i frame del protocollo Voltronic PI30.
    I caratteri speciali di controllo (CR, LF, '(') vengono traslati di 1 byte.
    """
    crc = 0
    for b in cmd:
        crc = ((crc << 8) | (crc >> 8)) & 0xFFFF
        crc ^= b
        crc ^= (crc & 0xFF) >> 4
        crc ^= (crc << 12) & 0xFFFF
        crc ^= ((crc & 0xFF) << 5) & 0xFFFF
    crc &= 0xFFFF
    
    b1 = (crc >> 8) & 0xFF
    b2 = crc & 0xFF
    
    # Escape dei caratteri riservati di framing PI30
    if b1 in (0x0A, 0x0D, 0x28): 
        b1 += 1
    if b2 in (0x0A, 0x0D, 0x28): 
        b2 += 1
        
    return bytes([b1, b2])
```

---

![Mobilità Elettrica & Allocazione Dinamica Carica EV](/images/projects/dashboard-solare/screen_1_mobilita_ev.png)

## Ottimizzazione Globale HiGHS MILP & Co-Ottimizzazione EV

A differenza dei semplici relè a soglia, la SolarDashboard incorpora un pianificatore matematico orario ad anello chiuso basato su programmazione lineare a variabili intere miste (**MILP** con solutore open source **HiGHS**):

* **Water-Filling Budget Allocator:** Bilancia istante per istante il surplus solare tra la ricarica dell'auto elettrica e le pompe di calore:
  $$P_{\text{ev\_budget}} + P_{\text{th\_budget}} \le P_{\text{avail\_surplus}} + P_{\text{bess\_boost}}$$
* **Cannibalizzazione Predittiva:** Se il solutore sa con certezza statistica (previsioni Solcast) che il sole del primo pomeriggio genererà oltre 30 kWh, autorizza l'auto a prelevare energia dalle batterie stazionarie al mattino presto, garantendo che le batterie tornino comunque al 100% prima del tramonto.
* **Modello Inerziale dell'Edificio:** Modello termodinamico $1R-1C$ con costante di tempo $\tau \approx 51\text{h}$ per preriscaldare la casa nelle ore a PUN basso o surplus elevato, trasformando la massa muraria in un accumulatore termico gratuito.

![Planner HiGHS MILP 48h con Solcast](/images/projects/dashboard-solare/screen_3_planner.png)

---

## Cockpit Fisico ESP32-P4 & Risultati sul Campo

* **Cockpit Touch Dedicato:** Oltre alla Web UI accessibile da smartphone e PC, il sistema invia stream JPEG compressi via rete locale a un display touch da banco basato sul nuovo microcontrollore **ESP32-P4** con interfaccia grafica vettoriale LVGL.
* **Autoconsumo Reale:** Superiore al **92% su base annua**, con autosufficienza energetica quasi totale da marzo a ottobre.
* **Resilienza Totale:** Oltre 160 test unitari continui eseguiti ad ogni aggiornamento e hot-backup atomico notturno compresso su host Proxmox ZFS.
