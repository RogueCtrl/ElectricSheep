# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

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
