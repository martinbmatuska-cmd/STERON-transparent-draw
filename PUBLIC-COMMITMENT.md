# STERON transparent draw — public pre-draw commitment

This repository is the public, auditable commitment for STERON draw `steron-2026-09`.

The binding reference for the draw is the **exact Git commit containing this file and the Pages workflow**. Its full commit SHA must be announced publicly before Quicknet round `32315212` exists.

## Current release

- release: `v1.0.4`
- protocol: `STERON-DRAW-v1`
- draw time: `2026-09-18T16:30:00.000Z` = `18. 9. 2026 18:30 SELČ`
- drand network: League of Entropy mainnet Quicknet
- target round: `32315212`
- Quicknet chain hash: `52db9ba70e0cc0f6eaf7803dd07447a1f5477735fd3f661792ba94600c84e971`
- canonical entries: `ST-01` through `ST-24`
- `entries.txt` SHA-256: `48e458a0033c67ed19d0c0dc2ef79aa2d1db47db4a0ba21d0dc0e4d40a174185`
- draw engine SHA-256: `7c6f575d070a6ea130a3c5b0d7c7bc90dc26a36f5d379c0297b157d8330657c1`
- drand client SHA-256: `f796df5810d149fa1b65c67d17530d7507d30e5fc3ed95efddd41abaa319ca33`
- locked build-input bundle: `STERON-BUILD-INPUTS-v1.0.4.zip`
- locked build-input bundle SHA-256: `89ff5be957c041796dc327fa1250ea3e9b645c3a04359422d13b783c048a8cc8`

The commit that first added the v1.0.4 build-input archive is:

`f61c71eb524e8368bafbfa6c49558fb9d2df5263`

## v1.0.4 scope

v1.0.4 supersedes the earlier v1.0.3 Pages presentation before the target round. It is a presentation-only hotfix:

- higher-quality 1280×720 desktop/landscape hero video,
- landscape CTA repositioning so it does not cover the character's head.

The draw-critical inputs and code were not changed. In particular, the `entries.txt`, draw engine, drand client, target round, chain hash and draw time remain fixed by the hashes and values above.

## Deployment proof

`.github/workflows/pages.yml`:

1. checks out the exact triggering commit;
2. verifies the locked SHA-256 values before build;
3. verifies the allowlisted contents of the build-input ZIP;
4. restores only the locked presentation assets/layers and lockfile;
5. uses `npm ci` and builds the application;
6. writes `dist/build-info.json` with the exact `GITHUB_SHA`, release version, hashes and target round;
7. writes `dist/DEPLOYED-FILES.sha256`;
8. deploys that artifact to GitHub Pages.

The Pages application therefore exposes the commit from which it was built. A later change to `main` does not alter the historical committed source or the pre-draw commitment.

## Result selection

The site does not use a human-triggered random draw and does not fall back to another round. It accepts only Quicknet round `32315212`, verifies the beacon cryptographically, binds that randomness to the canonical entries hash and protocol, and deterministically produces one full permutation of all 24 codes.

If required integrity checks fail, the application fails closed and does not display a winner.

Full normative details are in `ALGORITHM.md`.
