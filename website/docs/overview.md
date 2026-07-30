---
sidebar_position: 1
title: Overview
description: The premise and current scope of Dream of One.
---

# A town that investigates you

Dream of One is a first-person 3D social simulation. Six persistent residents
move through one small town, meet without the player, remember what they
encounter, and use a language model to judge the player's words.

You arrive as an outsider. Before a scheduled hearing at the Station, you need
to change what the residents believe about you through conversation. Four
residents need meaningful first-hand grounds to vouch for you, though the
selected model still owns every testimony and the final ordinary or abnormal
verdict.

## What makes the simulation different

- **Conversation changes state.** Residents remember the words they actually
  heard and can carry those claims into later meetings.
- **The society acts off-screen.** NPC schedules and meetings continue while
  the player explores the park, Studio, Office, and Station.
- **Consequences keep their source.** Encountered stance changes, records, and
  testimony retain enough provenance for the player to understand what caused
  them.
- **Provider failure stops the event.** The runtime never substitutes authored
  speech, judgment, memory, or a verdict when a model call fails.

## Current status

The repository contains an active playable prototype. The seamless low-fi town,
six-resident runtime, conversations, NPC meetings, records, both hearing
outcomes, and six locale paths are implemented. Visual polish and final
milestone acceptance remain in progress. There is no packaged public release
yet.

For implementation detail, see [Architecture](./architecture.md). The
[GitHub repository](https://github.com/gigio1023/dream-of-one) remains the
source of truth for development status.
