# STERON — transparentné žrebovanie

Verejne auditovateľný zdroj žrebovania STERON naplánovaného na **18. 9. 2026 o 18:30 SELČ (16:30 UTC)**.

## Verejne uzamknuté parametre

- platné vstupy: `ST-01` až `ST-24`
- `entries.txt` SHA-256: `48e458a0033c67ed19d0c0dc2ef79aa2d1db47db4a0ba21d0dc0e4d40a174185`
- drand: Quicknet
- Quicknet chain hash: `52db9ba70e0cc0f6eaf7803dd07447a1f5477735fd3f661792ba94600c84e971`
- cieľový round: `32315212`
- protokol: `STERON-DRAW-v1`
- draw engine SHA-256: `7c6f575d070a6ea130a3c5b0d7c7bc90dc26a36f5d379c0297b157d8330657c1`
- drand klient SHA-256: `f796df5810d149fa1b65c67d17530d7507d30e5fc3ed95efddd41abaa319ca33`

Stránka nemá tlačidlo, ktoré by vyberalo nový výsledok. Po dosiahnutí času čaká výhradne na vopred určený round `32315212`. Iný round ani lokálna náhoda sa nepoužijú.

Výsledkom algoritmu je deterministické poradie všetkých 24 kódov. Prvý je výherca, ďalší sú náhradníci.

Podrobný formát seedu, SHA-256 stream a Fisher–Yates s rejection samplingom sú v [ALGORITHM.md](ALGORITHM.md).

## Dôkaz nasadeného kódu

Finálny GitHub Pages build bude vytvorený automaticky z konkrétneho verejného Git commitu. Workflow pred buildom kontroluje uzamknuté hashe a odmietne build pri nesúlade. Nasadená stránka obsahuje `build-info.json` s presným commit SHA, hashom vstupov, hashom draw enginu a roundom.

Vizuálne binárne assety, presný `package-lock.json` a dve veľké prezentačné vrstvy (`src/styles.css`, `src/steron-draw.js`) sú uložené v `STERON-BUILD-INPUTS-v1.0.3.zip`; workflow kontroluje SHA-256 celého balíka pred jeho použitím. Draw-critical súbory `src/draw-engine.js`, `src/drand-client.js`, `entries.txt` a draw config sú priamo čitateľné v repozitári a workflow ich pred buildom samostatne hashovo kontroluje. Vizuálne assety ani prezentačné vrstvy nevstupujú do výpočtu výsledku.

## Licencia

Zdroj je verejne dostupný primárne na audit transparentnosti žrebovania. Pozri [LICENSE-STATUS.md](LICENSE-STATUS.md). Vizuálne assety nie sú udeľované na ďalšie použitie.
