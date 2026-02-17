# Reference: API Catalog

## Intent
- Provide one canonical signature and options catalog for Mineflayer TypeScript usage.
- Keep this document catalog-oriented, not policy-oriented.

## Scope
- Owns:
  - API signature references
  - options/event catalog tables
  - concise source anchors
- Does not own:
  - normative runtime policy (see `../spec/runtime.md`)
  - deep action semantics (see `../spec/action-api.md`)
  - implementation workflow (see `../guides/implementation.md`)

## Core Imports
```ts
import mineflayer, { type Bot, type BotOptions, type Plugin } from 'mineflayer'
import { Vec3 } from 'vec3'
```

## `createBot` and `BotOptions`

### Constructor signatures
```ts
createBot(options: { client: Client } & Partial<BotOptions>): Bot
createBot(options: BotOptions): Bot
```

### High-value options
| Option | Type | Runtime Default (source behavior) | Notes |
|---|---|---|---|
| `host` | `string` | `localhost` | server host |
| `port` | `number` | `25565` | server port |
| `username` | `string` | `'Player'` | offline default name |
| `version` | `string \| false` | `false` | auto negotiate |
| `auth` | `'offline' \| 'mojang' \| 'microsoft'` | protocol/client behavior | auth path |
| `logErrors` | `boolean` | `true` | runtime logging policy |
| `hideErrors` | `boolean` | `false` | suppress output |
| `loadInternalPlugins` | `boolean` | `true` | internal plugin loading |
| `plugins` | `Record<string, boolean \| Plugin>` | `{}` | override/disable/inject plugins |
| `brand` | `string` | `'vanilla'` | client brand |
| `respawn` | `boolean` | `true` | auto respawn behavior |

## Lifecycle Events (selected)
| Event | Payload | Practical use |
|---|---|---|
| `connect` | none | transport connected |
| `inject_allowed` | none | plugin-safe gate |
| `login` | none | post-auth session start |
| `game` | none | game state sync point |
| `spawn` | none | world-usable state |
| `respawn` | none | death/respawn cycle |
| `end` | `reason` | disconnect handling |
| `error` | `Error` | runtime failure handling |

## Chat APIs
| API | Signature |
|---|---|
| `chat` | `(message: string) => void` |
| `whisper` | `(username: string, message: string) => void` |
| `addChatPattern` | `(name: string, pattern: RegExp, options?) => number` |
| `addChatPatternSet` | `(name: string, patterns: RegExp[], options?) => number` |
| `removeChatPattern` | `(nameOrId: string \| number) => void` |
| `awaitMessage` | `(...args: string[] \| RegExp[]) => Promise<string>` |

## Movement and Orientation APIs
| API | Signature |
|---|---|
| `setControlState` | `(control, state) => void` |
| `clearControlStates` | `() => void` |
| `lookAt` | `(point: Vec3, force?: boolean) => Promise<void>` |
| `look` | `(yaw: number, pitch: number, force?: boolean) => Promise<void>` |
| `waitForTicks` | `(ticks: number) => Promise<void>` |

## World and Block APIs
| API | Signature |
|---|---|
| `blockAt` | `(point: Vec3, extraInfos?) => Block \| null` |
| `findBlock` | `(options) => Block \| null` |
| `findBlocks` | `(options) => Vec3[]` |
| `canSeeBlock` | `(block) => boolean` |
| `waitForChunksToLoad` | `() => Promise<void>` |

## High-Risk Action APIs
| API | Signature |
|---|---|
| `canDigBlock` | `(block: Block) => boolean` |
| `dig` | `(block, forceLook?, digFace?) => Promise<void>` |
| `stopDigging` | `() => void` |
| `digTime` | `(block: Block) => number` |
| `placeBlock` | `(referenceBlock, faceVector) => Promise<void>` |
| `placeEntity` | `(referenceBlock, faceVector) => Promise<Entity>` |
| `activateBlock` | `(block, direction?, cursorPos?) => Promise<void>` |
| `updateSign` | `(block, text, back?) => void` |

For normative behavior and fallback rules, see:
- `../spec/action-api.md`

## Inventory and Container APIs (selected)
| API | Signature |
|---|---|
| `equip` | `(item, destination) => Promise<void>` |
| `unequip` | `(destination) => Promise<void>` |
| `toss` | `(itemType, metadata, count) => Promise<void>` |
| `openChest` | `(blockOrEntity, direction?, cursorPos?) => Promise<Chest>` |
| `openFurnace` | `(block) => Promise<Furnace>` |
| `openVillager` | `(entity) => Promise<Villager>` |
| `trade` | `(villager, tradeIndex, times?) => Promise<void>` |

## Events for Action Evidence
| Event | Typical source use |
|---|---|
| `diggingCompleted` | dig success confirmation |
| `diggingAborted` | dig cancellation/interruption |
| `blockPlaced` | block placement confirmation |
| `blockUpdate` | generic world mutation evidence |
| `entitySpawn` | placement/interact follow-up evidence |
| `windowOpen` | container activation confirmation |

## Drift Pointers
- When type/docs/runtime differ, runtime implementation is behavior authority.
- Record known mismatches in spec docs:
  - `../spec/runtime.md`
  - `../spec/action-api.md`

## Source Anchors
- Type declarations:
  - `/Users/user/git/gigio1023/mineflayer/index.d.ts`
- API documentation:
  - `/Users/user/git/gigio1023/mineflayer/docs/api.md`
- Runtime implementation:
  - `/Users/user/git/gigio1023/mineflayer/lib/loader.js`
  - `/Users/user/git/gigio1023/mineflayer/lib/plugins/*`
