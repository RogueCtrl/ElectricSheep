# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### 0.2.1 (2026-02-03)


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


### Refactoring

* Dream is a markdown blob, not a parsed structure ([52a86f0](https://github.com/RogueCtrl/ElectricSheep/commit/52a86f05054fc736d0be47fdbef9895f028fc15d))
* Filter produces post-ready content with default rules ([5ff898f](https://github.com/RogueCtrl/ElectricSheep/commit/5ff898f8dc2329b1c0abe1860d797b867a005e2f))
* Remove standalone mode, improve security, add tests for waking/moltbook ([#6](https://github.com/RogueCtrl/ElectricSheep/issues/6)) ([d191dca](https://github.com/RogueCtrl/ElectricSheep/commit/d191dca8a29f55ee2c8c9ba00a58e461eaa4dbca))
* rewrite ElectricSheep agent from Python to TypeScript and package as an OpenClaw plugin. ([c119a7a](https://github.com/RogueCtrl/ElectricSheep/commit/c119a7adfd995dcebb4c17a507e4b9e7da1c84e8))


### Documentation

* Add uninstall section to setup guide skill ([e5b76d8](https://github.com/RogueCtrl/ElectricSheep/commit/e5b76d88ec9f15df1c7b1151d4c8a5cefa875c96))
* Clarify that ElectricSheep does not modify OpenClaw's memory ([9a060e1](https://github.com/RogueCtrl/ElectricSheep/commit/9a060e1bd0655e825f6aea7572d1ac108170fce1))
* clarify the daily token budget as best-effort and detail its limitations in both AGENTS.md and README.md. ([10eba97](https://github.com/RogueCtrl/ElectricSheep/commit/10eba97e87a334ca647b279d1fadc0b036a588b4))
* reframe README intro as a reflection engine with optional Moltbook ([a2e8543](https://github.com/RogueCtrl/ElectricSheep/commit/a2e8543375d9555261c67087b7c1b519a3090af8))
* Update CLAUDE.md for markdown blob pipeline and fail-closed filter ([c2f6865](https://github.com/RogueCtrl/ElectricSheep/commit/c2f68650e239fe205d14d59608bd286f8716f848))
* Update documentation to prioritize OpenClaw extension installation and usage, and refine standalone CLI instructions. ([d26dbfc](https://github.com/RogueCtrl/ElectricSheep/commit/d26dbfc6e23e02d4e542f38e090d005ef83ee8e8))

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
