# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [2.7.3](https://github.com/RogueCtrl/OpenClawDreams/compare/v2.3.2...v2.7.3) (2026-03-12)


### Features

* add --dream flag to wake command for testing dream notification delivery ([26cb52f](https://github.com/RogueCtrl/OpenClawDreams/commit/26cb52fdf5d6886ae36f6f8cc513ff3ca3bf496e))
* add seeding reflection mode for pre-dream midnight pass ([60aeccc](https://github.com/RogueCtrl/OpenClawDreams/commit/60aeccc5ea5768e580977d3836c7d05b0f55cd77))
* auto-trigger weekly rhythm report on Mondays at 8am ([#101](https://github.com/RogueCtrl/OpenClawDreams/issues/101)) ([57256da](https://github.com/RogueCtrl/OpenClawDreams/commit/57256da4c8ffb6877ea4d098fac5fd602e6c181b))
* community ingestion — Moltbook read pipeline with external context injection ([#88](https://github.com/RogueCtrl/OpenClawDreams/issues/88)) ([2048305](https://github.com/RogueCtrl/OpenClawDreams/commit/2048305fce064eafa1bf23f055eec61172ade141))
* dream genealogy — lineage tracking, thematic kin, YAML headers, lineage CLI ([#89](https://github.com/RogueCtrl/OpenClawDreams/issues/89)) ([582c173](https://github.com/RogueCtrl/OpenClawDreams/commit/582c1739918a121215e281fcbd741f0e605230e2))
* **ocd:** morning wake — defer dream notifications to 8am, add wake CLI command ([bb44b67](https://github.com/RogueCtrl/OpenClawDreams/commit/bb44b6736d090254a354db4a738210953b084e80))
* **ocd:** prompt vocabulary rotation to prevent input-side word calcification ([13fe1c6](https://github.com/RogueCtrl/OpenClawDreams/commit/13fe1c616229a4f22e82d6564bcc78f5366b4e15))
* use OpenClaw system events for dream notifications ([d3edd0e](https://github.com/RogueCtrl/OpenClawDreams/commit/d3edd0e4f299c52d7abb667c4f6011bbeeb02915)), closes [#107](https://github.com/RogueCtrl/OpenClawDreams/issues/107)
* v2.4.0 — dream genealogy, community ingestion, system event notifications, title extraction fix ([13c80bc](https://github.com/RogueCtrl/OpenClawDreams/commit/13c80bc71d847bc90a6476b79eb55ecafa332bb4))


### Bug Fixes

* add rhythm CLI command with --weekly/--daily options ([#99](https://github.com/RogueCtrl/OpenClawDreams/issues/99)) ([0477e51](https://github.com/RogueCtrl/OpenClawDreams/commit/0477e51910b5bba273e3cdef7f253cba0f518a31))
* **ci:** clean up stale release branches before pushing ([4b9843e](https://github.com/RogueCtrl/OpenClawDreams/commit/4b9843efcaa40fd7f56ce2cf3fe44385b6737c69))
* enforce markdown heading in dream generation prompts ([bd57194](https://github.com/RogueCtrl/OpenClawDreams/commit/bd57194d32704f77b8f34ba0e8c552b1b7908366)), closes [#106](https://github.com/RogueCtrl/OpenClawDreams/issues/106)
* expose --mode flag on reflect CLI command ([6d27f8e](https://github.com/RogueCtrl/OpenClawDreams/commit/6d27f8e3c4960b6753b173ff7573f59cabdbb583))
* extract dream title from bold lines and clean prose for Moltbook posts ([51a1651](https://github.com/RogueCtrl/OpenClawDreams/commit/51a16517a207a0d879cbb13e93b1d2c03e257237))
* extract dream title from first markdown heading, not first line ([#92](https://github.com/RogueCtrl/OpenClawDreams/issues/92)) ([dc9cf33](https://github.com/RogueCtrl/OpenClawDreams/commit/dc9cf331907d4cd3075991f58c0ebbeb4d5a195f)), closes [#91](https://github.com/RogueCtrl/OpenClawDreams/issues/91)
* format cli.ts ([d819919](https://github.com/RogueCtrl/OpenClawDreams/commit/d8199190dd66de9637896f06323bcd81cf8bac45))
* simplify claude code review action — remove broken plugin marketplace ([56353f6](https://github.com/RogueCtrl/OpenClawDreams/commit/56353f6b2bbc9ea06324186b6ece405c990a6e5e))
* use OpenClaw system events for dream notifications ([#94](https://github.com/RogueCtrl/OpenClawDreams/issues/94)) ([28cfe73](https://github.com/RogueCtrl/OpenClawDreams/commit/28cfe73ba2a71d4ce26d740678fdcaa66371ec98)), closes [#91](https://github.com/RogueCtrl/OpenClawDreams/issues/91) [#93](https://github.com/RogueCtrl/OpenClawDreams/issues/93)

### [2.7.2](https://github.com/RogueCtrl/OpenClawDreams/compare/v2.3.2...v2.7.2) (2026-03-12)


### Features

* add --dream flag to wake command for testing dream notification delivery ([26cb52f](https://github.com/RogueCtrl/OpenClawDreams/commit/26cb52fdf5d6886ae36f6f8cc513ff3ca3bf496e))
* auto-trigger weekly rhythm report on Mondays at 8am ([#101](https://github.com/RogueCtrl/OpenClawDreams/issues/101)) ([57256da](https://github.com/RogueCtrl/OpenClawDreams/commit/57256da4c8ffb6877ea4d098fac5fd602e6c181b))
* community ingestion — Moltbook read pipeline with external context injection ([#88](https://github.com/RogueCtrl/OpenClawDreams/issues/88)) ([2048305](https://github.com/RogueCtrl/OpenClawDreams/commit/2048305fce064eafa1bf23f055eec61172ade141))
* dream genealogy — lineage tracking, thematic kin, YAML headers, lineage CLI ([#89](https://github.com/RogueCtrl/OpenClawDreams/issues/89)) ([582c173](https://github.com/RogueCtrl/OpenClawDreams/commit/582c1739918a121215e281fcbd741f0e605230e2))
* **ocd:** morning wake — defer dream notifications to 8am, add wake CLI command ([bb44b67](https://github.com/RogueCtrl/OpenClawDreams/commit/bb44b6736d090254a354db4a738210953b084e80))
* **ocd:** prompt vocabulary rotation to prevent input-side word calcification ([13fe1c6](https://github.com/RogueCtrl/OpenClawDreams/commit/13fe1c616229a4f22e82d6564bcc78f5366b4e15))
* use OpenClaw system events for dream notifications ([d3edd0e](https://github.com/RogueCtrl/OpenClawDreams/commit/d3edd0e4f299c52d7abb667c4f6011bbeeb02915)), closes [#107](https://github.com/RogueCtrl/OpenClawDreams/issues/107)
* v2.4.0 — dream genealogy, community ingestion, system event notifications, title extraction fix ([13c80bc](https://github.com/RogueCtrl/OpenClawDreams/commit/13c80bc71d847bc90a6476b79eb55ecafa332bb4))


### Bug Fixes

* add rhythm CLI command with --weekly/--daily options ([#99](https://github.com/RogueCtrl/OpenClawDreams/issues/99)) ([0477e51](https://github.com/RogueCtrl/OpenClawDreams/commit/0477e51910b5bba273e3cdef7f253cba0f518a31))
* **ci:** clean up stale release branches before pushing ([4b9843e](https://github.com/RogueCtrl/OpenClawDreams/commit/4b9843efcaa40fd7f56ce2cf3fe44385b6737c69))
* enforce markdown heading in dream generation prompts ([bd57194](https://github.com/RogueCtrl/OpenClawDreams/commit/bd57194d32704f77b8f34ba0e8c552b1b7908366)), closes [#106](https://github.com/RogueCtrl/OpenClawDreams/issues/106)
* extract dream title from bold lines and clean prose for Moltbook posts ([51a1651](https://github.com/RogueCtrl/OpenClawDreams/commit/51a16517a207a0d879cbb13e93b1d2c03e257237))
* extract dream title from first markdown heading, not first line ([#92](https://github.com/RogueCtrl/OpenClawDreams/issues/92)) ([dc9cf33](https://github.com/RogueCtrl/OpenClawDreams/commit/dc9cf331907d4cd3075991f58c0ebbeb4d5a195f)), closes [#91](https://github.com/RogueCtrl/OpenClawDreams/issues/91)
* simplify claude code review action — remove broken plugin marketplace ([56353f6](https://github.com/RogueCtrl/OpenClawDreams/commit/56353f6b2bbc9ea06324186b6ece405c990a6e5e))
* use OpenClaw system events for dream notifications ([#94](https://github.com/RogueCtrl/OpenClawDreams/issues/94)) ([28cfe73](https://github.com/RogueCtrl/OpenClawDreams/commit/28cfe73ba2a71d4ce26d740678fdcaa66371ec98)), closes [#91](https://github.com/RogueCtrl/OpenClawDreams/issues/91) [#93](https://github.com/RogueCtrl/OpenClawDreams/issues/93)

### [2.7.1](https://github.com/RogueCtrl/OpenClawDreams/compare/v2.3.2...v2.7.1) (2026-03-11)


### Features

* add --dream flag to wake command for testing dream notification delivery ([26cb52f](https://github.com/RogueCtrl/OpenClawDreams/commit/26cb52fdf5d6886ae36f6f8cc513ff3ca3bf496e))
* auto-trigger weekly rhythm report on Mondays at 8am ([#101](https://github.com/RogueCtrl/OpenClawDreams/issues/101)) ([57256da](https://github.com/RogueCtrl/OpenClawDreams/commit/57256da4c8ffb6877ea4d098fac5fd602e6c181b))
* community ingestion — Moltbook read pipeline with external context injection ([#88](https://github.com/RogueCtrl/OpenClawDreams/issues/88)) ([2048305](https://github.com/RogueCtrl/OpenClawDreams/commit/2048305fce064eafa1bf23f055eec61172ade141))
* dream genealogy — lineage tracking, thematic kin, YAML headers, lineage CLI ([#89](https://github.com/RogueCtrl/OpenClawDreams/issues/89)) ([582c173](https://github.com/RogueCtrl/OpenClawDreams/commit/582c1739918a121215e281fcbd741f0e605230e2))
* **ocd:** morning wake — defer dream notifications to 8am, add wake CLI command ([bb44b67](https://github.com/RogueCtrl/OpenClawDreams/commit/bb44b6736d090254a354db4a738210953b084e80))
* **ocd:** prompt vocabulary rotation to prevent input-side word calcification ([13fe1c6](https://github.com/RogueCtrl/OpenClawDreams/commit/13fe1c616229a4f22e82d6564bcc78f5366b4e15))
* use OpenClaw system events for dream notifications ([d3edd0e](https://github.com/RogueCtrl/OpenClawDreams/commit/d3edd0e4f299c52d7abb667c4f6011bbeeb02915)), closes [#107](https://github.com/RogueCtrl/OpenClawDreams/issues/107)
* v2.4.0 — dream genealogy, community ingestion, system event notifications, title extraction fix ([13c80bc](https://github.com/RogueCtrl/OpenClawDreams/commit/13c80bc71d847bc90a6476b79eb55ecafa332bb4))


### Bug Fixes

* add rhythm CLI command with --weekly/--daily options ([#99](https://github.com/RogueCtrl/OpenClawDreams/issues/99)) ([0477e51](https://github.com/RogueCtrl/OpenClawDreams/commit/0477e51910b5bba273e3cdef7f253cba0f518a31))
* **ci:** clean up stale release branches before pushing ([4b9843e](https://github.com/RogueCtrl/OpenClawDreams/commit/4b9843efcaa40fd7f56ce2cf3fe44385b6737c69))
* enforce markdown heading in dream generation prompts ([bd57194](https://github.com/RogueCtrl/OpenClawDreams/commit/bd57194d32704f77b8f34ba0e8c552b1b7908366)), closes [#106](https://github.com/RogueCtrl/OpenClawDreams/issues/106)
* extract dream title from first markdown heading, not first line ([#92](https://github.com/RogueCtrl/OpenClawDreams/issues/92)) ([dc9cf33](https://github.com/RogueCtrl/OpenClawDreams/commit/dc9cf331907d4cd3075991f58c0ebbeb4d5a195f)), closes [#91](https://github.com/RogueCtrl/OpenClawDreams/issues/91)
* simplify claude code review action — remove broken plugin marketplace ([56353f6](https://github.com/RogueCtrl/OpenClawDreams/commit/56353f6b2bbc9ea06324186b6ece405c990a6e5e))
* use OpenClaw system events for dream notifications ([#94](https://github.com/RogueCtrl/OpenClawDreams/issues/94)) ([28cfe73](https://github.com/RogueCtrl/OpenClawDreams/commit/28cfe73ba2a71d4ce26d740678fdcaa66371ec98)), closes [#91](https://github.com/RogueCtrl/OpenClawDreams/issues/91) [#93](https://github.com/RogueCtrl/OpenClawDreams/issues/93)

## [2.7.0](https://github.com/RogueCtrl/OpenClawDreams/compare/v2.3.2...v2.7.0) (2026-03-11)


### Features

* add --dream flag to wake command for testing dream notification delivery ([26cb52f](https://github.com/RogueCtrl/OpenClawDreams/commit/26cb52fdf5d6886ae36f6f8cc513ff3ca3bf496e))
* auto-trigger weekly rhythm report on Mondays at 8am ([#101](https://github.com/RogueCtrl/OpenClawDreams/issues/101)) ([57256da](https://github.com/RogueCtrl/OpenClawDreams/commit/57256da4c8ffb6877ea4d098fac5fd602e6c181b))
* community ingestion — Moltbook read pipeline with external context injection ([#88](https://github.com/RogueCtrl/OpenClawDreams/issues/88)) ([2048305](https://github.com/RogueCtrl/OpenClawDreams/commit/2048305fce064eafa1bf23f055eec61172ade141))
* dream genealogy — lineage tracking, thematic kin, YAML headers, lineage CLI ([#89](https://github.com/RogueCtrl/OpenClawDreams/issues/89)) ([582c173](https://github.com/RogueCtrl/OpenClawDreams/commit/582c1739918a121215e281fcbd741f0e605230e2))
* **ocd:** morning wake — defer dream notifications to 8am, add wake CLI command ([bb44b67](https://github.com/RogueCtrl/OpenClawDreams/commit/bb44b6736d090254a354db4a738210953b084e80))
* **ocd:** prompt vocabulary rotation to prevent input-side word calcification ([13fe1c6](https://github.com/RogueCtrl/OpenClawDreams/commit/13fe1c616229a4f22e82d6564bcc78f5366b4e15))
* use OpenClaw system events for dream notifications ([d3edd0e](https://github.com/RogueCtrl/OpenClawDreams/commit/d3edd0e4f299c52d7abb667c4f6011bbeeb02915)), closes [#107](https://github.com/RogueCtrl/OpenClawDreams/issues/107)
* v2.4.0 — dream genealogy, community ingestion, system event notifications, title extraction fix ([13c80bc](https://github.com/RogueCtrl/OpenClawDreams/commit/13c80bc71d847bc90a6476b79eb55ecafa332bb4))


### Bug Fixes

* add rhythm CLI command with --weekly/--daily options ([#99](https://github.com/RogueCtrl/OpenClawDreams/issues/99)) ([0477e51](https://github.com/RogueCtrl/OpenClawDreams/commit/0477e51910b5bba273e3cdef7f253cba0f518a31))
* **ci:** clean up stale release branches before pushing ([4b9843e](https://github.com/RogueCtrl/OpenClawDreams/commit/4b9843efcaa40fd7f56ce2cf3fe44385b6737c69))
* extract dream title from first markdown heading, not first line ([#92](https://github.com/RogueCtrl/OpenClawDreams/issues/92)) ([dc9cf33](https://github.com/RogueCtrl/OpenClawDreams/commit/dc9cf331907d4cd3075991f58c0ebbeb4d5a195f)), closes [#91](https://github.com/RogueCtrl/OpenClawDreams/issues/91)
* simplify claude code review action — remove broken plugin marketplace ([56353f6](https://github.com/RogueCtrl/OpenClawDreams/commit/56353f6b2bbc9ea06324186b6ece405c990a6e5e))
* use OpenClaw system events for dream notifications ([#94](https://github.com/RogueCtrl/OpenClawDreams/issues/94)) ([28cfe73](https://github.com/RogueCtrl/OpenClawDreams/commit/28cfe73ba2a71d4ce26d740678fdcaa66371ec98)), closes [#91](https://github.com/RogueCtrl/OpenClawDreams/issues/91) [#93](https://github.com/RogueCtrl/OpenClawDreams/issues/93)

## [2.6.0](https://github.com/RogueCtrl/OpenClawDreams/compare/v2.3.2...v2.6.0) (2026-03-11)


### Features

* auto-trigger weekly rhythm report on Mondays at 8am ([#101](https://github.com/RogueCtrl/OpenClawDreams/issues/101)) ([57256da](https://github.com/RogueCtrl/OpenClawDreams/commit/57256da4c8ffb6877ea4d098fac5fd602e6c181b))
* community ingestion — Moltbook read pipeline with external context injection ([#88](https://github.com/RogueCtrl/OpenClawDreams/issues/88)) ([2048305](https://github.com/RogueCtrl/OpenClawDreams/commit/2048305fce064eafa1bf23f055eec61172ade141))
* dream genealogy — lineage tracking, thematic kin, YAML headers, lineage CLI ([#89](https://github.com/RogueCtrl/OpenClawDreams/issues/89)) ([582c173](https://github.com/RogueCtrl/OpenClawDreams/commit/582c1739918a121215e281fcbd741f0e605230e2))
* **ocd:** morning wake — defer dream notifications to 8am, add wake CLI command ([bb44b67](https://github.com/RogueCtrl/OpenClawDreams/commit/bb44b6736d090254a354db4a738210953b084e80))
* **ocd:** prompt vocabulary rotation to prevent input-side word calcification ([13fe1c6](https://github.com/RogueCtrl/OpenClawDreams/commit/13fe1c616229a4f22e82d6564bcc78f5366b4e15))
* v2.4.0 — dream genealogy, community ingestion, system event notifications, title extraction fix ([13c80bc](https://github.com/RogueCtrl/OpenClawDreams/commit/13c80bc71d847bc90a6476b79eb55ecafa332bb4))


### Bug Fixes

* add rhythm CLI command with --weekly/--daily options ([#99](https://github.com/RogueCtrl/OpenClawDreams/issues/99)) ([0477e51](https://github.com/RogueCtrl/OpenClawDreams/commit/0477e51910b5bba273e3cdef7f253cba0f518a31))
* **ci:** clean up stale release branches before pushing ([4b9843e](https://github.com/RogueCtrl/OpenClawDreams/commit/4b9843efcaa40fd7f56ce2cf3fe44385b6737c69))
* extract dream title from first markdown heading, not first line ([#92](https://github.com/RogueCtrl/OpenClawDreams/issues/92)) ([dc9cf33](https://github.com/RogueCtrl/OpenClawDreams/commit/dc9cf331907d4cd3075991f58c0ebbeb4d5a195f)), closes [#91](https://github.com/RogueCtrl/OpenClawDreams/issues/91)
* simplify claude code review action — remove broken plugin marketplace ([56353f6](https://github.com/RogueCtrl/OpenClawDreams/commit/56353f6b2bbc9ea06324186b6ece405c990a6e5e))
* use OpenClaw system events for dream notifications ([#94](https://github.com/RogueCtrl/OpenClawDreams/issues/94)) ([28cfe73](https://github.com/RogueCtrl/OpenClawDreams/commit/28cfe73ba2a71d4ce26d740678fdcaa66371ec98)), closes [#91](https://github.com/RogueCtrl/OpenClawDreams/issues/91) [#93](https://github.com/RogueCtrl/OpenClawDreams/issues/93)

### [2.5.1](https://github.com/RogueCtrl/OpenClawDreams/compare/v2.3.2...v2.5.1) (2026-03-10)


### Features

* auto-trigger weekly rhythm report on Mondays at 8am ([#101](https://github.com/RogueCtrl/OpenClawDreams/issues/101)) ([57256da](https://github.com/RogueCtrl/OpenClawDreams/commit/57256da4c8ffb6877ea4d098fac5fd602e6c181b))
* community ingestion — Moltbook read pipeline with external context injection ([#88](https://github.com/RogueCtrl/OpenClawDreams/issues/88)) ([2048305](https://github.com/RogueCtrl/OpenClawDreams/commit/2048305fce064eafa1bf23f055eec61172ade141))
* dream genealogy — lineage tracking, thematic kin, YAML headers, lineage CLI ([#89](https://github.com/RogueCtrl/OpenClawDreams/issues/89)) ([582c173](https://github.com/RogueCtrl/OpenClawDreams/commit/582c1739918a121215e281fcbd741f0e605230e2))
* **ocd:** prompt vocabulary rotation to prevent input-side word calcification ([13fe1c6](https://github.com/RogueCtrl/OpenClawDreams/commit/13fe1c616229a4f22e82d6564bcc78f5366b4e15))
* v2.4.0 — dream genealogy, community ingestion, system event notifications, title extraction fix ([13c80bc](https://github.com/RogueCtrl/OpenClawDreams/commit/13c80bc71d847bc90a6476b79eb55ecafa332bb4))


### Bug Fixes

* add rhythm CLI command with --weekly/--daily options ([#99](https://github.com/RogueCtrl/OpenClawDreams/issues/99)) ([0477e51](https://github.com/RogueCtrl/OpenClawDreams/commit/0477e51910b5bba273e3cdef7f253cba0f518a31))
* **ci:** clean up stale release branches before pushing ([4b9843e](https://github.com/RogueCtrl/OpenClawDreams/commit/4b9843efcaa40fd7f56ce2cf3fe44385b6737c69))
* extract dream title from first markdown heading, not first line ([#92](https://github.com/RogueCtrl/OpenClawDreams/issues/92)) ([dc9cf33](https://github.com/RogueCtrl/OpenClawDreams/commit/dc9cf331907d4cd3075991f58c0ebbeb4d5a195f)), closes [#91](https://github.com/RogueCtrl/OpenClawDreams/issues/91)
* simplify claude code review action — remove broken plugin marketplace ([56353f6](https://github.com/RogueCtrl/OpenClawDreams/commit/56353f6b2bbc9ea06324186b6ece405c990a6e5e))
* use OpenClaw system events for dream notifications ([#94](https://github.com/RogueCtrl/OpenClawDreams/issues/94)) ([28cfe73](https://github.com/RogueCtrl/OpenClawDreams/commit/28cfe73ba2a71d4ce26d740678fdcaa66371ec98)), closes [#91](https://github.com/RogueCtrl/OpenClawDreams/issues/91) [#93](https://github.com/RogueCtrl/OpenClawDreams/issues/93)

## [2.5.0](https://github.com/RogueCtrl/OpenClawDreams/compare/v2.3.2...v2.5.0) (2026-03-10)


### Features

* auto-trigger weekly rhythm report on Mondays at 8am ([#101](https://github.com/RogueCtrl/OpenClawDreams/issues/101)) ([57256da](https://github.com/RogueCtrl/OpenClawDreams/commit/57256da4c8ffb6877ea4d098fac5fd602e6c181b))
* community ingestion — Moltbook read pipeline with external context injection ([#88](https://github.com/RogueCtrl/OpenClawDreams/issues/88)) ([2048305](https://github.com/RogueCtrl/OpenClawDreams/commit/2048305fce064eafa1bf23f055eec61172ade141))
* dream genealogy — lineage tracking, thematic kin, YAML headers, lineage CLI ([#89](https://github.com/RogueCtrl/OpenClawDreams/issues/89)) ([582c173](https://github.com/RogueCtrl/OpenClawDreams/commit/582c1739918a121215e281fcbd741f0e605230e2))
* v2.4.0 — dream genealogy, community ingestion, system event notifications, title extraction fix ([13c80bc](https://github.com/RogueCtrl/OpenClawDreams/commit/13c80bc71d847bc90a6476b79eb55ecafa332bb4))


### Bug Fixes

* add rhythm CLI command with --weekly/--daily options ([#99](https://github.com/RogueCtrl/OpenClawDreams/issues/99)) ([0477e51](https://github.com/RogueCtrl/OpenClawDreams/commit/0477e51910b5bba273e3cdef7f253cba0f518a31))
* **ci:** clean up stale release branches before pushing ([4b9843e](https://github.com/RogueCtrl/OpenClawDreams/commit/4b9843efcaa40fd7f56ce2cf3fe44385b6737c69))
* extract dream title from first markdown heading, not first line ([#92](https://github.com/RogueCtrl/OpenClawDreams/issues/92)) ([dc9cf33](https://github.com/RogueCtrl/OpenClawDreams/commit/dc9cf331907d4cd3075991f58c0ebbeb4d5a195f)), closes [#91](https://github.com/RogueCtrl/OpenClawDreams/issues/91)
* use OpenClaw system events for dream notifications ([#94](https://github.com/RogueCtrl/OpenClawDreams/issues/94)) ([28cfe73](https://github.com/RogueCtrl/OpenClawDreams/commit/28cfe73ba2a71d4ce26d740678fdcaa66371ec98)), closes [#91](https://github.com/RogueCtrl/OpenClawDreams/issues/91) [#93](https://github.com/RogueCtrl/OpenClawDreams/issues/93)

### [2.4.1](https://github.com/RogueCtrl/OpenClawDreams/compare/v2.3.2...v2.4.1) (2026-03-10)


### Features

* community ingestion — Moltbook read pipeline with external context injection ([#88](https://github.com/RogueCtrl/OpenClawDreams/issues/88)) ([2048305](https://github.com/RogueCtrl/OpenClawDreams/commit/2048305fce064eafa1bf23f055eec61172ade141))
* dream genealogy — lineage tracking, thematic kin, YAML headers, lineage CLI ([#89](https://github.com/RogueCtrl/OpenClawDreams/issues/89)) ([582c173](https://github.com/RogueCtrl/OpenClawDreams/commit/582c1739918a121215e281fcbd741f0e605230e2))
* v2.4.0 — dream genealogy, community ingestion, system event notifications, title extraction fix ([13c80bc](https://github.com/RogueCtrl/OpenClawDreams/commit/13c80bc71d847bc90a6476b79eb55ecafa332bb4))


### Bug Fixes

* add rhythm CLI command with --weekly/--daily options ([#99](https://github.com/RogueCtrl/OpenClawDreams/issues/99)) ([0477e51](https://github.com/RogueCtrl/OpenClawDreams/commit/0477e51910b5bba273e3cdef7f253cba0f518a31))
* **ci:** clean up stale release branches before pushing ([4b9843e](https://github.com/RogueCtrl/OpenClawDreams/commit/4b9843efcaa40fd7f56ce2cf3fe44385b6737c69))
* extract dream title from first markdown heading, not first line ([#92](https://github.com/RogueCtrl/OpenClawDreams/issues/92)) ([dc9cf33](https://github.com/RogueCtrl/OpenClawDreams/commit/dc9cf331907d4cd3075991f58c0ebbeb4d5a195f)), closes [#91](https://github.com/RogueCtrl/OpenClawDreams/issues/91)
* use OpenClaw system events for dream notifications ([#94](https://github.com/RogueCtrl/OpenClawDreams/issues/94)) ([28cfe73](https://github.com/RogueCtrl/OpenClawDreams/commit/28cfe73ba2a71d4ce26d740678fdcaa66371ec98)), closes [#91](https://github.com/RogueCtrl/OpenClawDreams/issues/91) [#93](https://github.com/RogueCtrl/OpenClawDreams/issues/93)

## [2.4.0](https://github.com/RogueCtrl/OpenClawDreams/compare/v2.3.2...v2.4.0) (2026-03-10)


### Features

* community ingestion — Moltbook read pipeline with external context injection ([#88](https://github.com/RogueCtrl/OpenClawDreams/issues/88)) ([2048305](https://github.com/RogueCtrl/OpenClawDreams/commit/2048305fce064eafa1bf23f055eec61172ade141))
* dream genealogy — lineage tracking, thematic kin, YAML headers, lineage CLI ([#89](https://github.com/RogueCtrl/OpenClawDreams/issues/89)) ([582c173](https://github.com/RogueCtrl/OpenClawDreams/commit/582c1739918a121215e281fcbd741f0e605230e2))
* v2.4.0 — dream genealogy, community ingestion, system event notifications, title extraction fix ([13c80bc](https://github.com/RogueCtrl/OpenClawDreams/commit/13c80bc71d847bc90a6476b79eb55ecafa332bb4))


### Bug Fixes

* **ci:** clean up stale release branches before pushing ([4b9843e](https://github.com/RogueCtrl/OpenClawDreams/commit/4b9843efcaa40fd7f56ce2cf3fe44385b6737c69))
* extract dream title from first markdown heading, not first line ([#92](https://github.com/RogueCtrl/OpenClawDreams/issues/92)) ([dc9cf33](https://github.com/RogueCtrl/OpenClawDreams/commit/dc9cf331907d4cd3075991f58c0ebbeb4d5a195f)), closes [#91](https://github.com/RogueCtrl/OpenClawDreams/issues/91)
* use OpenClaw system events for dream notifications ([#94](https://github.com/RogueCtrl/OpenClawDreams/issues/94)) ([28cfe73](https://github.com/RogueCtrl/OpenClawDreams/commit/28cfe73ba2a71d4ce26d740678fdcaa66371ec98)), closes [#91](https://github.com/RogueCtrl/OpenClawDreams/issues/91) [#93](https://github.com/RogueCtrl/OpenClawDreams/issues/93)

### [2.3.2](https://github.com/RogueCtrl/OpenClawDreams/compare/v2.3.0...v2.3.2) (2026-03-10)


### Bug Fixes

* add files whitelist to package.json — reduce publish from 3501 files/12.8MB to 123 files/430KB ([d176130](https://github.com/RogueCtrl/OpenClawDreams/commit/d176130e44cf9e5afb6f1f2ac32ba6eb56cc8ecc))

## [2.3.0](https://github.com/RogueCtrl/OpenClawDreams/compare/v2.2.0...v2.3.0) (2026-03-09)


### Features

* cognitive rhythm report — weekly digest command + generator ([f61bb36](https://github.com/RogueCtrl/OpenClawDreams/commit/f61bb3680408b324dafca085b9dc354be670fb48))
* cognitive rhythm report — weekly digest command + report generator ([4398709](https://github.com/RogueCtrl/OpenClawDreams/commit/4398709832898a94808ec267e8caf1b399d88574))

## [2.2.0](https://github.com/RogueCtrl/OpenClawDreams/compare/v2.1.0...v2.2.0) (2026-03-09)


### Features

* dream entropy enforcement — overlap scoring + re-prompt on recycled territory ([fda1871](https://github.com/RogueCtrl/OpenClawDreams/commit/fda1871399cc35e1965b6b48a96d0f16c9a5df3e))
* dream entropy enforcement — overlap scoring + re-prompt on recycled territory ([8745a73](https://github.com/RogueCtrl/OpenClawDreams/commit/8745a7394354f2f9be3ab2cf924b5cc48985d67b)), closes [#81](https://github.com/RogueCtrl/OpenClawDreams/issues/81)

## [2.1.0](https://github.com/RogueCtrl/OpenClawDreams/compare/v2.0.2...v2.1.0) (2026-03-09)


### Features

* recursive reflection guard — meta_loop_depth counter + outward steering directive ([856b689](https://github.com/RogueCtrl/OpenClawDreams/commit/856b689b851e1e256c6a5aef6d1decc1cf4fab3c))
* recursive reflection guard — meta_loop_depth counter + outward steering directive ([6584e82](https://github.com/RogueCtrl/OpenClawDreams/commit/6584e820e89352124ba50e259368defa18f90a66))

### [2.0.2](https://github.com/RogueCtrl/OpenClawDreams/compare/v2.0.1...v2.0.2) (2026-03-09)

### [2.0.1](https://github.com/RogueCtrl/OpenClawDreams/compare/v1.7.0...v2.0.1) (2026-03-09)


### ⚠ BREAKING CHANGES

* Dream Remembrance System — SQLite tracking, 1% cycle, weighted selection, pruning
* v2.0.0 — dry-run flags, encrypted deep memory, backward-compat migrations

### Features

* add --dry-run to all mutations and listing commands ([3f4af5b](https://github.com/RogueCtrl/OpenClawDreams/commit/3f4af5b0e038de794e43f3011c8c9b190436c596))
* Dream Remembrance System — SQLite tracking, 1% cycle, weighted selection, pruning ([9c45f19](https://github.com/RogueCtrl/OpenClawDreams/commit/9c45f1999622d8d3c02f037259e2fbe50a8ab0be))
* enhance dream remembrance with meta-synthesis and independent nightmares ([1618317](https://github.com/RogueCtrl/OpenClawDreams/commit/1618317944fce9b3403e2aea9677070c0bb90a44))
* finalize dream remembrance with simulation commands and full test isolation ([9af434a](https://github.com/RogueCtrl/OpenClawDreams/commit/9af434a05e620f857ce30de8a5953694bbae21ff))
* implement Dream Remembrance System using SQLite ([7100e57](https://github.com/RogueCtrl/OpenClawDreams/commit/7100e579287aa43665dccff47632031db291e850))
* schema migration + getDeepMemoryById for dream remembrance columns ([8d78aba](https://github.com/RogueCtrl/OpenClawDreams/commit/8d78aba0be0a7550a87c93449cb5f14812357f54))
* v2.0.0 — dry-run flags, encrypted deep memory, backward-compat migrations ([ebb1bc9](https://github.com/RogueCtrl/OpenClawDreams/commit/ebb1bc97668ab252d4265810e1f040abbacac4f7))


### Bug Fixes

* resolve TS errors and simplify backfill to disk-only ([edc2905](https://github.com/RogueCtrl/OpenClawDreams/commit/edc29055e86d43d3d1dd8b9c6675e0825cb2ae22))
* resolve type errors from dream remembrance backfill implementation ([0b5ab4f](https://github.com/RogueCtrl/OpenClawDreams/commit/0b5ab4fb84e2b0acb341e7ce765e54c9e2f370c6))


### Documentation

* update README with nightmare cycle, insight continuity, reflect dry-run, rich MemoryEntry ([1013914](https://github.com/RogueCtrl/OpenClawDreams/commit/1013914954fb8a37353933eb605a82e5617a6165))

## [2.0.0](https://github.com/RogueCtrl/OpenClawDreams/compare/v1.7.0...v2.0.0) (2026-03-08)

### ⚠ BREAKING CHANGES

* **memory:** New columns added to `dream_remembrances` (`is_nightmare`, `is_meta_synthesis`, `source_filenames`, `deep_memory_id`). Existing databases are automatically migrated on first run via `getDb()`. No manual action is needed.
* **storage:** Dreams and nightmares are now stored encrypted in the SQLite `deep_memories` table instead of relying solely on markdown files. A backfill process will run automatically to migrate existing markdown files and Moltbook posts into the database.
* **file pruning:** Only the single most recent dream/nightmare `.md` file is kept on disk as a live view. All older markdown files are pruned.
* **schema:** The `dream_remembrances` table and `DeepMemoryRow` types have been updated to support the new metadata and relationships.

### Features

* **dreamer:** Introduce Dream Remembrance System with weighted selection (1% chance to remember a past dream).
* **dreamer:** Meta-dream synthesis combines a remembered dream with a new dream.
* **dreamer:** Independent nightmare probability (5%) that can combine with remembrances to form meta-nightmares.
* **cli:** Add `--sim-remembered` and `--sim-remembered-nightmare` flags to simulate the new mechanics.
* **cli:** Add `--dry-run` flag support to all state-modifying commands (`dream`, `nightmare`, `reflect`, `post`, `register`) to allow testing without side effects.
* **memory:** Implement automatic, backward-compatible SQLite schema migrations.
* **backfill:** Automatically backfill existing dream files and Moltbook posts into the encrypted deep memory store on first run.

## [1.7.0](https://github.com/RogueCtrl/OpenClawDreams/compare/v1.6.1...v1.7.0) (2026-03-09)


### Features

* add midnight (0h) reflection cycle ([0f1703c](https://github.com/RogueCtrl/OpenClawDreams/commit/0f1703c00acc0e2197969a941f3fc818ff128e25))
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

### [1.6.1](https://github.com/RogueCtrl/OpenClawDreams/compare/v1.2.2...v1.6.1) (2026-03-08)
