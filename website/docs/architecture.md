---
sidebar_position: 2
title: Architecture
description: How Dream of One separates presentation, validity, and model judgment.
---

# Model judgment inside deterministic boundaries

Dream of One separates the game into three layers. Each layer owns a different
kind of truth.

| Layer | Owns | Does not own |
| --- | --- | --- |
| Godot client | First-person presentation, input, physics, and observed spatial facts | Suspicion, records, testimony, or verdicts |
| TypeScript runtime | Context separation, tool validation, clamps, memory, records, scheduling, and run lifecycle | NPC wording or social meaning |
| AI provider | NPC speech, reply suggestions, proposed actions, stance judgment, testimony, and the hearing verdict | Direct world mutation or unseen context |

## One provider boundary

Game logic depends on `NpcProposalPort`. Provider-specific transport stays
behind `TextGenPort` adapters, while profile configuration selects the model at
runtime. A provider returns a proposal. The runtime validates that proposal
against what the resident could see, hear, remember, and legally do before any
world state changes.

The same boundary supports OpenAI Responses, OpenAI-compatible Chat
Completions endpoints, and deterministic test adapters. Scripted output cannot
be selected by production configuration.

## Failure is part of the contract

If a live result fails its schema or grounding checks, the runtime may request
one repair from the same model. A second failure interrupts that exact event.
No speech, social judgment, action, memory, testimony, or verdict is invented
to keep the scene moving.

This division keeps the model responsible for meaning while deterministic code
protects validity and provenance.
