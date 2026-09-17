# Publication / commitment

Za záväznú verziu žrebovania sa považuje konkrétny Git commit verejne oznámený **pred vznikom cieľového drand roundu 32315212**.

GitHub Pages workflow:

1. checkoutne presný commit,
2. overí hash `entries.txt`, draw configu, draw enginu, drand klienta a build-input balíka,
3. obnoví vizuálne assety, lockfile a veľké prezentačné vrstvy z hashovo uzamknutého ZIPu,
4. zostaví aplikáciu zo zdrojov tohto commitu,
5. vloží `build-info.json` s `GITHUB_SHA`,
6. nasadí tento artifact na GitHub Pages.

Zmena `main` po žrebovaní nemení historický commit. Pre audit sa preto používa commit SHA oznámený pred žrebovaním, nie neurčitý odkaz na aktuálny `main`.
