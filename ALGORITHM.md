# STERON-DRAW-v1 — technická špecifikácia

Táto špecifikácia je normatívna pre žrebovanie `steron-2026-09`.

## 1. Kanonické vstupy

`entries.txt` je presná sekvencia bajtov:

- kódovanie UTF-8 bez BOM,
- riadky oddelené jediným bajtom LF (`0A`), nikdy CRLF,
- jeden kód na riadok,
- žiadne medzery ani prázdne riadky,
- súbor končí presne jedným LF,
- presné poradie `ST-01` až `ST-24`.

Súbor má 144 bajtov a 24 riadkov. Záväzok:

```text
SHA-256(entries.txt exact bytes)
= 48e458a0033c67ed19d0c0dc2ef79aa2d1db47db4a0ba21d0dc0e4d40a174185
```

Hex hodnoty v protokole sú lowercase ASCII bez prefixu `0x`.

## 2. Pevný drand round

Sieť je League of Entropy mainnet Quicknet:

```text
chain hash: 52db9ba70e0cc0f6eaf7803dd07447a1f5477735fd3f661792ba94600c84e971
round:      32315212
period:     3 seconds
genesis:    1692803367 Unix seconds
scheme:     bls-unchained-g1-rfc9380
```

Timestamp roundu sa počíta:

```text
roundTime = genesis + (round - 1) × period
          = 2026-09-18T16:30:00.000Z
```

Klient musí odmietnuť odpoveď, ak sa round, chain hash, group hash, verejný kľúč, genesis, perióda, podpisová schéma alebo beacon ID nezhodujú. `latest` je zakázané.

Randomness je prijatá iba po tom, čo oficiálny drand klient overí BLS podpis a vzťah medzi podpisom a randomness. Výmena relaya nemení sieť ani round.

## 3. Seed material

Po overení beaconu sa vytvorí presný UTF-8 reťazec:

```text
STERON-DRAW-v1\n
<entriesHashHex>\n
<chainHashHex>\n
32315212\n
<drandRandomnessHex>
```

Zápis vyššie používa `\n` iba na zobrazenie bajtu LF. Medzi piatimi riadkami sú presne štyri LF. **Za posledným znakom randomness nie je newline.** Žiadne pole nemá prefix, label, medzeru ani CR.

Formálne:

```text
seedMaterialBytes = UTF8(
  "STERON-DRAW-v1" || LF ||
  entriesHashHex   || LF ||
  chainHashHex     || LF ||
  decimalRound     || LF ||
  randomnessHex
)

finalSeed = SHA-256(seedMaterialBytes)  // 32 raw bytes
```

## 4. Deterministický SHA-256 byte stream

Counter `c` je nezáporné 64-bitové celé číslo začínajúce nulou. `uint64be(c)` je jeho presná 8-bajtová big-endian reprezentácia.

```text
block(c) = SHA-256(finalSeed || uint64be(c))
```

Bloky `block(0)`, `block(1)`, … sa spájajú. Čítajú sa po štyroch bajtoch ako unsigned big-endian `uint32`. V jednom 32-bajtovom bloku je preto osem hodnôt.

## 5. Rejection sampling bez modulo bias

Pre požadovaný rozsah `n` (`1 ≤ n ≤ 24`):

```text
M     = 2^32
limit = floor(M / n) × n

opakuj:
  x = ďalší uint32 zo streamu
kým x >= limit

výstup = x mod n
```

Hodnoty v neúplnom konci rozsahu `uint32` sa zahodia. Každý výsledok `0 … n-1` preto zodpovedá presne rovnakému počtu akceptovaných hodnôt `x`.

## 6. Fisher–Yates

Začína sa presnou kópiou kanonického poradia 24 kódov.

```text
for i from 23 down to 1:
  j = rejectionSample(i + 1)  // 0 ≤ j ≤ i
  swap(order[i], order[j])
```

- `order[0]` je výherný kód,
- `order[1]` je 1. náhradník,
- `order[2]` je 2. náhradník,
- …,
- `order[23]` je 23. náhradník.

Nevolá sa `Math.random()`, `crypto.getRandomValues()`, žiadny backend ani čas prehliadača.

## 7. Referenčný test vector (nie reálne žrebovanie)

Nasledujúci vector existuje iba na regresné testy:

```text
mock randomness:
000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f

final seed:
8a6e2339ff449112c0df216c6b25ce3b0e3caa7ab2db6033e7ca198b936befa0

order:
ST-07, ST-16, ST-05, ST-09, ST-22, ST-20,
ST-13, ST-01, ST-17, ST-19, ST-12, ST-18,
ST-03, ST-06, ST-04, ST-14, ST-11, ST-15,
ST-10, ST-21, ST-08, ST-02, ST-23, ST-24
```

Tento vector neobsahuje randomness roundu 32315212 a nesmie byť prezentovaný ako výsledok súťaže.

## 8. Fail-closed pravidlá

Výherca sa nezobrazí, ak:

- hash presných bajtov `entries.txt` nesedí,
- konfigurácia nesedí s lokálnym záväzkom,
- čas a round sa matematicky nezhodujú,
- relay vráti iný round alebo inú sieť,
- randomness/signature nemajú kanonický formát,
- BLS podpis alebo väzba randomness na podpis zlyhá,
- výsledné poradie nie je úplná permutácia 24 vstupov.

HTTP výpadok nie je dôvod na iný výpočet. Aplikácia iba čaká a opakuje rovnaký round cez iný povolený relay.

## 9. Verejný záväzok a reprodukovateľnosť

Hash v tomto projekte dokáže preukázať zhodu s konkrétnymi bajtmi, ale sám fyzicky nezabráni vlastníkovi hostingu súbor vymeniť. Nezávislá časová auditovateľnosť preto vyžaduje, aby bol pred vznikom roundu 32315212 verejne a nemenne identifikovaný aspoň:

- presný `entries.txt` a jeho SHA-256,
- tento protokol a implementácia algoritmu,
- draw config a pripnuté Quicknet parametre,
- distribuovaný bundle a jeho checksumy,
- konkrétna verejná verzia zdroja/release manifestu.

Beacon targetu sa po jeho vzniku kontroluje ako post-deployment smoke už zverejneného systému. Ak taký záväzok pred beacon časom neexistuje, tento round sa nesmie spätne prezentovať ako vopred nezávisle uzamknutý; musí sa verejne určiť nový budúci termín a round.

Lokálny release v1.0.3 bol pred publikovaním označený ako `unpublished-local`; verejný záväzok vzniká až konkrétnym verejným Git commitom oznámeným pred cieľovým roundom.
