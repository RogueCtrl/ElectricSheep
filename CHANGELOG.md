# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [1.6.1](https://github.com/RogueCtrl/OpenClawDreams/compare/v1.2.2...v1.6.1) (2026-03-08)


### Features

* dream pipeline v1.3 — workspace diff context, groundDream(), and notification fallback ([#58](https://github.com/RogueCtrl/OpenClawDreams/issues/58)) ([c683fb6](https://github.com/RogueCtrl/OpenClawDreams/commit/c683fb6fa2ce96e5c0e88e9c671e832aa44be69a))
* insight continuity — thread explored territory into dream/reflect prompts ([#65](https://github.com/RogueCtrl/OpenClawDreams/issues/65)) ([c7bdee1](https://github.com/RogueCtrl/OpenClawDreams/commit/c7bdee151e908e2c10d541a245f846e0ecb91706))
* nightmare cycle — 5% chance + forced CLI command ([#64](https://github.com/RogueCtrl/OpenClawDreams/issues/64)) ([50c261c](https://github.com/RogueCtrl/OpenClawDreams/commit/50c261c2dbfa86e4dfede669a51b0deb60666136))
* reflect --dry-run — print synthesis output without storing ([#73](https://github.com/RogueCtrl/OpenClawDreams/issues/73)) ([ed5acd5](https://github.com/RogueCtrl/OpenClawDreams/commit/ed5acd5a4b07d1fbcfcd0d6c24dddb64171f65d7))
* rich MemoryEntry types + fix idempotencyKey for OpenClaw v2026.3.7 ([b4424c1](https://github.com/RogueCtrl/OpenClawDreams/commit/b4424c1855686f939503d81e01de04dfed00821e))


### Bug Fixes

* DST-safe scheduler with catch-up window ([#54](https://github.com/RogueCtrl/OpenClawDreams/issues/54)) ([230a943](https://github.com/RogueCtrl/OpenClawDreams/commit/230a9436eadf4e374595a772d2b2de3ee910b6f6))
* make NIGHTMARE_CHANCE configurable to eliminate dreamer test flakiness ([8682ef8](https://github.com/RogueCtrl/OpenClawDreams/commit/8682ef86cb3647dd6490918360d73e54633570e3))
* prettier formatting — cli.ts and index.ts ([#52](https://github.com/RogueCtrl/OpenClawDreams/issues/52)) ([93df3d8](https://github.com/RogueCtrl/OpenClawDreams/commit/93df3d8e44a62ae79135eef765604786815d4f91))
* resolve MoltbookClient credentials from stable fallback path when DATA_DIR unset (fixes [#70](https://github.com/RogueCtrl/OpenClawDreams/issues/70)) ([48d3019](https://github.com/RogueCtrl/OpenClawDreams/commit/48d30191faa457a5dca9171816844758dfd7844a))
* run tests sequentially to prevent env var race condition ([#67](https://github.com/RogueCtrl/OpenClawDreams/issues/67)) ([22f0002](https://github.com/RogueCtrl/OpenClawDreams/commit/22f00022b4224422fa7fe0cd1b9c8dde6f8c5b2c))
* run tests with --test-isolation=process to prevent ESM module cache contamination between test files ([f53a222](https://github.com/RogueCtrl/OpenClawDreams/commit/f53a222a31588d4477bd034cc3764b1011801993))
* skip workspace diff on iCloud/sensitive paths; add workspaceDiffEnabled config ([dfe6b51](https://github.com/RogueCtrl/OpenClawDreams/commit/dfe6b51ac0ded5ba4ee9609089053cddb774221c))


### Documentation

* remove roadmap from README and ROADMAP.md (tracked externally) ([9e8620d](https://github.com/RogueCtrl/OpenClawDreams/commit/9e8620dcc2e9bb176cef624a5c7bdfae026d2ced))
* update AGENTS.md and README for v1.3.0 — workspace diffs, groundDream(), notification fallback ([0a5b19a](https://github.com/RogueCtrl/OpenClawDreams/commit/0a5b19ab4a7a1e84b59ad5e4216be4b335eb767f))

## [1.6.0](https://github.com/RogueCtrl/OpenClawDreams/compare/v1.2.2...v1.6.0) (2026-03-08)


### Features

* dream pipeline v1.3 — workspace diff context, groundDream(), and notification fallback ([#58](https://github.com/RogueCtrl/OpenClawDreams/issues/58)) ([c683fb6](https://github.com/RogueCtrl/OpenClawDreams/commit/c683fb6fa2ce96e5c0e88e9c671e832aa44be69a))
* insight continuity — thread explored territory into dream/reflect prompts ([#65](https://github.com/RogueCtrl/OpenClawDreams/issues/65)) ([c7bdee1](https://github.com/RogueCtrl/OpenClawDreams/commit/c7bdee151e908e2c10d541a245f846e0ecb91706))
* nightmare cycle — 5% chance + forced CLI command ([#64](https://github.com/RogueCtrl/OpenClawDreams/issues/64)) ([50c261c](https://github.com/RogueCtrl/OpenClawDreams/commit/50c261c2dbfa86e4dfede669a51b0deb60666136))
* reflect --dry-run — print synthesis output without storing ([#73](https://github.com/RogueCtrl/OpenClawDreams/issues/73)) ([ed5acd5](https://github.com/RogueCtrl/OpenClawDreams/commit/ed5acd5a4b07d1fbcfcd0d6c24dddb64171f65d7))


### Bug Fixes

* DST-safe scheduler with catch-up window ([#54](https://github.com/RogueCtrl/OpenClawDreams/issues/54)) ([230a943](https://github.com/RogueCtrl/OpenClawDreams/commit/230a9436eadf4e374595a772d2b2de3ee910b6f6))
* prettier formatting — cli.ts and index.ts ([#52](https://github.com/RogueCtrl/OpenClawDreams/issues/52)) ([93df3d8](https://github.com/RogueCtrl/OpenClawDreams/commit/93df3d8e44a62ae79135eef765604786815d4f91))
* resolve MoltbookClient credentials from stable fallback path when DATA_DIR unset (fixes [#70](https://github.com/RogueCtrl/OpenClawDreams/issues/70)) ([48d3019](https://github.com/RogueCtrl/OpenClawDreams/commit/48d30191faa457a5dca9171816844758dfd7844a))
* run tests sequentially to prevent env var race condition ([#67](https://github.com/RogueCtrl/OpenClawDreams/issues/67)) ([22f0002](https://github.com/RogueCtrl/OpenClawDreams/commit/22f00022b4224422fa7fe0cd1b9c8dde6f8c5b2c))
* run tests with --test-isolation=process to prevent ESM module cache contamination between test files ([f53a222](https://github.com/RogueCtrl/OpenClawDreams/commit/f53a222a31588d4477bd034cc3764b1011801993))
* skip workspace diff on iCloud/sensitive paths; add workspaceDiffEnabled config ([dfe6b51](https://github.com/RogueCtrl/OpenClawDreams/commit/dfe6b51ac0ded5ba4ee9609089053cddb774221c))


### Documentation

* remove roadmap from README and ROADMAP.md (tracked externally) ([9e8620d](https://github.com/RogueCtrl/OpenClawDreams/commit/9e8620dcc2e9bb176cef624a5c7bdfae026d2ced))
* update AGENTS.md and README for v1.3.0 — workspace diffs, groundDream(), notification fallback ([0a5b19a](https://github.com/RogueCtrl/OpenClawDreams/commit/0a5b19ab4a7a1e84b59ad5e4216be4b335eb767f))

### [1.5.1](https://github.com/RogueCtrl/OpenClawDreams/compare/v1.2.2...v1.5.1) (2026-03-08)


### Features

* dream pipeline v1.3 — workspace diff context, groundDream(), and notification fallback ([#58](https://github.com/RogueCtrl/OpenClawDreams/issues/58)) ([c683fb6](https://github.com/RogueCtrl/OpenClawDreams/commit/c683fb6fa2ce96e5c0e88e9c671e832aa44be69a))
* insight continuity — thread explored territory into dream/reflect prompts ([#65](https://github.com/RogueCtrl/OpenClawDreams/issues/65)) ([c7bdee1](https://github.com/RogueCtrl/OpenClawDreams/commit/c7bdee151e908e2c10d541a245f846e0ecb91706))
* nightmare cycle — 5% chance + forced CLI command ([#64](https://github.com/RogueCtrl/OpenClawDreams/issues/64)) ([50c261c](https://github.com/RogueCtrl/OpenClawDreams/commit/50c261c2dbfa86e4dfede669a51b0deb60666136))


### Bug Fixes

* DST-safe scheduler with catch-up window ([#54](https://github.com/RogueCtrl/OpenClawDreams/issues/54)) ([230a943](https://github.com/RogueCtrl/OpenClawDreams/commit/230a9436eadf4e374595a772d2b2de3ee910b6f6))
* prettier formatting — cli.ts and index.ts ([#52](https://github.com/RogueCtrl/OpenClawDreams/issues/52)) ([93df3d8](https://github.com/RogueCtrl/OpenClawDreams/commit/93df3d8e44a62ae79135eef765604786815d4f91))
* resolve MoltbookClient credentials from stable fallback path when DATA_DIR unset (fixes [#70](https://github.com/RogueCtrl/OpenClawDreams/issues/70)) ([48d3019](https://github.com/RogueCtrl/OpenClawDreams/commit/48d30191faa457a5dca9171816844758dfd7844a))
* run tests sequentially to prevent env var race condition ([#67](https://github.com/RogueCtrl/OpenClawDreams/issues/67)) ([22f0002](https://github.com/RogueCtrl/OpenClawDreams/commit/22f00022b4224422fa7fe0cd1b9c8dde6f8c5b2c))
* run tests with --test-isolation=process to prevent ESM module cache contamination between test files ([f53a222](https://github.com/RogueCtrl/OpenClawDreams/commit/f53a222a31588d4477bd034cc3764b1011801993))
* skip workspace diff on iCloud/sensitive paths; add workspaceDiffEnabled config ([dfe6b51](https://github.com/RogueCtrl/OpenClawDreams/commit/dfe6b51ac0ded5ba4ee9609089053cddb774221c))


### Documentation

* remove roadmap from README and ROADMAP.md (tracked externally) ([9e8620d](https://github.com/RogueCtrl/OpenClawDreams/commit/9e8620dcc2e9bb176cef624a5c7bdfae026d2ced))
* update AGENTS.md and README for v1.3.0 — workspace diffs, groundDream(), notification fallback ([0a5b19a](https://github.com/RogueCtrl/OpenClawDreams/commit/0a5b19ab4a7a1e84b59ad5e4216be4b335eb767f))

## [1.5.0](https://github.com/RogueCtrl/OpenClawDreams/compare/v1.2.2...v1.5.0) (2026-03-08)


### Features

* dream pipeline v1.3 — workspace diff context, groundDream(), and notification fallback ([#58](https://github.com/RogueCtrl/OpenClawDreams/issues/58)) ([c683fb6](https://github.com/RogueCtrl/OpenClawDreams/commit/c683fb6fa2ce96e5c0e88e9c671e832aa44be69a))
* insight continuity — thread explored territory into dream/reflect prompts ([#65](https://github.com/RogueCtrl/OpenClawDreams/issues/65)) ([c7bdee1](https://github.com/RogueCtrl/OpenClawDreams/commit/c7bdee151e908e2c10d541a245f846e0ecb91706))
* nightmare cycle — 5% chance + forced CLI command ([#64](https://github.com/RogueCtrl/OpenClawDreams/issues/64)) ([50c261c](https://github.com/RogueCtrl/OpenClawDreams/commit/50c261c2dbfa86e4dfede669a51b0deb60666136))


### Bug Fixes

* DST-safe scheduler with catch-up window ([#54](https://github.com/RogueCtrl/OpenClawDreams/issues/54)) ([230a943](https://github.com/RogueCtrl/OpenClawDreams/commit/230a9436eadf4e374595a772d2b2de3ee910b6f6))
* prettier formatting — cli.ts and index.ts ([#52](https://github.com/RogueCtrl/OpenClawDreams/issues/52)) ([93df3d8](https://github.com/RogueCtrl/OpenClawDreams/commit/93df3d8e44a62ae79135eef765604786815d4f91))
* run tests sequentially to prevent env var race condition ([#67](https://github.com/RogueCtrl/OpenClawDreams/issues/67)) ([22f0002](https://github.com/RogueCtrl/OpenClawDreams/commit/22f00022b4224422fa7fe0cd1b9c8dde6f8c5b2c))
* skip workspace diff on iCloud/sensitive paths; add workspaceDiffEnabled config ([dfe6b51](https://github.com/RogueCtrl/OpenClawDreams/commit/dfe6b51ac0ded5ba4ee9609089053cddb774221c))


### Documentation

* remove roadmap from README and ROADMAP.md (tracked externally) ([9e8620d](https://github.com/RogueCtrl/OpenClawDreams/commit/9e8620dcc2e9bb176cef624a5c7bdfae026d2ced))
* update AGENTS.md and README for v1.3.0 — workspace diffs, groundDream(), notification fallback ([0a5b19a](https://github.com/RogueCtrl/OpenClawDreams/commit/0a5b19ab4a7a1e84b59ad5e4216be4b335eb767f))

### [1.4.1](https://github.com/RogueCtrl/OpenClawDreams/compare/v1.2.2...v1.4.1) (2026-03-08)


### Features

* dream pipeline v1.3 — workspace diff context, groundDream(), and notification fallback ([#58](https://github.com/RogueCtrl/OpenClawDreams/issues/58)) ([c683fb6](https://github.com/RogueCtrl/OpenClawDreams/commit/c683fb6fa2ce96e5c0e88e9c671e832aa44be69a))
* nightmare cycle — 5% chance + forced CLI command ([#64](https://github.com/RogueCtrl/OpenClawDreams/issues/64)) ([50c261c](https://github.com/RogueCtrl/OpenClawDreams/commit/50c261c2dbfa86e4dfede669a51b0deb60666136))


### Bug Fixes

* DST-safe scheduler with catch-up window ([#54](https://github.com/RogueCtrl/OpenClawDreams/issues/54)) ([230a943](https://github.com/RogueCtrl/OpenClawDreams/commit/230a9436eadf4e374595a772d2b2de3ee910b6f6))
* prettier formatting — cli.ts and index.ts ([#52](https://github.com/RogueCtrl/OpenClawDreams/issues/52)) ([93df3d8](https://github.com/RogueCtrl/OpenClawDreams/commit/93df3d8e44a62ae79135eef765604786815d4f91))
* run tests sequentially to prevent env var race condition ([#67](https://github.com/RogueCtrl/OpenClawDreams/issues/67)) ([22f0002](https://github.com/RogueCtrl/OpenClawDreams/commit/22f00022b4224422fa7fe0cd1b9c8dde6f8c5b2c))
* skip workspace diff on iCloud/sensitive paths; add workspaceDiffEnabled config ([dfe6b51](https://github.com/RogueCtrl/OpenClawDreams/commit/dfe6b51ac0ded5ba4ee9609089053cddb774221c))


### Documentation

* remove roadmap from README and ROADMAP.md (tracked externally) ([9e8620d](https://github.com/RogueCtrl/OpenClawDreams/commit/9e8620dcc2e9bb176cef624a5c7bdfae026d2ced))
* update AGENTS.md and README for v1.3.0 — workspace diffs, groundDream(), notification fallback ([0a5b19a](https://github.com/RogueCtrl/OpenClawDreams/commit/0a5b19ab4a7a1e84b59ad5e4216be4b335eb767f))

## [1.4.0](https://github.com/RogueCtrl/OpenClawDreams/compare/v1.2.2...v1.4.0) (2026-03-08)


### Features

* dream pipeline v1.3 — workspace diff context, groundDream(), and notification fallback ([#58](https://github.com/RogueCtrl/OpenClawDreams/issues/58)) ([c683fb6](https://github.com/RogueCtrl/OpenClawDreams/commit/c683fb6fa2ce96e5c0e88e9c671e832aa44be69a))
* nightmare cycle — 5% chance + forced CLI command ([#64](https://github.com/RogueCtrl/OpenClawDreams/issues/64)) ([50c261c](https://github.com/RogueCtrl/OpenClawDreams/commit/50c261c2dbfa86e4dfede669a51b0deb60666136))


### Bug Fixes

* DST-safe scheduler with catch-up window ([#54](https://github.com/RogueCtrl/OpenClawDreams/issues/54)) ([230a943](https://github.com/RogueCtrl/OpenClawDreams/commit/230a9436eadf4e374595a772d2b2de3ee910b6f6))
* prettier formatting — cli.ts and index.ts ([#52](https://github.com/RogueCtrl/OpenClawDreams/issues/52)) ([93df3d8](https://github.com/RogueCtrl/OpenClawDreams/commit/93df3d8e44a62ae79135eef765604786815d4f91))
* skip workspace diff on iCloud/sensitive paths; add workspaceDiffEnabled config ([dfe6b51](https://github.com/RogueCtrl/OpenClawDreams/commit/dfe6b51ac0ded5ba4ee9609089053cddb774221c))


### Documentation

* remove roadmap from README and ROADMAP.md (tracked externally) ([9e8620d](https://github.com/RogueCtrl/OpenClawDreams/commit/9e8620dcc2e9bb176cef624a5c7bdfae026d2ced))
* update AGENTS.md and README for v1.3.0 — workspace diffs, groundDream(), notification fallback ([0a5b19a](https://github.com/RogueCtrl/OpenClawDreams/commit/0a5b19ab4a7a1e84b59ad5e4216be4b335eb767f))

### [1.3.4](https://github.com/RogueCtrl/OpenClawDreams/compare/v1.3.3...v1.3.4) (2026-03-08)


### Bug Fixes

* skip workspace diff on iCloud/sensitive paths; add workspaceDiffEnabled config ([dfe6b51](https://github.com/RogueCtrl/OpenClawDreams/commit/dfe6b51ac0ded5ba4ee9609089053cddb774221c))
* add .npmignore to exclude private data and src from npm publish ([044c758](https://github.com/RogueCtrl/OpenClawDreams/commit/044c758))

### [1.3.3](https://github.com/RogueCtrl/OpenClawDreams/compare/v1.3.2...v1.3.3) (2026-03-08)


### Features

* dream pipeline v1.3 — workspace diff context, groundDream(), and notification fallback ([#58](https://github.com/RogueCtrl/OpenClawDreams/issues/58)) ([c683fb6](https://github.com/RogueCtrl/OpenClawDreams/commit/c683fb6fa2ce96e5c0e88e9c671e832aa44be69a))


### Bug Fixes

* DST-safe scheduler with catch-up window ([#54](https://github.com/RogueCtrl/OpenClawDreams/issues/54)) ([230a943](https://github.com/RogueCtrl/OpenClawDreams/commit/230a9436eadf4e374595a772d2b2de3ee910b6f6))
* prettier formatting — cli.ts and index.ts ([#52](https://github.com/RogueCtrl/OpenClawDreams/issues/52)) ([93df3d8](https://github.com/RogueCtrl/OpenClawDreams/commit/93df3d8e44a62ae79135eef765604786815d4f91))
* skip workspace diff on iCloud/sensitive paths; add workspaceDiffEnabled config ([dfe6b51](https://github.com/RogueCtrl/OpenClawDreams/commit/dfe6b51ac0ded5ba4ee9609089053cddb774221c))


### Documentation

* remove roadmap from README and ROADMAP.md (tracked externally) ([9e8620d](https://github.com/RogueCtrl/OpenClawDreams/commit/9e8620dcc2e9bb176cef624a5c7bdfae026d2ced))
* update AGENTS.md and README for v1.3.0 — workspace diffs, groundDream(), notification fallback ([0a5b19a](https://github.com/RogueCtrl/OpenClawDreams/commit/0a5b19ab4a7a1e84b59ad5e4216be4b335eb767f))

### [1.3.2](https://github.com/RogueCtrl/OpenClawDreams/compare/v1.2.2...v1.3.2) (2026-03-08)


### Features

* dream pipeline v1.3 — workspace diff context, groundDream(), and notification fallback ([#58](https://github.com/RogueCtrl/OpenClawDreams/issues/58)) ([c683fb6](https://github.com/RogueCtrl/OpenClawDreams/commit/c683fb6fa2ce96e5c0e88e9c671e832aa44be69a))


### Bug Fixes

* DST-safe scheduler with catch-up window ([#54](https://github.com/RogueCtrl/OpenClawDreams/issues/54)) ([230a943](https://github.com/RogueCtrl/OpenClawDreams/commit/230a9436eadf4e374595a772d2b2de3ee910b6f6))
* prettier formatting — cli.ts and index.ts ([#52](https://github.com/RogueCtrl/OpenClawDreams/issues/52)) ([93df3d8](https://github.com/RogueCtrl/OpenClawDreams/commit/93df3d8e44a62ae79135eef765604786815d4f91))


### Documentation

* remove roadmap from README and ROADMAP.md (tracked externally) ([9e8620d](https://github.com/RogueCtrl/OpenClawDreams/commit/9e8620dcc2e9bb176cef624a5c7bdfae026d2ced))
* update AGENTS.md and README for v1.3.0 — workspace diffs, groundDream(), notification fallback ([0a5b19a](https://github.com/RogueCtrl/OpenClawDreams/commit/0a5b19ab4a7a1e84b59ad5e4216be4b335eb767f))

### [1.3.1](https://github.com/RogueCtrl/OpenClawDreams/compare/v1.2.2...v1.3.1) (2026-03-08)


### Features

* dream pipeline v1.3 — workspace diff context, groundDream(), and notification fallback ([#58](https://github.com/RogueCtrl/OpenClawDreams/issues/58)) ([c683fb6](https://github.com/RogueCtrl/OpenClawDreams/commit/c683fb6fa2ce96e5c0e88e9c671e832aa44be69a))


### Bug Fixes

* DST-safe scheduler with catch-up window ([#54](https://github.com/RogueCtrl/OpenClawDreams/issues/54)) ([230a943](https://github.com/RogueCtrl/OpenClawDreams/commit/230a9436eadf4e374595a772d2b2de3ee910b6f6))
* prettier formatting — cli.ts and index.ts ([#52](https://github.com/RogueCtrl/OpenClawDreams/issues/52)) ([93df3d8](https://github.com/RogueCtrl/OpenClawDreams/commit/93df3d8e44a62ae79135eef765604786815d4f91))


### Documentation

* remove roadmap from README and ROADMAP.md (tracked externally) ([9e8620d](https://github.com/RogueCtrl/OpenClawDreams/commit/9e8620dcc2e9bb176cef624a5c7bdfae026d2ced))

## [1.3.0](https://github.com/RogueCtrl/OpenClawDreams/compare/v1.2.2...v1.3.0) (2026-03-08)


### Features

* dream pipeline v1.3 — workspace diff context, groundDream(), and notification fallback ([#58](https://github.com/RogueCtrl/OpenClawDreams/issues/58)) ([c683fb6](https://github.com/RogueCtrl/OpenClawDreams/commit/c683fb6fa2ce96e5c0e88e9c671e832aa44be69a))


### Bug Fixes

* DST-safe scheduler with catch-up window ([#54](https://github.com/RogueCtrl/OpenClawDreams/issues/54)) ([230a943](https://github.com/RogueCtrl/OpenClawDreams/commit/230a9436eadf4e374595a772d2b2de3ee910b6f6))
* prettier formatting — cli.ts and index.ts ([#52](https://github.com/RogueCtrl/OpenClawDreams/issues/52)) ([93df3d8](https://github.com/RogueCtrl/OpenClawDreams/commit/93df3d8e44a62ae79135eef765604786815d4f91))


### Documentation

* remove roadmap from README and ROADMAP.md (tracked externally) ([9e8620d](https://github.com/RogueCtrl/OpenClawDreams/commit/9e8620dcc2e9bb176cef624a5c7bdfae026d2ced))

### [1.2.4](https://github.com/RogueCtrl/OpenClawDreams/compare/v1.2.2...v1.2.4) (2026-03-08)


### Bug Fixes

* DST-safe scheduler with catch-up window ([#54](https://github.com/RogueCtrl/OpenClawDreams/issues/54)) ([230a943](https://github.com/RogueCtrl/OpenClawDreams/commit/230a9436eadf4e374595a772d2b2de3ee910b6f6))
* prettier formatting — cli.ts and index.ts ([#52](https://github.com/RogueCtrl/OpenClawDreams/issues/52)) ([93df3d8](https://github.com/RogueCtrl/OpenClawDreams/commit/93df3d8e44a62ae79135eef765604786815d4f91))

### [1.2.3](https://github.com/RogueCtrl/OpenClawDreams/compare/v1.2.2...v1.2.3) (2026-03-07)


### Bug Fixes

* prettier formatting — cli.ts and index.ts ([#52](https://github.com/RogueCtrl/OpenClawDreams/issues/52)) ([93df3d8](https://github.com/RogueCtrl/OpenClawDreams/commit/93df3d8e44a62ae79135eef765604786815d4f91))

### [1.2.3](https://github.com/RogueCtrl/OpenClawDreams/compare/v1.2.2...v1.2.3) (2026-03-07)

### Features

* **cli:** add `--dry-run` flag to `post` command ([#7](https://github.com/RogueCtrl/OpenClawDreams/pull/7))
* **config:** add `requireApprovalBeforePost` option (default: `true`) to gate automatic posts ([#7](https://github.com/RogueCtrl/OpenClawDreams/pull/7))
* **config:** add `dreamSubmolt` option (default: `"dreams"`) to configure target submolt ([#7](https://github.com/RogueCtrl/OpenClawDreams/pull/7))
* **scheduler:** implement operator approval gate for morning dream posts via system events ([#7](https://github.com/RogueCtrl/OpenClawDreams/pull/7))

### [1.2.2](https://github.com/RogueCtrl/OpenClawDreams/compare/v1.2.1...v1.2.2) (2026-03-07)

### [1.2.1](https://github.com/RogueCtrl/OpenClawDreams/compare/v1.1.0...v1.2.1) (2026-03-07)


### Features

* runtime-overridable plugin config via applyPluginConfig() ([b89962a](https://github.com/RogueCtrl/OpenClawDreams/commit/b89962ac26298e29fca0cd73d52678950c4b9ddf))


### Documentation

* add day/night cycle screenshots to README ([d4d3cea](https://github.com/RogueCtrl/OpenClawDreams/commit/d4d3ceaa115c26033952e7b736e238fdcb7035e3))
* add ROADMAP.md with multi-modal memory as v2.0 focus ([b208812](https://github.com/RogueCtrl/OpenClawDreams/commit/b208812c25379ebb425b5f6464807eb9175e75b6))

## [1.2.0](https://github.com/RogueCtrl/OpenClawDreams/compare/v1.1.0...v1.2.0) (2026-03-07)


### Features

* runtime-overridable plugin config via applyPluginConfig() ([b89962a](https://github.com/RogueCtrl/OpenClawDreams/commit/b89962ac26298e29fca0cd73d52678950c4b9ddf))


### Documentation

* add day/night cycle screenshots to README ([d4d3cea](https://github.com/RogueCtrl/OpenClawDreams/commit/d4d3ceaa115c26033952e7b736e238fdcb7035e3))
* add ROADMAP.md with multi-modal memory as v2.0 focus ([b208812](https://github.com/RogueCtrl/OpenClawDreams/commit/b208812c25379ebb425b5f6464807eb9175e75b6))

## [1.1.0](https://github.com/RogueCtrl/OpenClawDreams/compare/v1.0.0...v1.1.0) (2026-03-07)


### Features

* add dreamscape footer to dream posts and Moltbook publications ([1dfe299](https://github.com/RogueCtrl/OpenClawDreams/commit/1dfe2990bbea8cfe32d482fe832d761529073bff))

## [1.0.0](https://github.com/RogueCtrl/OpenClawDreams/compare/v0.6.0...v1.0.0) (2026-03-07)


### ⚠ BREAKING CHANGES

* Plugin ID, tool names, gateway methods, service IDs,
CLI binary, and environment variables have all changed from electricsheep
to openclawdreams. Existing cron jobs, scripts, or configs referencing
the old names will need updating.
* Plugin ID, tool names, gateway methods, service IDs,
CLI binary, and environment variables have all changed from electricsheep
to openclawdreams. Existing cron jobs, scripts, or configs referencing
the old names will need updating.
* Plugin ID, tool names, gateway methods, service IDs,
CLI binary, and environment variables have all changed from electricsheep
to openclawdreams. Existing cron jobs, scripts, or configs referencing
the old names will need updating.

### Features

* append attribution footer to all generated dreams ([d89915e](https://github.com/RogueCtrl/OpenClawDreams/commit/d89915e31ebbe5a21df556906453fa9626bfc8a4))
* **cli:** add dream command and extract shared createDirectClient helper ([6032258](https://github.com/RogueCtrl/OpenClawDreams/commit/603225887ff382fa86c6e4b072de9585710bc1c6))
* **cli:** add dream preview summary to post command output ([777c7b0](https://github.com/RogueCtrl/OpenClawDreams/commit/777c7b071795247d088a480a19b2328702a01607))
* **cli:** add post command for manual Moltbook posting ([52dfe78](https://github.com/RogueCtrl/OpenClawDreams/commit/52dfe7879ac946f7d929578bb530fc4cd1ee6632))
* rename internal plugin ID from electricsheep to openclawdreams ([5cc7932](https://github.com/RogueCtrl/OpenClawDreams/commit/5cc7932b6fa245893e322a2ae05257be2c30117f))
* rename internal plugin ID from electricsheep to openclawdreams ([f7e01df](https://github.com/RogueCtrl/OpenClawDreams/commit/f7e01df6313d9023ce53daf078b3e54367403dd2))
* rename internal plugin ID from electricsheep to openclawdreams ([57ed40c](https://github.com/RogueCtrl/OpenClawDreams/commit/57ed40c811395d44e8dc87c27f91607eaff7ba94))


### Bug Fixes

* align plugin id to openclawdreams in openclaw.plugin.json ([2f8eb9b](https://github.com/RogueCtrl/OpenClawDreams/commit/2f8eb9bf41963eed75f90b2d7cbba9c76ce4ca85))
* **cli:** force Moltbook post from CLI by bypassing MOLTBOOK_ENABLED const ([4354bd5](https://github.com/RogueCtrl/OpenClawDreams/commit/4354bd508da47db3e7015e41157fc80b76943517))
* **cli:** use direct Anthropic API for reflect command instead of nonexistent tools call ([016bc48](https://github.com/RogueCtrl/OpenClawDreams/commit/016bc48bfa70f7ffb25565f5988a49c667ebec0a))
* **lint:** replace all any types with proper typed alternatives ([3698cc4](https://github.com/RogueCtrl/OpenClawDreams/commit/3698cc4b4a37594b7efdc6e4dc3f01c1cb8cade1))
* **moltbook:** remove title filter that inflated title, cap at 300 chars ([8d746fc](https://github.com/RogueCtrl/OpenClawDreams/commit/8d746fcd4093cd8a118128f9a877da110670d8e8))
* **openclaw:** upgrade plugin to use subagent runtime for reflection ([027679d](https://github.com/RogueCtrl/OpenClawDreams/commit/027679d3566d3a2d5ff410acc7c4e6459c204fd2))


### Documentation

* Add Claude Code GitHub Workflow ([a5147da](https://github.com/RogueCtrl/OpenClawDreams/commit/a5147daf6fcb9904769db66c4fc8b955dfe9f9cd))
* update CLI section with reflect, dream, status commands ([89b9a76](https://github.com/RogueCtrl/OpenClawDreams/commit/89b9a7634c270b00a59da1d358b951e6bd0fd8cc))


### Refactoring

* improve readability by reformatting long lines in `index.ts`. ([20f16ec](https://github.com/RogueCtrl/OpenClawDreams/commit/20f16ec1cdec0a1306e3f55902cd9cf611c25464))

### [0.7.1](https://github.com/RogueCtrl/OpenClawDreams/compare/v0.6.0...v0.7.1) (2026-03-06)


### Features

* **cli:** add dream command and extract shared createDirectClient helper ([6032258](https://github.com/RogueCtrl/OpenClawDreams/commit/603225887ff382fa86c6e4b072de9585710bc1c6))
* **cli:** add dream preview summary to post command output ([777c7b0](https://github.com/RogueCtrl/OpenClawDreams/commit/777c7b071795247d088a480a19b2328702a01607))
* **cli:** add post command for manual Moltbook posting ([52dfe78](https://github.com/RogueCtrl/OpenClawDreams/commit/52dfe7879ac946f7d929578bb530fc4cd1ee6632))


### Bug Fixes

* **cli:** force Moltbook post from CLI by bypassing MOLTBOOK_ENABLED const ([4354bd5](https://github.com/RogueCtrl/OpenClawDreams/commit/4354bd508da47db3e7015e41157fc80b76943517))
* **cli:** use direct Anthropic API for reflect command instead of nonexistent tools call ([016bc48](https://github.com/RogueCtrl/OpenClawDreams/commit/016bc48bfa70f7ffb25565f5988a49c667ebec0a))
* **lint:** replace all any types with proper typed alternatives ([3698cc4](https://github.com/RogueCtrl/OpenClawDreams/commit/3698cc4b4a37594b7efdc6e4dc3f01c1cb8cade1))
* **moltbook:** remove title filter that inflated title, cap at 300 chars ([8d746fc](https://github.com/RogueCtrl/OpenClawDreams/commit/8d746fcd4093cd8a118128f9a877da110670d8e8))
* **openclaw:** upgrade plugin to use subagent runtime for reflection ([027679d](https://github.com/RogueCtrl/OpenClawDreams/commit/027679d3566d3a2d5ff410acc7c4e6459c204fd2))


### Documentation

* update CLI section with reflect, dream, status commands ([89b9a76](https://github.com/RogueCtrl/OpenClawDreams/commit/89b9a7634c270b00a59da1d358b951e6bd0fd8cc))

## [0.7.0](https://github.com/RogueCtrl/OpenClawDreams/compare/v0.6.0...v0.7.0) (2026-03-06)


### Features

* **cli:** add dream command and extract shared createDirectClient helper ([6032258](https://github.com/RogueCtrl/OpenClawDreams/commit/603225887ff382fa86c6e4b072de9585710bc1c6))


### Bug Fixes

* **cli:** use direct Anthropic API for reflect command instead of nonexistent tools call ([016bc48](https://github.com/RogueCtrl/OpenClawDreams/commit/016bc48bfa70f7ffb25565f5988a49c667ebec0a))
* **lint:** replace all any types with proper typed alternatives ([3698cc4](https://github.com/RogueCtrl/OpenClawDreams/commit/3698cc4b4a37594b7efdc6e4dc3f01c1cb8cade1))
* **openclaw:** upgrade plugin to use subagent runtime for reflection ([027679d](https://github.com/RogueCtrl/OpenClawDreams/commit/027679d3566d3a2d5ff410acc7c4e6459c204fd2))

## [0.6.0](https://github.com/RogueCtrl/OpenClawDreams/compare/v0.5.0...v0.6.0) (2026-03-06)


### Features

* **cli:** add reflect command to manually trigger reflection/synthesis ([a021650](https://github.com/RogueCtrl/OpenClawDreams/commit/a02165022bb0313683893fe2e0ff0c7d426db993))


### Bug Fixes

* **agent_end:** manually synthesize summary and track LLM usage ([76c85cb](https://github.com/RogueCtrl/OpenClawDreams/commit/76c85cb068edd4420169557103091bf8634e36b8))
* correct agent_end hook registration signature to match OpenClaw API ([d323b5a](https://github.com/RogueCtrl/OpenClawDreams/commit/d323b5a12356010806f32a917adb59ce8f39f4a6))
* correct registerHook signature to (event, {name, handler}) ([2f67c71](https://github.com/RogueCtrl/OpenClawDreams/commit/2f67c7152178c1977c83d65f8ed719ac177e0acf))
* use correct OpenClaw API registerHook(events, handler, opts) signature ([8493c4b](https://github.com/RogueCtrl/OpenClawDreams/commit/8493c4bca3d29c0ab7f17e666a3dd50d93fda89e))


### Tests

* fix ENOTEMPTY failures in rmSync due to lingering Winston logger streams ([84f9152](https://github.com/RogueCtrl/OpenClawDreams/commit/84f9152441b8c4299b57475567c2767601e05145))
* remove temporary environment test files ([fbe76af](https://github.com/RogueCtrl/OpenClawDreams/commit/fbe76af8157f27e0afedb2ce13c841c67a477939))

### [0.5.1](https://github.com/RogueCtrl/OpenClawDreams/compare/v0.5.0...v0.5.1) (2026-03-06)

## [0.5.0](https://github.com/RogueCtrl/OpenClawDreams/compare/v0.4.0...v0.5.0) (2026-03-06)


### Features

* Add plugin ID, refactor CLI commands to use parent, and apply minor formatting fixes. ([55ee458](https://github.com/RogueCtrl/OpenClawDreams/commit/55ee458d92cabe8f7f1b80bd0789d957ed9d64f9))
* Introduce plugin ID in package configuration and export plugin object from index.ts. ([5085020](https://github.com/RogueCtrl/OpenClawDreams/commit/5085020d87b5fb6f85bdbb3c43d67370cb7ce5a7))


### Documentation

* clarify hot-reloading mechanism for plugin activation ([6cfda73](https://github.com/RogueCtrl/OpenClawDreams/commit/6cfda73540be85155a730c2734156350ca5b2742))
* clarify internal scheduler and daemon uptime dependency ([dc0e6a6](https://github.com/RogueCtrl/OpenClawDreams/commit/dc0e6a6a7a160575bd395b133b983e841de78358))
* remove references to cron in favor of internal node scheduler ([8496605](https://github.com/RogueCtrl/OpenClawDreams/commit/84966051c700d74256ebb05f7a4ba6d88261ecc2))

## [0.4.0](https://github.com/RogueCtrl/ElectricSheep/compare/v0.3.1...v0.4.0) (2026-03-06)


### Bug Fixes

* correct registerCli signature to use callback form ([c25fe36](https://github.com/RogueCtrl/ElectricSheep/commit/c25fe3635f76396b04c02a34575190863a1deaf4))
* **plugin:** specify openclaw.extensions exports ([6a3e545](https://github.com/RogueCtrl/ElectricSheep/commit/6a3e5454c4d102740dfaed38147a33229c3fd9b8))
* replace registerCron with registerService for OpenClaw API compatibility ([f3b50c7](https://github.com/RogueCtrl/ElectricSheep/commit/f3b50c75763a3ba9d593e42c44434e2f96fa591b))
* resolve @typescript-eslint/no-misused-promises in src/index.ts ([377a109](https://github.com/RogueCtrl/ElectricSheep/commit/377a109ec63266ea0a09562b7d00eaf3d9640858))


### Documentation

* add agent instructions for linting and formatting before commits ([f261654](https://github.com/RogueCtrl/ElectricSheep/commit/f26165409fed5cbd65a6faf870208a015b1b4e91))
* rename project to OpenClawDreams in all documentation ([a260255](https://github.com/RogueCtrl/ElectricSheep/commit/a26025515fb22ef228e2c914175d75c6f149f7a8))

### [0.3.1](https://github.com/RogueCtrl/ElectricSheep/compare/v0.3.0...v0.3.1) (2026-02-04)

## 0.3.0 (2026-02-04)


### Features

* Add comprehensive test suite for core components and introduce API cost warnings to documentation. ([98d3130](https://github.com/RogueCtrl/ElectricSheep/commit/98d3130784e903f14f5016d5e1246f9697124015))
* Add dream reflection pipeline, post filter, and documentation updates ([920d939](https://github.com/RogueCtrl/ElectricSheep/commit/920d9390314a56dd5e3ab3b908697096c36a3bc9))
* Add new `setup-guide` skill and register it in `openclaw.plugin.json`. ([485670c](https://github.com/RogueCtrl/ElectricSheep/commit/485670c04745a69ddbcbf6e51714eee4a5b059f2))
* add project governance, contribution guidelines, security policy, issue/PR templates, and CI build workflow. ([ddb3832](https://github.com/RogueCtrl/ElectricSheep/commit/ddb383238b9d29346c92b9f1e5316e9d222467f8))
* Implement dynamic agent identity loading from workspace files and update memory system documentation. ([c5a2c2b](https://github.com/RogueCtrl/ElectricSheep/commit/c5a2c2bf77cecc49f037b16828d53adc8d370d3c))
* Implement scheduled agent operations with `node-cron` and add retry logic to LLM API calls for increased robustness. ([12c6885](https://github.com/RogueCtrl/ElectricSheep/commit/12c6885b810ed6439faf6969d3f6cbcb2fca439f))
* Introduce a daily token budget for LLM calls, update the LLM client interface to include token usage, and upgrade Node.js to v24 with updated dependencies. ([fcf4f2c](https://github.com/RogueCtrl/ElectricSheep/commit/fcf4f2c19dc7730c2c777d7b394083832f43a500))


### Bug Fixes

* Atomic state writes and SQLite connection singleton ([f5e1fe4](https://github.com/RogueCtrl/ElectricSheep/commit/f5e1fe439eda94e64f7707dcbf30a9cfcb36ea86))
* clean up stale tags before running standard-version in release workflow ([fd87548](https://github.com/RogueCtrl/ElectricSheep/commit/fd8754897515bc5508f7fdae31ac714a3459a6f6))
* Close logger before temp dir cleanup in state tests ([25478b3](https://github.com/RogueCtrl/ElectricSheep/commit/25478b3d2de4661ed4e7297fedcf45b0e400b169))
* Fail-closed filter, title filtering, and robust LLM output parsing ([b5c0b10](https://github.com/RogueCtrl/ElectricSheep/commit/b5c0b10334b866eaa8ca4bcebaa58ea11ef4a664))
* Mock file writes in state tests for CI reliability ([a6062ff](https://github.com/RogueCtrl/ElectricSheep/commit/a6062fffc335fcb1d078c135af61c4a8c9bb8585))
* use release PR instead of direct push to protected main branch ([a7b3c5d](https://github.com/RogueCtrl/ElectricSheep/commit/a7b3c5d5acd77aac09a7c108406d2b6412d63443))


### Documentation

* Add uninstall section to setup guide skill ([e5b76d8](https://github.com/RogueCtrl/ElectricSheep/commit/e5b76d88ec9f15df1c7b1151d4c8a5cefa875c96))
* Clarify that ElectricSheep does not modify OpenClaw's memory ([9a060e1](https://github.com/RogueCtrl/ElectricSheep/commit/9a060e1bd0655e825f6aea7572d1ac108170fce1))
* clarify the daily token budget as best-effort and detail its limitations in both AGENTS.md and README.md. ([10eba97](https://github.com/RogueCtrl/ElectricSheep/commit/10eba97e87a334ca647b279d1fadc0b036a588b4))
* reframe README intro as a reflection engine with optional Moltbook ([a2e8543](https://github.com/RogueCtrl/ElectricSheep/commit/a2e8543375d9555261c67087b7c1b519a3090af8))
* Update CLAUDE.md for markdown blob pipeline and fail-closed filter ([c2f6865](https://github.com/RogueCtrl/ElectricSheep/commit/c2f68650e239fe205d14d59608bd286f8716f848))
* Update documentation to prioritize OpenClaw extension installation and usage, and refine standalone CLI instructions. ([d26dbfc](https://github.com/RogueCtrl/ElectricSheep/commit/d26dbfc6e23e02d4e542f38e090d005ef83ee8e8))


### Refactoring

* Dream is a markdown blob, not a parsed structure ([52a86f0](https://github.com/RogueCtrl/ElectricSheep/commit/52a86f05054fc736d0be47fdbef9895f028fc15d))
* Filter produces post-ready content with default rules ([5ff898f](https://github.com/RogueCtrl/ElectricSheep/commit/5ff898f8dc2329b1c0abe1860d797b867a005e2f))
* Reimplement memory with encrypted SQLite, introduce LLM token budgeting, and update documentation and OpenClaw integration. ([b7887c3](https://github.com/RogueCtrl/ElectricSheep/commit/b7887c32ea6e80806bcd9a73031d8edfe137bbb5))
* Remove standalone mode, improve security, add tests for waking/moltbook ([#6](https://github.com/RogueCtrl/ElectricSheep/issues/6)) ([d191dca](https://github.com/RogueCtrl/ElectricSheep/commit/d191dca8a29f55ee2c8c9ba00a58e461eaa4dbca))
* rewrite ElectricSheep agent from Python to TypeScript and package as an OpenClaw plugin. ([c119a7a](https://github.com/RogueCtrl/ElectricSheep/commit/c119a7adfd995dcebb4c17a507e4b9e7da1c84e8))

## 0.2.0 (2026-02-03)

### Features

* **reflection-engine**: Pivot from Moltbook-centric to operator-focused architecture
* **synthesis**: New context synthesis combining operator conversations, web search, and optional Moltbook content
* **notifications**: Operator notification system via configured channels (telegram, discord, slack, etc.)
* **web-search**: Web search integration via OpenClaw API for broader context gathering
* **openclaw-memory**: Store dreams and reflections in OpenClaw's persistent memory
* **identity**: Dynamic agent identity loading from workspace SOUL.md/IDENTITY.md files
* **dream-reflection**: Dream reflection pipeline for decomposing themes and synthesizing insights
* **post-filter**: Content filter for outbound Moltbook posts (fail-closed design)
* **setup-guide**: New skill for guided plugin configuration

### Refactoring

* **waking**: Reflection cycle now analyzes operator conversations instead of random Moltbook feed
* **dreamer**: Dreams stored in OpenClaw memory, Moltbook posting now optional
* **filter**: Filter produces post-ready content with configurable rules
* **dream-format**: Dream is now a markdown blob, not a parsed structure

### Bug Fixes

* **filter**: Fail-closed filter behavior, title filtering, and robust LLM output parsing

### Documentation

* Updated README.md and CLAUDE.md for new operator-focused architecture
* Added architecture diagrams showing daytime reflection and nighttime dream cycles
* Documented all configuration options and their defaults

## 0.1.0 (2026-01-15)

Initial release with:

* Dual memory system (working memory + encrypted deep memory)
* Moltbook integration for community interaction
* Dream cycle with AES-256-GCM encryption
* OpenClaw plugin architecture (tools, hooks, cron jobs)
* Daily token budget tracking
* CLI utilities for status and memory inspection
