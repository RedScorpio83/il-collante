---
title: "Come ho reso smart la mia VMC industriale con ESP32 e calcolo entalpico"
description: "Reverse engineering di una Fantini Cosmi AP19802: 4 sonde di temperatura, controllo a relè dal surplus solare e freecooling notturno basato sulla qualità dell'aria."
pubDate: 2026-08-30
tags: ["esp32", "iot", "vmc", "hardware-hacking", "hems", "home-assistant"]
---

Le unità di Ventilazione Meccanica Controllata (VMC) centralizzate sono macchine eccellenti per il ricambio d'aria e il recupero di calore negli edifici moderni, ma dal punto di vista dell'integrazione domotica sono spesso rimaste all'età della pietra: interruttori meccanici a parete a tre posizioni, nessun feedback sui rendimenti reali e nessuna capacità di dialogare con un impianto fotovoltaico o con i sensori di qualità dell'aria.

In questa guida documentiamo il reverse engineering completo di un'unità **Fantini Cosmi / Aspira ASPIRLIGHT BP (AP19802)**, come l'abbiamo interfacciata con un **ESP32** e come oggi collabora in tempo reale con il nostro HEMS per sfruttare il surplus solare e rinfrescare la casa a costo zero.

---

## 1. La Macchina & L'Obiettivo del Progetto

La Fantini Cosmi AP19802 è un'unità a doppio flusso fino a 210 m³/h, dotata di scambiatore in controcorrente e serranda motorizzata di by-pass per il freecooling. 

Di serie, l'unico controllo era un selettore a manopola. Volevamo trasformarla in un nodo attivo dell'ecosistema energetico domestico con queste capacità:
1. **Velocità 3 Boost Automatica:** Aumentare il ricambio d'aria al massimo quando c'è surplus solare sui pannelli fotovoltaici.
2. **Free-Cooling Notturno Intelligente:** Aprire la serranda di by-pass quando l'aria esterna estiva è termodinamicamente favorevole (calcolo dell'entalpia per evitare umidità afosa).
3. **Misura del Rendimento Termico Reale (%):** Monitorare l'efficienza reale dello scambiatore con 4 sonde digitali nei condotti dell'aria.
4. **Protezione Qualità dell'Aria:** Ridurre la ventilazione o avvisare in caso di fumo o polveri sottili elevate all'esterno (sensore laser PM2.5 / PM10).

---

## 2. Reverse Engineering del Connettore Docking

Ispezionando la morsettiera di alimentazione della macchina abbiamo mappato la logica elettrica di commutazione a 230V:

```text
               ┌──────────────────────────────────────────────┐
               │    Morsettiera VMC Fantini Cosmi AP19802     │
               └──────┬──────────────┬──────────────┬─────────┘
                      │ V1 (Minimo)  │ V2 (Medio)   │ V3 (Boost)
                      ▼              ▼              ▼
               ┌─────────────┐┌─────────────┐┌─────────────┐
               │   Relè 1    ││   Relè 2    ││   Relè 3    │  Modulo Relè Optoisolato
               └──────┬──────┘└──────┬──────┘└──────┬──────┘
                      └──────────────┼──────────────┘
                                     │ GPIO 3.3V
                      ┌──────────────▼──────────────┐
                      │      ESP32 DevKit V1        │  (Firmware C++ / OTA)
                      └──────────────▲──────────────┘
                                     │ Bus 1-Wire (GPIO 4)
                      ┌──────────────┴──────────────┐
                      │ 4x Sonde DS18B20 nei Tubi   │
                      │ • Aria Esterna (T_ext)      │
                      │ • Aria Immissione (T_imm)   │
                      │ • Aria Ripresa (T_rip)      │
                      │ • Aria Espulsione (T_esp)   │
                      └─────────────────────────────┘
```

Per scongiurare cortocircuiti o alimentazioni contemporanee di due velocità diverse, la logica firmware garantisce l'**esclusione reciproca software e hardware**: prima di attivare un relè, tutti gli altri vengono spenti con un tempo di dwell di sicurezza di 100 millisecondi.

---

## 3. La Termodinamica: Calcolo del Rendimento dello Scambiatore

Installando 4 sonde impermeabili digitali **DS18B20** direttamente all'interno dei quattro rami dei condotti d'aria, l'ESP32 calcola ogni 10 secondi il rendimento reale del recuperatore di calore:

$$\eta_{\text{rec}} = \frac{T_{\text{immissione}} - T_{\text{esterno}}}{T_{\text{ripresa}} - T_{\text{esterno}}} \times 100$$

Nelle giornate invernali fredde con $T_{\text{esterno}} = 4\text{ °C}$ e aria interna a 21 °C, lo scambiatore immette aria preriscaldata a oltre 18,5 °C, certificando un'efficienza sul campo costantemente compresa tra l'**86% e l'89%**.

---

## 4. Integrazione con Home Assistant e Solar Hub

L'ESP32 trasmette tutte le letture via **MQTT** con discovery automatico su Home Assistant:
* Interruttore a tre velocità con slider percentuale.
* Sensore di rendimento termico.
* Switch per forzare la modalità By-Pass / Freecooling.
* Diagnostica di stato e log degli errori.

Grazie a questa modifica a basso costo (un ESP32 da 5€, una scheda a 4 relè e 4 sonde di temperatura), un apparato industriale chiuso e manuale è diventato uno dei componenti chiave dell'efficienza energetica della nostra casa.
