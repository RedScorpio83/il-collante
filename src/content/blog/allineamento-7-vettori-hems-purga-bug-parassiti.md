---
title: "Coordinare 7 vettori energetici senza impazzire: come ho eliminato i bug parassiti del mio HEMS"
description: "Travasi parassiti tra batterie, RID hardcodato e segni invertiti nel solutore: anatomia di 5 bug reali e la formalizzazione psicrometrica Magnus-Tetens per l'entalpia estiva."
pubDate: 2026-09-22
tags: ["hems", "fotovoltaico", "ottimizzazione", "milp", "termodinamica", "psicrometria"]
---

Quando un sistema di gestione dell'energia domestica cresce fino a coordinare **7 vettori fisici differenti** — fotovoltaico di falda, pergola bifacciale, batterie ad alto voltaggio, accumulo a 48V, auto elettrica, climatizzazione e ricambio d'aria VMC — la complessità non è più una questione di programmazione: diventa pura fisica.

Se non mantieni una coerenza matematica assoluta, il software inizia a farsi la guerra da solo: batterie che si scaricano a vicenda in loop infiniti, climatizzatori che partono nel momento sbagliato e ventilazioni notturne che immettono umidità peggiorando il calore percepito.

In questo post-mortem tecnico analizziamo **5 bug subdoli e parassiti scovati nel nostro HEMS**, come li abbiamo eliminati e la formalizzazione psicrometrica che oggi governa l'intero impianto con **176/176 test unitari passati**.

---

## 1. I 5 Bug Parassiti che Mangiavano Efficienza

### Bug 1: Il "Travaso Parassita" tra Inverter (Perdita del 25%)
Il nostro impianto ha due banchi batteria: un accumulo ad alto voltaggio **Huawei LUNA2000** (connesso all'inverter di rete) e un banco a 48V **HumsiENK** (connesso all'inverter a isola Datouboss). 
Nelle ore pomeridiane abbiamo notato un'anomalia termica: Datouboss erogava 2.0 kW in AC mentre Huawei li assorbiva per caricare la propria batteria. 
**Risultato:** l'energia faceva un doppio salto di conversione (DC 48V → AC 230V → DC 400V) con una dispersione in calore superiore al **25%**. Abbiamo bloccato tassativamente qualsiasi travaso non espressamente autorizzato dal solver economico.

### Bug 2: Il Prezzo del Ritiro Dedicato (RID) Bloccato a 0.08 €/kWh
Nel codice di arbitraggio, il valore di vendita dell'energia immessa in rete era impostato come costante fissa a `0.08`. Nei picchi serali e nelle ore estive il prezzo reale zonale PUN supera spesso gli 0.14-0.16 €/kWh: il sistema considerava conveniente immagazzinare energia inefficiente nelle batterie anziché immetterla sul mercato alle tariffe massime.

### Bug 3: Il Taglio Arbitrario al 70% del Surplus dell'Auto Elettrica
Per timore di sbalzi di rete, un vecchio algoritmo applicava un clamp prudenziale che limitava la ricarica dell'auto al 70% del surplus solare disponibile. L'auto caricava lentamente e il restante 30% veniva ceduto in rete a basso valore. Abbiamo sostituito la soglia fissa con il *Master Battery Gate*: se le batterie di casa hanno già garantita la riserva notturna, l'auto prende il **100% esatto del surplus**.

### Bug 4: L'Inversione del Segno Termico nel Solver HiGHS MILP
Nel modello termico di riscaldamento invernale, una maggiore potenza elettrica alla pompa di calore produce un delta termico positivo (+ΔT). Durante il passaggio al raffrescamento estivo, la formula non invertiva il coefficiente energetico: il solver matematico pensava che accendere il climatizzatore *aumentasse* la temperatura interna della villa, bloccando il raffrescamento proattivo!

### Bug 5: Il Freecooling "Cieco" senza Entalpia
Nelle serate estive, la VMC veniva attivata alla massima velocità appena la temperatura esterna scendeva sotto quella interna (es. $T_{\text{ext}} = 24\text{ °C}$ e $T_{\text{in}} = 26\text{ °C}$). 
Sembrava logico, ma all'interno della casa si formava una cappa afosa insopportabile: l'aria esterna era sì più fresca di 2 gradi, ma con un'umidità relativa del 90%, portando in casa una quantità enorme di calore latente!

---

## 2. La Soluzione Termodinamica: La Psicrometria di Magnus-Tetens

Per risolvere definitivamente il problema della ventilazione e del comfort estivo, abbiamo integrato nel backend di Solar Hub il calcolo dell'**Entalpia Specifica** dell'aria ($h$, misurata in $\text{kJ/kg}$), che quantifica l'energia termica totale tenendo conto sia della temperatura che dell'umidità:

1. **Pressione di vapore saturo** $e_s(T)$ (formula di Magnus-Tetens, in $\text{hPa}$):
$$e_s(T) = 6.112 \cdot \exp\left(\frac{17.67 \cdot T}{T + 243.5}\right)$$

2. **Umidità specifica** $x$ (in $\text{kg}_{\text{vapore}} / \text{kg}_{\text{aria secca}}$):
$$x = 0.622 \cdot \frac{\text{RH} \cdot e_s}{P_{\text{atm}} - (\text{RH} \cdot e_s)}$$

3. **Entalpia specifica totale** $h$ (in $\text{kJ/kg}$):
$$h = c_{pa} \cdot T + x \cdot (r_0 + c_{pv} \cdot T)$$

Dove le costanti termodinamiche di riferimento sono:
* **$c_{pa} = 1{,}006 \text{ kJ/(kg}\cdot\text{K)}$**: calore specifico dell'aria secca a pressione costante.
* **$r_0 = 2501 \text{ kJ/kg}$**: calore latente di evaporazione dell'acqua a 0 °C.
* **$c_{pv} = 1{,}86 \text{ kJ/(kg}\cdot\text{K)}$**: calore specifico del vapore acqueo.
* **$P_{\text{atm}} = 1013{,}25 \text{ hPa}$**: pressione atmosferica standard.
* **$\text{RH}$**: umidità relativa frazionaria (da 0.0 a 1.0).

### La Nuova Regola del Freecooling:
La ventilazione notturna si attiva in modalità raffrescamento passivo **soltanto se l'entalpia specifica esterna è nettamente inferiore a quella interna**:

$$h_{\text{ext}} < h_{\text{in}} - \Delta h_{\text{margin}}$$

In questo modo il sistema impedisce l'ingresso di aria umida estiva anche se il termometro esterno segna qualche grado in meno, evitando di vanificare il lavoro svolto dai climatizzatori durante il giorno.

---

## 3. Risultati Operativi e Test Suite

Dopo aver applicato queste correzioni architetturali:
* **Zero dispersioni parassite:** nessun flusso anomalo tra i due banchi batteria.
* **Resa della ricarica EV raddoppiata:** assorbimento dinamico fino a 16A senza prelievi imprevisti dalla rete ENEL.
* **176/176 Test Unitari Verdi:** la suite automatizzata in Python (`pytest`) verifica ad ogni build l'invarianza delle formule fisiche, la convergenza del solver HiGHS e la sicurezza degli attuatori.
