# Dream of One — R3F Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the Dream of One detective simulation from broken Unity to React Three Fiber, creating a playable 3D browser game with the full violation → suspicion → report → interrogation → verdict loop.

**Architecture:** Zustand stores hold all game state (events, suspicion, reports, session). Renderless system components run logic each frame via `useFrame`. 3D entities are React components with Rapier physics for collision/sensors. UI is standard React HTML overlay outside `<Canvas>`. Game logic is pure TypeScript, fully testable without 3D.

**Tech Stack:** React 19, TypeScript, Vite, Three.js, @react-three/fiber 9, @react-three/drei 10, @react-three/rapier 2, ecctrl, zustand 5, pathfinding, vitest

**Design Spec Source:** The 38 C# scripts in `draem-of-one/Assets/Scripts/` serve as the authoritative design specification. All constants, thresholds, and logic flows are extracted from them.

---

## File Structure

```
game/                              # New directory at repo root
├── package.json
├── tsconfig.json
├── tsconfig.app.json
├── vite.config.ts
├── vitest.config.ts
├── index.html
├── public/
├── src/
│   ├── main.tsx                   # ReactDOM entry
│   ├── App.tsx                    # Canvas + Physics + UI shell
│   ├── types.ts                   # EventRecord, EventType, enums
│   ├── constants.ts               # All game constants from C# spec
│   │
│   ├── stores/
│   │   ├── eventStore.ts          # WorldEventLog equivalent (circular buffer)
│   │   ├── suspicionStore.ts      # Per-NPC suspicion + global G
│   │   ├── reportStore.ts         # Report queue + interrogation conditions
│   │   ├── gameStore.ts           # Session state (phase, timer)
│   │   └── uiStore.ts            # Toast, prompt, interrogation text
│   │
│   ├── systems/                   # Renderless components (return null, use useFrame)
│   │   ├── SuspicionDecay.tsx     # Passive decay each frame
│   │   ├── ViolationResponse.tsx  # Violation events → NPC suspicion updates
│   │   ├── ReportCheck.tsx        # Monitor report conditions
│   │   ├── PoliceAI.tsx           # Police 4-state machine
│   │   ├── SessionTimer.tsx       # 25-min timer + end conditions
│   │   └── PathfindingGrid.tsx    # Grid A* setup + NPC path queries
│   │
│   ├── entities/                  # 3D components (mesh + collider + behavior)
│   │   ├── Player.tsx             # Ecctrl character + E/F interaction
│   │   ├── NPC.tsx                # Capsule + SimplePatrol
│   │   ├── Police.tsx             # Capsule + path-following movement
│   │   ├── TriggerZone.tsx        # Rapier sensor box + visual indicator
│   │   └── ConvenienceStore.tsx   # Floor, walls, shelves, counter (box geometry)
│   │
│   ├── ui/                        # React HTML overlay (outside Canvas)
│   │   ├── HUD.tsx                # Container for all UI elements
│   │   ├── SuspicionBar.tsx       # Global G meter
│   │   ├── EventLog.tsx           # Last 5 events feed
│   │   ├── Toast.tsx              # Temporary notification popup
│   │   ├── InterrogationPanel.tsx # Verdict display panel
│   │   └── InteractionPrompt.tsx  # "E: Interact" / "F: Photo" prompt
│   │
│   ├── utils/
│   │   ├── semanticShaper.ts      # EventRecord → Korean text
│   │   ├── dialogueLimiter.ts     # 80-char text clamp
│   │   └── gridPathfinding.ts     # Grid A* wrapper around pathfinding lib
│   │
│   └── __tests__/
│       ├── eventStore.test.ts
│       ├── suspicionStore.test.ts
│       ├── reportStore.test.ts
│       ├── policeAI.test.ts
│       ├── semanticShaper.test.ts
│       ├── dialogueLimiter.test.ts
│       └── gridPathfinding.test.ts
```

---

## Phase 1: Foundation (No 3D)

### Task 1: Project Scaffolding

**Files:**
- Create: `game/package.json`, `game/tsconfig.json`, `game/tsconfig.app.json`, `game/vite.config.ts`, `game/vitest.config.ts`, `game/index.html`, `game/src/main.tsx`

- [ ] **Step 1: Scaffold Vite project**

```bash
cd /Users/naem1023/git/dream-of-one
npm create vite@latest game -- --template react-ts
```

- [ ] **Step 2: Install dependencies**

```bash
cd game
npm install three @react-three/fiber @react-three/drei @react-three/rapier ecctrl zustand pathfinding
npm install -D @types/three vitest @testing-library/react jsdom
```

If `@types/pathfinding` is not available, create `game/src/pathfinding.d.ts`:
```typescript
declare module 'pathfinding'
```

- [ ] **Step 3: Configure vitest**

Create `game/vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
  },
})
```

Add to `game/package.json` scripts:
```json
"test": "vitest",
"test:run": "vitest run"
```

- [ ] **Step 4: Verify setup**

```bash
cd game && npm run build
```
Expected: Build succeeds with no errors.

- [ ] **Step 5: Commit**

```bash
git add game/
git commit -m "feat: scaffold R3F project with Vite + React 19 + TypeScript"
```

---

### Task 2: Core Types & Constants

**Files:**
- Create: `game/src/types.ts`, `game/src/constants.ts`

- [ ] **Step 1: Define all TypeScript types**

Create `game/src/types.ts`:
```typescript
// === Event System ===

export enum EventType {
  EnteredZone = 'EnteredZone',
  ExitedZone = 'ExitedZone',
  ViolationDetected = 'ViolationDetected',
  SuspicionUpdated = 'SuspicionUpdated',
  ReportFiled = 'ReportFiled',
  InterrogationStarted = 'InterrogationStarted',
  VerdictGiven = 'VerdictGiven',
}

export enum EventCategory {
  Movement = 'Movement',
  Zone = 'Zone',
  Rule = 'Rule',
  Suspicion = 'Suspicion',
  Report = 'Report',
  Verdict = 'Verdict',
}

export interface EventRecord {
  id: string
  stamp: number           // seconds since game start
  eventType: EventType
  category: EventCategory
  actorId: string
  actorRole: string       // 'Player' | 'Citizen' | 'Police'
  targetId: string
  zoneId: string
  ruleId: string
  delta: number           // suspicion change
  note: string
  severity: number        // 0-3
}

// === Zones ===

export enum ZoneType {
  None = 'None',
  Queue = 'Queue',
  Seat = 'Seat',
  Photo = 'Photo',
}

export interface ZoneConfig {
  id: string
  type: ZoneType
  ruleId: string
  position: [number, number, number]
  size: [number, number, number]
  suspicionDelta: number
  promptText: string
}

// === NPCs ===

export interface NPCConfig {
  id: string
  role: string
  color: string
  position: [number, number, number]
  waypoints: [number, number, number][]
  patrolSpeed: number
}

export interface NPCSuspicion {
  npcId: string
  suspicion: number       // 0-100
  reported: boolean
  lastReportTime: number
  lastEventId: string
}

// === Reports ===

export interface ReportEntry {
  timestamp: number
  reporterId: string
  ruleId: string
  eventId: string
}

export enum ReportReason {
  RepeatedRuleBreak = 'RepeatedRuleBreak',
  HighGlobalG = 'HighGlobalG',
  Scripted = 'Scripted',
}

export interface ReportEnvelope {
  reportId: string
  reporterIds: string[]
  attachedEventIds: string[]
  reason: ReportReason
  resolved: boolean
}

// === Police ===

export enum PoliceState {
  Patrol = 'Patrol',
  MoveToPlayer = 'MoveToPlayer',
  Interrogate = 'Interrogate',
  Cooldown = 'Cooldown',
}

// === Game Session ===

export enum GamePhase {
  Playing = 'Playing',
  Interrogating = 'Interrogating',
  Ended = 'Ended',
}

export type EndReason = 'time_limit' | 'global_awareness' | null
```

- [ ] **Step 2: Define all game constants**

Create `game/src/constants.ts`:
```typescript
import { ZoneConfig, NPCConfig, ZoneType } from './types'

// === Suspicion ===
export const MAX_SUSPICION = 100
export const SUSPICION_DECAY_PER_SECOND = 0.5
export const REPORT_THRESHOLD = 50
export const REPORT_COOLDOWN_SECONDS = 20

// === Global Suspicion ===
export const GLOBAL_SUSPICION_INTERROGATION_THRESHOLD = 0.3
// End threshold is higher than interrogation — game doesn't end on first interrogation
// Tune this in Task 19 after playtesting
export const GLOBAL_SUSPICION_END_THRESHOLD = 0.7

// === Reports ===
export const REPORTS_REQUIRED = 2
export const INTERROGATION_COOLDOWN_SECONDS = 20
export const REPORT_WINDOW_SECONDS = 45
export const MAX_ATTACHED_EVENTS = 3

// === Police ===
export const POLICE_INTERROGATION_DISTANCE = 2.0
export const POLICE_COOLDOWN_SECONDS = 5
export const POLICE_MOVE_SPEED = 2.5
export const INTERROGATION_DELAY_SECONDS = 2
export const MAX_INTERROGATION_CHARS = 80

// === Player ===
export const PLAYER_MOVE_SPEED = 4.0
export const PLAYER_GRAVITY = -9.81
export const INTERACTION_COOLDOWN_SECONDS = 0.5

// === Session ===
export const SESSION_DURATION_SECONDS = 25 * 60 // 1500

// === Event Log ===
export const EVENT_BUFFER_SIZE = 512
export const UI_LOG_LINE_COUNT = 5
export const TOAST_DURATION_SECONDS = 3

// === Rule Deltas ===
export const RULE_DELTAS: Record<string, number> = {
  R4: 30,   // Queue / Etiquette
  R5: 20,   // Seat / Courtesy
  R10: 15,  // Photo / Privacy
}
export const DEFAULT_SUSPICION_DELTA = 10

// === NPC Patrol ===
export const NPC_PATROL_SPEED = 1.2
export const NPC_ARRIVAL_THRESHOLD = 0.2

// === Camera ===
export const CAMERA_OFFSET: [number, number, number] = [0, 8, -8]

// === Pathfinding Grid ===
export const GRID_CELL_SIZE = 0.5
export const STORE_WIDTH = 14   // 7*2 (ground scale 7)
export const STORE_DEPTH = 14

// === Zone Configs ===
export const ZONES: ZoneConfig[] = [
  {
    id: 'queue-zone',
    type: ZoneType.Queue,
    ruleId: 'R4',
    position: [-5, 1, 3],
    size: [3, 2, 3],
    suspicionDelta: 30,
    promptText: 'E: 줄서기 규칙 위반',
  },
  {
    id: 'seat-zone',
    type: ZoneType.Seat,
    ruleId: 'R5',
    position: [4, 1, 3],
    size: [3, 2, 3],
    suspicionDelta: 20,
    promptText: 'E: 자리양보 규칙 위반',
  },
  {
    id: 'photo-zone',
    type: ZoneType.Photo,
    ruleId: 'R10',
    position: [0, 1, -4],
    size: [3, 2, 3],
    suspicionDelta: 15,
    promptText: 'E: 사진촬영 규칙 위반',
  },
]

// === NPC Configs ===
export const NPCS: NPCConfig[] = [
  {
    id: 'clerk',
    role: 'Citizen',
    color: '#4a90d9',
    position: [-3, 0, 2],
    waypoints: [[-4.5, 0, 0.5], [-1.5, 0, 3.5]],
    patrolSpeed: NPC_PATROL_SPEED,
  },
  {
    id: 'elder',
    role: 'Citizen',
    color: '#d4a574',
    position: [4, 0, 2],
    waypoints: [[2.5, 0, 0.5], [5.5, 0, 3.5]],
    patrolSpeed: NPC_PATROL_SPEED,
  },
  {
    id: 'tourist',
    role: 'Citizen',
    color: '#7bc47f',
    position: [0, 0, 4],
    waypoints: [[-1.5, 0, 2.5], [1.5, 0, 5.5]],
    patrolSpeed: NPC_PATROL_SPEED,
  },
]

export const POLICE_CONFIG: NPCConfig = {
  id: 'police',
  role: 'Police',
  color: '#2c3e50',
  position: [0, 0, -6],
  waypoints: [[-2, 0, -6], [2, 0, -6]],
  patrolSpeed: POLICE_MOVE_SPEED,
}

// === Environment ===
export const GROUND_SIZE = 14 // 7 * 2
export const WALL_HEIGHT = 3
export const WALL_THICKNESS = 0.2
```

- [ ] **Step 3: Commit**

```bash
git add game/src/types.ts game/src/constants.ts
git commit -m "feat: add core TypeScript types and game constants"
```

---

### Task 3: Event Store (TDD)

**Files:**
- Create: `game/src/stores/eventStore.ts`
- Test: `game/src/__tests__/eventStore.test.ts`

- [ ] **Step 1: Write failing tests**

Create `game/src/__tests__/eventStore.test.ts`:
```typescript
import { describe, test, expect, beforeEach } from 'vitest'
import { useEventStore } from '../stores/eventStore'
import { EventType, EventCategory } from '../types'

beforeEach(() => {
  useEventStore.getState().reset()
})

describe('eventStore', () => {
  test('records an event with auto-generated id and stamp', () => {
    const store = useEventStore.getState()
    store.recordEvent({
      eventType: EventType.ViolationDetected,
      actorId: 'player',
      actorRole: 'Player',
      ruleId: 'R4',
      severity: 2,
    })

    const events = store.events
    expect(events).toHaveLength(1)
    expect(events[0].id).toBeTruthy()
    expect(events[0].stamp).toBeGreaterThanOrEqual(0)
    expect(events[0].category).toBe(EventCategory.Rule)
  })

  test('infers category from eventType', () => {
    const store = useEventStore.getState()
    store.recordEvent({ eventType: EventType.EnteredZone, actorId: 'player', actorRole: 'Player', zoneId: 'z1' })
    store.recordEvent({ eventType: EventType.ReportFiled, actorId: 'clerk', actorRole: 'Citizen' })

    expect(store.events[0].category).toBe(EventCategory.Zone)
    expect(store.events[1].category).toBe(EventCategory.Report)
  })

  test('getRecent returns last N events', () => {
    const store = useEventStore.getState()
    for (let i = 0; i < 10; i++) {
      store.recordEvent({ eventType: EventType.SuspicionUpdated, actorId: `npc-${i}`, actorRole: 'Citizen' })
    }
    const recent = store.getRecent(3)
    expect(recent).toHaveLength(3)
    expect(recent[0].actorId).toBe('npc-7')
  })

  test('circular buffer drops oldest when full', () => {
    const store = useEventStore.getState()
    // Record more than buffer size
    for (let i = 0; i < 520; i++) {
      store.recordEvent({ eventType: EventType.SuspicionUpdated, actorId: `npc-${i}`, actorRole: 'Citizen' })
    }
    expect(store.events.length).toBeLessThanOrEqual(512)
    expect(store.totalEvents).toBe(520)
  })

  test('subscribers are notified on new event', () => {
    const store = useEventStore.getState()
    const received: string[] = []
    store.onEvent((event) => received.push(event.actorId))

    store.recordEvent({ eventType: EventType.ViolationDetected, actorId: 'test-actor', actorRole: 'Player' })

    expect(received).toEqual(['test-actor'])
  })

  test('reset clears all state', () => {
    const store = useEventStore.getState()
    store.recordEvent({ eventType: EventType.ViolationDetected, actorId: 'x', actorRole: 'Player' })
    store.reset()
    expect(store.events).toHaveLength(0)
    expect(store.totalEvents).toBe(0)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd game && npx vitest run src/__tests__/eventStore.test.ts
```
Expected: FAIL (module not found)

- [ ] **Step 3: Implement eventStore**

Create `game/src/stores/eventStore.ts`:
```typescript
import { create } from 'zustand'
import { EventRecord, EventType, EventCategory } from '../types'
import { EVENT_BUFFER_SIZE } from '../constants'

const CATEGORY_MAP: Record<EventType, EventCategory> = {
  [EventType.EnteredZone]: EventCategory.Zone,
  [EventType.ExitedZone]: EventCategory.Zone,
  [EventType.ViolationDetected]: EventCategory.Rule,
  [EventType.SuspicionUpdated]: EventCategory.Suspicion,
  [EventType.ReportFiled]: EventCategory.Report,
  [EventType.InterrogationStarted]: EventCategory.Verdict,
  [EventType.VerdictGiven]: EventCategory.Verdict,
}

type EventListener = (event: EventRecord) => void

interface EventStore {
  events: EventRecord[]
  totalEvents: number
  _listeners: EventListener[]
  _startTime: number

  recordEvent: (partial: Partial<EventRecord> & { eventType: EventType; actorId: string; actorRole: string }) => void
  getRecent: (count: number) => EventRecord[]
  onEvent: (listener: EventListener) => () => void
  reset: () => void
}

export const useEventStore = create<EventStore>((set, get) => ({
  events: [],
  totalEvents: 0,
  _listeners: [],
  _startTime: Date.now(),

  recordEvent: (partial) => {
    const state = get()
    const record: EventRecord = {
      id: partial.id || Math.random().toString(36).slice(2),
      stamp: (Date.now() - state._startTime) / 1000,
      eventType: partial.eventType,
      category: partial.category || CATEGORY_MAP[partial.eventType],
      actorId: partial.actorId,
      actorRole: partial.actorRole,
      targetId: partial.targetId || '',
      zoneId: partial.zoneId || '',
      ruleId: partial.ruleId || '',
      delta: partial.delta || 0,
      note: partial.note || '',
      severity: partial.severity || 0,
    }

    set((s) => {
      const next = [...s.events, record]
      if (next.length > EVENT_BUFFER_SIZE) {
        next.shift()
      }
      return { events: next, totalEvents: s.totalEvents + 1 }
    })

    // Notify listeners outside of set
    state._listeners.forEach((fn) => fn(record))
  },

  getRecent: (count) => {
    const { events } = get()
    return events.slice(-count)
  },

  // Named "onEvent" to avoid collision with Zustand's built-in "subscribe"
  onEvent: (listener) => {
    set((s) => ({ _listeners: [...s._listeners, listener] }))
    return () => {
      set((s) => ({ _listeners: s._listeners.filter((fn) => fn !== listener) }))
    }
  },

  reset: () => set({ events: [], totalEvents: 0, _listeners: [], _startTime: Date.now() }),
}))
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd game && npx vitest run src/__tests__/eventStore.test.ts
```
Expected: All 6 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add game/src/stores/eventStore.ts game/src/__tests__/eventStore.test.ts
git commit -m "feat: add event store with circular buffer and subscription system"
```

---

### Task 4: Suspicion Store (TDD)

**Files:**
- Create: `game/src/stores/suspicionStore.ts`
- Test: `game/src/__tests__/suspicionStore.test.ts`

- [ ] **Step 1: Write failing tests**

Create `game/src/__tests__/suspicionStore.test.ts`:
```typescript
import { describe, test, expect, beforeEach } from 'vitest'
import { useSuspicionStore } from '../stores/suspicionStore'

beforeEach(() => {
  useSuspicionStore.getState().reset()
})

describe('suspicionStore', () => {
  test('registers NPCs with zero suspicion', () => {
    const store = useSuspicionStore.getState()
    store.registerNPC('clerk')
    store.registerNPC('elder')

    expect(store.npcs.clerk.suspicion).toBe(0)
    expect(store.npcs.elder.suspicion).toBe(0)
    expect(store.globalG).toBe(0)
  })

  test('addSuspicion increases NPC suspicion clamped to 100', () => {
    const store = useSuspicionStore.getState()
    store.registerNPC('clerk')
    store.addSuspicion('clerk', 30, 'R4', 'evt-1')
    expect(store.npcs.clerk.suspicion).toBe(30)

    store.addSuspicion('clerk', 80, 'R4', 'evt-2')
    expect(store.npcs.clerk.suspicion).toBe(100)
  })

  test('duplicate event ID is ignored', () => {
    const store = useSuspicionStore.getState()
    store.registerNPC('clerk')
    store.addSuspicion('clerk', 30, 'R4', 'evt-1')
    store.addSuspicion('clerk', 30, 'R4', 'evt-1')
    expect(store.npcs.clerk.suspicion).toBe(30)
  })

  test('globalG is average of all NPC normalized suspicions', () => {
    const store = useSuspicionStore.getState()
    store.registerNPC('clerk')
    store.registerNPC('elder')
    store.registerNPC('tourist')

    store.addSuspicion('clerk', 50, 'R4', 'e1')
    store.addSuspicion('elder', 100, 'R5', 'e2')
    // tourist stays at 0

    // G = (50/100 + 100/100 + 0/100) / 3 = 1.5/3 = 0.5
    expect(store.globalG).toBeCloseTo(0.5)
  })

  test('decay reduces suspicion over time', () => {
    const store = useSuspicionStore.getState()
    store.registerNPC('clerk')
    store.addSuspicion('clerk', 10, 'R4', 'e1')

    store.decayAll(2) // 2 seconds * 0.5/sec = 1 decay
    expect(store.npcs.clerk.suspicion).toBeCloseTo(9)
  })

  test('decay does not go below zero', () => {
    const store = useSuspicionStore.getState()
    store.registerNPC('clerk')
    store.addSuspicion('clerk', 0.1, 'R4', 'e1')
    store.decayAll(10)
    expect(store.npcs.clerk.suspicion).toBe(0)
  })

  test('shouldReport returns true when suspicion >= threshold and not yet reported', () => {
    const store = useSuspicionStore.getState()
    store.registerNPC('clerk')
    store.addSuspicion('clerk', 50, 'R4', 'e1')

    expect(store.shouldReport('clerk', 100)).toBe(true)
  })

  test('shouldReport returns false after already reported', () => {
    const store = useSuspicionStore.getState()
    store.registerNPC('clerk')
    store.addSuspicion('clerk', 50, 'R4', 'e1')
    store.markReported('clerk', 100)

    expect(store.shouldReport('clerk', 200)).toBe(false)
  })

  test('resetAfterInterrogation clears suspicion and reported flag', () => {
    const store = useSuspicionStore.getState()
    store.registerNPC('clerk')
    store.addSuspicion('clerk', 80, 'R4', 'e1')
    store.markReported('clerk', 100)
    store.resetAfterInterrogation('clerk')

    expect(store.npcs.clerk.suspicion).toBe(0)
    expect(store.npcs.clerk.reported).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd game && npx vitest run src/__tests__/suspicionStore.test.ts
```

- [ ] **Step 3: Implement suspicionStore**

Create `game/src/stores/suspicionStore.ts`:
```typescript
import { create } from 'zustand'
import { NPCSuspicion } from '../types'
import {
  MAX_SUSPICION,
  SUSPICION_DECAY_PER_SECOND,
  REPORT_THRESHOLD,
  REPORT_COOLDOWN_SECONDS,
} from '../constants'

interface SuspicionStore {
  npcs: Record<string, NPCSuspicion>
  globalG: number

  registerNPC: (npcId: string) => void
  addSuspicion: (npcId: string, delta: number, ruleId: string, eventId: string) => void
  decayAll: (deltaTime: number) => void
  shouldReport: (npcId: string, now: number) => boolean
  markReported: (npcId: string, now: number) => void
  resetAfterInterrogation: (npcId: string) => void
  recalculateG: () => void
  reset: () => void
}

function calcGlobalG(npcs: Record<string, NPCSuspicion>): number {
  const values = Object.values(npcs)
  if (values.length === 0) return 0
  const sum = values.reduce((acc, n) => acc + Math.min(1, n.suspicion / MAX_SUSPICION), 0)
  return sum / values.length
}

export const useSuspicionStore = create<SuspicionStore>((set, get) => ({
  npcs: {},
  globalG: 0,

  registerNPC: (npcId) =>
    set((s) => {
      const npcs = {
        ...s.npcs,
        [npcId]: { npcId, suspicion: 0, reported: false, lastReportTime: -999, lastEventId: '' },
      }
      return { npcs, globalG: calcGlobalG(npcs) }
    }),

  addSuspicion: (npcId, delta, _ruleId, eventId) =>
    set((s) => {
      const npc = s.npcs[npcId]
      if (!npc || npc.lastEventId === eventId) return s
      const npcs = {
        ...s.npcs,
        [npcId]: {
          ...npc,
          suspicion: Math.min(MAX_SUSPICION, Math.max(0, npc.suspicion + delta)),
          lastEventId: eventId,
        },
      }
      return { npcs, globalG: calcGlobalG(npcs) }
    }),

  decayAll: (deltaTime) =>
    set((s) => {
      const decay = SUSPICION_DECAY_PER_SECOND * deltaTime
      const npcs: Record<string, NPCSuspicion> = {}
      for (const [id, npc] of Object.entries(s.npcs)) {
        npcs[id] = { ...npc, suspicion: Math.max(0, npc.suspicion - decay) }
      }
      return { npcs, globalG: calcGlobalG(npcs) }
    }),

  shouldReport: (npcId, now) => {
    const npc = get().npcs[npcId]
    if (!npc) return false
    return (
      !npc.reported &&
      npc.suspicion >= REPORT_THRESHOLD &&
      now - npc.lastReportTime >= REPORT_COOLDOWN_SECONDS
    )
  },

  markReported: (npcId, now) =>
    set((s) => ({
      npcs: {
        ...s.npcs,
        [npcId]: { ...s.npcs[npcId], reported: true, lastReportTime: now },
      },
    })),

  resetAfterInterrogation: (npcId) =>
    set((s) => {
      const npcs = {
        ...s.npcs,
        [npcId]: { ...s.npcs[npcId], suspicion: 0, reported: false, lastReportTime: -999, lastEventId: '' },
      }
      return { npcs, globalG: calcGlobalG(npcs) }
    }),

  recalculateG: () => set((s) => ({ globalG: calcGlobalG(s.npcs) })),

  reset: () => set({ npcs: {}, globalG: 0 }),
}))
```

- [ ] **Step 4: Run tests**

```bash
cd game && npx vitest run src/__tests__/suspicionStore.test.ts
```
Expected: All 9 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add game/src/stores/suspicionStore.ts game/src/__tests__/suspicionStore.test.ts
git commit -m "feat: add suspicion store with per-NPC tracking and global G"
```

---

### Task 5: Report Store (TDD)

**Files:**
- Create: `game/src/stores/reportStore.ts`
- Test: `game/src/__tests__/reportStore.test.ts`

- [ ] **Step 1: Write failing tests**

Create `game/src/__tests__/reportStore.test.ts`:
```typescript
import { describe, test, expect, beforeEach } from 'vitest'
import { useReportStore } from '../stores/reportStore'

beforeEach(() => {
  useReportStore.getState().reset()
})

describe('reportStore', () => {
  test('fileReport adds to recent reports', () => {
    const store = useReportStore.getState()
    store.fileReport('clerk', 'R4', 55, 'e1', 10)
    expect(store.recentReports).toHaveLength(1)
    expect(store.recentReports[0].reporterId).toBe('clerk')
  })

  test('canTriggerInterrogation requires 2+ reports and G >= 0.3', () => {
    const store = useReportStore.getState()
    store.fileReport('clerk', 'R4', 55, 'e1', 10)
    expect(store.canTriggerInterrogation(0.3, 30)).toBe(false) // only 1 report

    store.fileReport('elder', 'R5', 60, 'e2', 11)
    expect(store.canTriggerInterrogation(0.3, 30)).toBe(true)
  })

  test('canTriggerInterrogation fails if G < 0.3', () => {
    const store = useReportStore.getState()
    store.fileReport('clerk', 'R4', 55, 'e1', 10)
    store.fileReport('elder', 'R5', 60, 'e2', 11)
    expect(store.canTriggerInterrogation(0.2, 30)).toBe(false)
  })

  test('canTriggerInterrogation respects cooldown', () => {
    const store = useReportStore.getState()
    store.fileReport('clerk', 'R4', 55, 'e1', 10)
    store.fileReport('elder', 'R5', 60, 'e2', 11)
    store.consumeReports(12, 0.5) // consumes at time=12

    store.fileReport('clerk', 'R4', 55, 'e3', 15)
    store.fileReport('elder', 'R5', 60, 'e4', 16)
    // cooldown is 20s, now=16, last=12 → 4s elapsed < 20s
    expect(store.canTriggerInterrogation(0.5, 16)).toBe(false)
    // now=35 → 23s elapsed > 20s
    expect(store.canTriggerInterrogation(0.5, 35)).toBe(true)
  })

  test('expired reports are pruned', () => {
    const store = useReportStore.getState()
    store.fileReport('clerk', 'R4', 55, 'e1', 10) // at time=10
    store.fileReport('elder', 'R5', 60, 'e2', 60) // at time=60
    // At time=60, the first report (time=10) is 50s old > 45s window
    expect(store.canTriggerInterrogation(0.5, 60)).toBe(false) // only 1 valid report
  })

  test('consumeReports returns envelope and clears consumed reports', () => {
    const store = useReportStore.getState()
    store.fileReport('clerk', 'R4', 55, 'e1', 10)
    store.fileReport('elder', 'R5', 60, 'e2', 11)

    const envelope = store.consumeReports(12, 0.5)
    expect(envelope).not.toBeNull()
    expect(envelope!.reporterIds).toContain('clerk')
    expect(envelope!.reporterIds).toContain('elder')
    expect(store.recentReports).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd game && npx vitest run src/__tests__/reportStore.test.ts
```

- [ ] **Step 3: Implement reportStore**

Create `game/src/stores/reportStore.ts`:
```typescript
import { create } from 'zustand'
import { ReportEntry, ReportEnvelope, ReportReason } from '../types'
import {
  REPORTS_REQUIRED,
  INTERROGATION_COOLDOWN_SECONDS,
  REPORT_WINDOW_SECONDS,
  MAX_ATTACHED_EVENTS,
  GLOBAL_SUSPICION_INTERROGATION_THRESHOLD,
} from '../constants'

interface ReportStore {
  recentReports: ReportEntry[]
  lastInterrogationTime: number
  currentEnvelope: ReportEnvelope | null

  fileReport: (reporterId: string, ruleId: string, suspicion: number, eventId: string, now: number) => void
  canTriggerInterrogation: (globalG: number, now: number) => boolean
  consumeReports: (now: number, globalG: number) => ReportEnvelope | null
  reset: () => void
}

function pruneExpired(reports: ReportEntry[], now: number): ReportEntry[] {
  return reports.filter((r) => now - r.timestamp <= REPORT_WINDOW_SECONDS)
}

export const useReportStore = create<ReportStore>((set, get) => ({
  recentReports: [],
  lastInterrogationTime: -999,
  currentEnvelope: null,

  fileReport: (reporterId, ruleId, _suspicion, eventId, now) =>
    set((s) => ({
      recentReports: pruneExpired([...s.recentReports, { timestamp: now, reporterId, ruleId, eventId }], now),
    })),

  canTriggerInterrogation: (globalG, now) => {
    const s = get()
    if (now - s.lastInterrogationTime < INTERROGATION_COOLDOWN_SECONDS) return false
    const valid = pruneExpired(s.recentReports, now)
    if (valid.length < REPORTS_REQUIRED) return false
    if (globalG < GLOBAL_SUSPICION_INTERROGATION_THRESHOLD) return false
    return true
  },

  consumeReports: (now, globalG) => {
    const s = get()
    const valid = pruneExpired(s.recentReports, now)
    if (valid.length < REPORTS_REQUIRED) return null

    const consumed = valid.slice(-REPORTS_REQUIRED)
    const reporterIds = [...new Set(consumed.map((r) => r.reporterId))]
    const eventIds = consumed.map((r) => r.eventId).slice(-MAX_ATTACHED_EVENTS)
    const reason = globalG >= GLOBAL_SUSPICION_INTERROGATION_THRESHOLD
      ? ReportReason.HighGlobalG
      : ReportReason.RepeatedRuleBreak

    const envelope: ReportEnvelope = {
      reportId: Math.random().toString(36).slice(2),
      reporterIds,
      attachedEventIds: eventIds,
      reason,
      resolved: false,
    }

    set({
      recentReports: valid.filter((r) => !consumed.includes(r)),
      lastInterrogationTime: now,
      currentEnvelope: envelope,
    })

    return envelope
  },

  reset: () => set({ recentReports: [], lastInterrogationTime: -999, currentEnvelope: null }),
}))
```

- [ ] **Step 4: Run tests**

```bash
cd game && npx vitest run src/__tests__/reportStore.test.ts
```
Expected: All 6 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add game/src/stores/reportStore.ts game/src/__tests__/reportStore.test.ts
git commit -m "feat: add report store with time windows and interrogation conditions"
```

---

### Task 6: Game Store + UI Store

**Files:**
- Create: `game/src/stores/gameStore.ts`, `game/src/stores/uiStore.ts`

- [ ] **Step 1: Implement gameStore**

Create `game/src/stores/gameStore.ts`:
```typescript
import { create } from 'zustand'
import { GamePhase, EndReason } from '../types'

interface GameStore {
  phase: GamePhase
  elapsedSeconds: number
  endReason: EndReason
  playerPosition: [number, number, number]
  playerCurrentZone: string | null

  tick: (delta: number) => void
  setPhase: (phase: GamePhase) => void
  endGame: (reason: EndReason) => void
  setPlayerPosition: (pos: [number, number, number]) => void
  setPlayerCurrentZone: (zoneId: string | null) => void
  reset: () => void
}

export const useGameStore = create<GameStore>((set) => ({
  phase: GamePhase.Playing,
  elapsedSeconds: 0,
  endReason: null,
  playerPosition: [0, 0, 0],
  playerCurrentZone: null,

  tick: (delta) => set((s) => ({ elapsedSeconds: s.elapsedSeconds + delta })),
  setPhase: (phase) => set({ phase }),
  endGame: (reason) => set({ phase: GamePhase.Ended, endReason: reason }),
  setPlayerPosition: (pos) => set({ playerPosition: pos }),
  setPlayerCurrentZone: (zoneId) => set({ playerCurrentZone: zoneId }),
  reset: () =>
    set({
      phase: GamePhase.Playing,
      elapsedSeconds: 0,
      endReason: null,
      playerPosition: [0, 0, 0],
      playerCurrentZone: null,
    }),
}))
```

- [ ] **Step 2: Implement uiStore**

Create `game/src/stores/uiStore.ts`:
```typescript
import { create } from 'zustand'
import { UI_LOG_LINE_COUNT } from '../constants'

interface UIStore {
  logLines: string[]
  toastText: string | null
  toastTimer: number
  interrogationText: string | null
  promptText: string | null
  showPrompt: boolean

  addLogLine: (text: string) => void
  showToast: (text: string) => void
  clearToast: () => void
  tickToast: (delta: number) => void
  setInterrogationText: (text: string | null) => void
  setPrompt: (text: string | null) => void
  reset: () => void
}

export const useUIStore = create<UIStore>((set) => ({
  logLines: [],
  toastText: null,
  toastTimer: 0,
  interrogationText: null,
  promptText: null,
  showPrompt: false,

  addLogLine: (text) =>
    set((s) => ({
      logLines: [...s.logLines, text].slice(-UI_LOG_LINE_COUNT),
    })),

  showToast: (text) => set({ toastText: text, toastTimer: 3 }),
  clearToast: () => set({ toastText: null, toastTimer: 0 }),
  tickToast: (delta) =>
    set((s) => {
      if (s.toastTimer <= 0) return s
      const next = s.toastTimer - delta
      if (next <= 0) return { toastText: null, toastTimer: 0 }
      return { toastTimer: next }
    }),

  setInterrogationText: (text) => set({ interrogationText: text }),
  setPrompt: (text) => set({ promptText: text, showPrompt: text !== null }),
  reset: () =>
    set({
      logLines: [],
      toastText: null,
      toastTimer: 0,
      interrogationText: null,
      promptText: null,
      showPrompt: false,
    }),
}))
```

- [ ] **Step 3: Commit**

```bash
git add game/src/stores/gameStore.ts game/src/stores/uiStore.ts
git commit -m "feat: add game session and UI state stores"
```

---

### Task 7: Utility Functions (TDD)

**Files:**
- Create: `game/src/utils/semanticShaper.ts`, `game/src/utils/dialogueLimiter.ts`
- Test: `game/src/__tests__/semanticShaper.test.ts`, `game/src/__tests__/dialogueLimiter.test.ts`

- [ ] **Step 1: Write dialogueLimiter tests**

Create `game/src/__tests__/dialogueLimiter.test.ts`:
```typescript
import { describe, test, expect } from 'vitest'
import { clampLine } from '../utils/dialogueLimiter'

describe('dialogueLimiter', () => {
  test('returns empty for null/empty', () => {
    expect(clampLine('', 80)).toBe('')
    expect(clampLine(null as any, 80)).toBe('')
  })

  test('normalizes newlines and collapses spaces', () => {
    expect(clampLine('hello\r\nworld  test', 80)).toBe('hello world test')
  })

  test('clamps to maxChars', () => {
    const long = 'a'.repeat(100)
    expect(clampLine(long, 80)).toHaveLength(80)
  })

  test('passes through short strings unchanged', () => {
    expect(clampLine('short', 80)).toBe('short')
  })
})
```

- [ ] **Step 2: Write semanticShaper tests**

Create `game/src/__tests__/semanticShaper.test.ts`:
```typescript
import { describe, test, expect } from 'vitest'
import { eventToText } from '../utils/semanticShaper'
import { EventType, EventCategory } from '../types'

describe('semanticShaper', () => {
  test('formats ViolationDetected', () => {
    const text = eventToText({
      id: '1', stamp: 0, eventType: EventType.ViolationDetected,
      category: EventCategory.Rule, actorId: 'player', actorRole: 'Player',
      targetId: '', zoneId: '', ruleId: 'R4', delta: 0, note: '', severity: 2,
    })
    expect(text).toContain('player')
    expect(text).toContain('R4')
  })

  test('formats VerdictGiven with note', () => {
    const text = eventToText({
      id: '1', stamp: 0, eventType: EventType.VerdictGiven,
      category: EventCategory.Verdict, actorId: 'police', actorRole: 'Police',
      targetId: '', zoneId: '', ruleId: '', delta: 0, note: '외부인', severity: 3,
    })
    expect(text).toContain('외부인')
  })

  test('formats EnteredZone', () => {
    const text = eventToText({
      id: '1', stamp: 0, eventType: EventType.EnteredZone,
      category: EventCategory.Zone, actorId: 'player', actorRole: 'Player',
      targetId: '', zoneId: 'queue-zone', ruleId: '', delta: 0, note: '', severity: 0,
    })
    expect(text).toContain('queue-zone')
  })
})
```

- [ ] **Step 3: Implement utils**

Create `game/src/utils/dialogueLimiter.ts`:
```typescript
export function clampLine(input: string, maxChars: number): string {
  if (!input || maxChars <= 0) return ''
  const normalized = input.replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim()
  return normalized.length <= maxChars ? normalized : normalized.slice(0, maxChars)
}
```

Create `game/src/utils/semanticShaper.ts`:
```typescript
import { EventRecord, EventType } from '../types'

export function eventToText(record: EventRecord): string {
  switch (record.eventType) {
    case EventType.EnteredZone:
      return `${record.actorId}이(가) ${record.zoneId} 구역에 들어왔습니다.`
    case EventType.ExitedZone:
      return `${record.actorId}이(가) ${record.zoneId} 구역을 떠났습니다.`
    case EventType.ViolationDetected:
      return `${record.actorId} 규칙 위반 ${record.ruleId} 감지.${record.note ? ` (${record.note})` : ''}`
    case EventType.SuspicionUpdated:
      return `${record.actorId} 의심도 변화: ${record.note}`
    case EventType.ReportFiled:
      return `${record.actorId}이(가) ${record.ruleId} 관련 신고를 제출했습니다.`
    case EventType.InterrogationStarted:
      return '경찰 심문이 시작되었습니다.'
    case EventType.VerdictGiven:
      return `판정: ${record.note}`
    default:
      return `[${record.eventType}] ${record.actorId}`
  }
}
```

- [ ] **Step 4: Run all tests**

```bash
cd game && npx vitest run
```
Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add game/src/utils/ game/src/__tests__/semanticShaper.test.ts game/src/__tests__/dialogueLimiter.test.ts
git commit -m "feat: add semantic shaper (Korean text) and dialogue limiter utils"
```

---

### Task 8: Grid Pathfinding (TDD)

**Files:**
- Create: `game/src/utils/gridPathfinding.ts`
- Test: `game/src/__tests__/gridPathfinding.test.ts`

- [ ] **Step 1: Write failing tests**

Create `game/src/__tests__/gridPathfinding.test.ts`:
```typescript
import { describe, test, expect } from 'vitest'
import { createStoreGrid, worldToGrid, gridToWorld, findPath } from '../utils/gridPathfinding'

describe('gridPathfinding', () => {
  test('creates grid with correct dimensions', () => {
    const grid = createStoreGrid([])
    expect(grid.width).toBeGreaterThan(0)
    expect(grid.height).toBeGreaterThan(0)
  })

  test('worldToGrid and gridToWorld are inverse', () => {
    const wx = 3, wz = -2
    const [gx, gy] = worldToGrid(wx, wz)
    const [rx, rz] = gridToWorld(gx, gy)
    expect(rx).toBeCloseTo(wx, 0)
    expect(rz).toBeCloseTo(wz, 0)
  })

  test('finds path around obstacle', () => {
    // Place obstacle at (0, 0) in world space
    const obstacles = [{ x: 0, z: 0, width: 2, depth: 2 }]
    const grid = createStoreGrid(obstacles)
    const path = findPath(grid, -3, 0, 3, 0)
    expect(path.length).toBeGreaterThan(2) // not a straight line
  })

  test('returns empty path when blocked', () => {
    // Wall all the way across
    const obstacles = Array.from({ length: 28 }, (_, i) => ({
      x: -7 + i * 0.5, z: 0, width: 0.5, depth: 14,
    }))
    const grid = createStoreGrid(obstacles)
    const path = findPath(grid, -5, -5, 5, 5)
    expect(path).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd game && npx vitest run src/__tests__/gridPathfinding.test.ts
```

- [ ] **Step 3: Implement gridPathfinding**

Create `game/src/utils/gridPathfinding.ts`:
```typescript
import PF from 'pathfinding'
import { GRID_CELL_SIZE, STORE_WIDTH, STORE_DEPTH } from '../constants'

const GRID_W = Math.ceil(STORE_WIDTH / GRID_CELL_SIZE)
const GRID_H = Math.ceil(STORE_DEPTH / GRID_CELL_SIZE)
const HALF_W = STORE_WIDTH / 2
const HALF_D = STORE_DEPTH / 2

export interface Obstacle {
  x: number
  z: number
  width: number
  depth: number
}

export function worldToGrid(wx: number, wz: number): [number, number] {
  const gx = Math.round((wx + HALF_W) / GRID_CELL_SIZE)
  const gy = Math.round((wz + HALF_D) / GRID_CELL_SIZE)
  return [Math.max(0, Math.min(GRID_W - 1, gx)), Math.max(0, Math.min(GRID_H - 1, gy))]
}

export function gridToWorld(gx: number, gy: number): [number, number] {
  return [gx * GRID_CELL_SIZE - HALF_W, gy * GRID_CELL_SIZE - HALF_D]
}

export function createStoreGrid(obstacles: Obstacle[]): PF.Grid {
  const grid = new PF.Grid(GRID_W, GRID_H)

  for (const obs of obstacles) {
    const minGX = Math.floor((obs.x - obs.width / 2 + HALF_W) / GRID_CELL_SIZE)
    const maxGX = Math.ceil((obs.x + obs.width / 2 + HALF_W) / GRID_CELL_SIZE)
    const minGY = Math.floor((obs.z - obs.depth / 2 + HALF_D) / GRID_CELL_SIZE)
    const maxGY = Math.ceil((obs.z + obs.depth / 2 + HALF_D) / GRID_CELL_SIZE)

    for (let gx = minGX; gx <= maxGX; gx++) {
      for (let gy = minGY; gy <= maxGY; gy++) {
        if (gx >= 0 && gx < GRID_W && gy >= 0 && gy < GRID_H) {
          grid.setWalkableAt(gx, gy, false)
        }
      }
    }
  }

  return grid
}

const finder = new PF.AStarFinder({
  allowDiagonal: true,
  dontCrossCorners: true,
} as any)

export function findPath(
  grid: PF.Grid,
  startX: number,
  startZ: number,
  endX: number,
  endZ: number
): [number, number][] {
  const [sx, sy] = worldToGrid(startX, startZ)
  const [ex, ey] = worldToGrid(endX, endZ)
  const cloned = grid.clone()

  const rawPath = finder.findPath(sx, sy, ex, ey, cloned)
  return rawPath.map(([gx, gy]) => gridToWorld(gx, gy))
}
```

- [ ] **Step 4: Run tests**

```bash
cd game && npx vitest run src/__tests__/gridPathfinding.test.ts
```
Expected: All 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add game/src/utils/gridPathfinding.ts game/src/__tests__/gridPathfinding.test.ts
git commit -m "feat: add grid-based A* pathfinding with world/grid coordinate conversion"
```

---

## Phase 2: 3D Scene

### Task 9: App Shell + Convenience Store Environment

**Files:**
- Create: `game/src/App.tsx`, `game/src/entities/ConvenienceStore.tsx`
- Modify: `game/src/main.tsx`

- [ ] **Step 1: Create App.tsx with Canvas + Physics**

Create `game/src/App.tsx`:
```tsx
import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { Physics } from '@react-three/rapier'
import { KeyboardControls } from '@react-three/drei'
import { ConvenienceStore } from './entities/ConvenienceStore'
import { HUD } from './ui/HUD'

const keyboardMap = [
  { name: 'forward', keys: ['ArrowUp', 'KeyW'] },
  { name: 'backward', keys: ['ArrowDown', 'KeyS'] },
  { name: 'leftward', keys: ['ArrowLeft', 'KeyA'] },
  { name: 'rightward', keys: ['ArrowRight', 'KeyD'] },
  { name: 'jump', keys: ['Space'] },
  { name: 'interact', keys: ['KeyE'] },
  { name: 'photo', keys: ['KeyF'] },
]

export default function App() {
  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <KeyboardControls map={keyboardMap}>
        <Canvas shadows camera={{ position: [0, 8, -8], fov: 60 }}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 15, 5]} intensity={1} castShadow />
          <Suspense fallback={null}>
            <Physics gravity={[0, -9.81, 0]} timeStep="vary">
              <ConvenienceStore />
              {/* Player, NPCs, Zones, Systems added in later tasks */}
            </Physics>
          </Suspense>
        </Canvas>
      </KeyboardControls>
      <HUD />
    </div>
  )
}
```

- [ ] **Step 2: Create ConvenienceStore environment**

Create `game/src/entities/ConvenienceStore.tsx`:
```tsx
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import { GROUND_SIZE, WALL_HEIGHT, WALL_THICKNESS } from '../constants'

function Wall({ position, args }: { position: [number, number, number]; args: [number, number, number] }) {
  return (
    <RigidBody type="fixed" position={position}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={args} />
        <meshStandardMaterial color="#d4c5a9" />
      </mesh>
    </RigidBody>
  )
}

function Shelf({ position, args, color = '#8B4513' }: {
  position: [number, number, number]
  args: [number, number, number]
  color?: string
}) {
  return (
    <RigidBody type="fixed" position={position}>
      <mesh castShadow>
        <boxGeometry args={args} />
        <meshStandardMaterial color={color} />
      </mesh>
    </RigidBody>
  )
}

export function ConvenienceStore() {
  const half = GROUND_SIZE / 2

  return (
    <group>
      {/* Floor — explicit CuboidCollider instead of auto-collider from plane */}
      <RigidBody type="fixed">
        <CuboidCollider args={[GROUND_SIZE / 2, 0.01, GROUND_SIZE / 2]} />
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[GROUND_SIZE, GROUND_SIZE]} />
          <meshStandardMaterial color="#b8a88a" />
        </mesh>
      </RigidBody>

      {/* Walls */}
      <Wall position={[0, WALL_HEIGHT / 2, -half]} args={[GROUND_SIZE, WALL_HEIGHT, WALL_THICKNESS]} />
      <Wall position={[0, WALL_HEIGHT / 2, half]} args={[GROUND_SIZE, WALL_HEIGHT, WALL_THICKNESS]} />
      <Wall position={[-half, WALL_HEIGHT / 2, 0]} args={[WALL_THICKNESS, WALL_HEIGHT, GROUND_SIZE]} />
      <Wall position={[half, WALL_HEIGHT / 2, 0]} args={[WALL_THICKNESS, WALL_HEIGHT, GROUND_SIZE]} />

      {/* Shelves */}
      <Shelf position={[-3, 0.5, 0]} args={[1.5, 1, 4]} />
      <Shelf position={[2, 0.5, 0]} args={[1.5, 1, 4]} />

      {/* Counter */}
      <Shelf position={[-5, 0.6, 2]} args={[2, 1.2, 1]} color="#6B4226" />
    </group>
  )
}
```

- [ ] **Step 3: Create placeholder HUD**

Create `game/src/ui/HUD.tsx`:
```tsx
export function HUD() {
  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, width: '100%',
      pointerEvents: 'none', padding: '16px', color: 'white',
      fontFamily: 'monospace',
    }}>
      {/* Filled in Task 17 */}
    </div>
  )
}
```

- [ ] **Step 4: Update main.tsx**

Replace default `game/src/main.tsx` content:
```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
```

- [ ] **Step 5: Verify by running dev server**

```bash
cd game && npm run dev
```
Expected: Browser shows a 3D convenience store with floor, walls, shelves, and counter. Camera looks down at the scene.

- [ ] **Step 6: Commit**

```bash
git add game/src/
git commit -m "feat: add 3D convenience store scene with floor, walls, shelves"
```

---

### Task 10: Player Entity

**Files:**
- Create: `game/src/entities/Player.tsx`
- Modify: `game/src/App.tsx`

- [ ] **Step 1: Create Player with ecctrl**

Create `game/src/entities/Player.tsx`:
```tsx
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useKeyboardControls } from '@react-three/drei'
import Ecctrl from 'ecctrl'
import { useGameStore } from '../stores/gameStore'
import { useEventStore } from '../stores/eventStore'
import { EventType, GamePhase } from '../types'
import { INTERACTION_COOLDOWN_SECONDS, ZONES } from '../constants'

export function Player() {
  const lastInteractTime = useRef(0)
  const playerRef = useRef<any>(null)

  const [, getKeys] = useKeyboardControls()

  useFrame(() => {
    // Track player position for police AI
    if (playerRef.current) {
      const pos = playerRef.current.translation()
      useGameStore.getState().setPlayerPosition([pos.x, pos.y, pos.z])
    }

    const { phase, elapsedSeconds, playerCurrentZone } = useGameStore.getState()
    if (phase !== GamePhase.Playing) return

    const keys = getKeys()
    const now = elapsedSeconds

    // E key: interact with zone (look up ruleId from zone config)
    if (keys.interact && playerCurrentZone && now - lastInteractTime.current >= INTERACTION_COOLDOWN_SECONDS) {
      lastInteractTime.current = now
      const zone = ZONES.find((z) => z.id === playerCurrentZone)
      if (zone) {
        useEventStore.getState().recordEvent({
          eventType: EventType.ViolationDetected,
          actorId: 'player',
          actorRole: 'Player',
          zoneId: zone.id,
          ruleId: zone.ruleId,
          severity: 2,
        })
      }
    }

    // F key: photo (always R10) — no manual toast, EventLogPresenter handles it
    if (keys.photo && now - lastInteractTime.current >= INTERACTION_COOLDOWN_SECONDS) {
      lastInteractTime.current = now
      useEventStore.getState().recordEvent({
        eventType: EventType.ViolationDetected,
        actorId: 'player',
        actorRole: 'Player',
        ruleId: 'R10',
        severity: 2,
        note: '사진 촬영',
      })
    }
  })

  return (
    <Ecctrl
      ref={playerRef}
      name="player"
      position={[0, 2, 0]}
      camInitDis={-8}
      camMaxDis={-12}
      camMinDis={-5}
      maxVelLimit={4}
      jumpVel={0}
      autoBalance={false}
    >
      {/* Player capsule body */}
      <mesh castShadow>
        <capsuleGeometry args={[0.35, 1, 8, 16]} />
        <meshStandardMaterial color="#e74c3c" />
      </mesh>
    </Ecctrl>
  )
}
```

- [ ] **Step 2: Add Player to App.tsx**

Add inside `<Physics>`:
```tsx
import { Player } from './entities/Player'
// ...
<Physics gravity={[0, -9.81, 0]} timeStep="vary">
  <ConvenienceStore />
  <Player />
</Physics>
```

- [ ] **Step 3: Verify**

```bash
cd game && npm run dev
```
Expected: Red capsule appears, WASD moves it, mouse rotates camera.

- [ ] **Step 4: Commit**

```bash
git add game/src/entities/Player.tsx game/src/App.tsx
git commit -m "feat: add player entity with ecctrl character controller"
```

---

### Task 11: Trigger Zones

**Files:**
- Create: `game/src/entities/TriggerZone.tsx`
- Modify: `game/src/App.tsx`

- [ ] **Step 1: Create TriggerZone component**

Create `game/src/entities/TriggerZone.tsx`:
```tsx
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import { ZoneConfig } from '../types'
import { useGameStore } from '../stores/gameStore'
import { useUIStore } from '../stores/uiStore'
import { useEventStore } from '../stores/eventStore'
import { EventType } from '../types'

const ZONE_COLORS: Record<string, string> = {
  Queue: '#ff000033',
  Seat: '#0000ff33',
  Photo: '#00ff0033',
}

export function TriggerZone({ config }: { config: ZoneConfig }) {
  const halfSize: [number, number, number] = [
    config.size[0] / 2,
    config.size[1] / 2,
    config.size[2] / 2,
  ]

  return (
    <group position={config.position}>
      {/* Visual indicator (semi-transparent box) */}
      <mesh>
        <boxGeometry args={config.size} />
        <meshStandardMaterial
          color={ZONE_COLORS[config.type] || '#ffffff33'}
          transparent
          opacity={0.15}
        />
      </mesh>

      {/* Sensor collider */}
      <RigidBody type="fixed" sensor>
        <CuboidCollider
          args={halfSize}
          sensor
          onIntersectionEnter={({ other }) => {
            if (other.rigidBodyObject?.name === 'player') {
              useGameStore.getState().setPlayerCurrentZone(config.id)
              useUIStore.getState().setPrompt(config.promptText)
              useEventStore.getState().recordEvent({
                eventType: EventType.EnteredZone,
                actorId: 'player',
                actorRole: 'Player',
                zoneId: config.id,
              })
            }
          }}
          onIntersectionExit={({ other }) => {
            if (other.rigidBodyObject?.name === 'player') {
              useGameStore.getState().setPlayerCurrentZone(null)
              useUIStore.getState().setPrompt(null)
              useEventStore.getState().recordEvent({
                eventType: EventType.ExitedZone,
                actorId: 'player',
                actorRole: 'Player',
                zoneId: config.id,
              })
            }
          }}
        />
      </RigidBody>
    </group>
  )
}
```

- [ ] **Step 2: Mount zones in App.tsx**

Add inside `<Physics>`:
```tsx
import { TriggerZone } from './entities/TriggerZone'
import { ZONES } from './constants'
// ...
{ZONES.map((zone) => (
  <TriggerZone key={zone.id} config={zone} />
))}
```

- [ ] **Step 3: Verify**

```bash
cd game && npm run dev
```
Expected: Three semi-transparent colored boxes visible on the floor. Walking into them shows prompt text.

- [ ] **Step 4: Commit**

```bash
git add game/src/entities/TriggerZone.tsx game/src/App.tsx
git commit -m "feat: add trigger zones with Rapier sensors and UI prompts"
```

---

## Phase 3: NPCs

### Task 12: NPC Entity with Patrol

**Files:**
- Create: `game/src/entities/NPC.tsx`
- Modify: `game/src/App.tsx`

- [ ] **Step 1: Create NPC component with patrol behavior**

Create `game/src/entities/NPC.tsx`:
```tsx
import { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { NPCConfig } from '../types'
import { useSuspicionStore } from '../stores/suspicionStore'
import { NPC_ARRIVAL_THRESHOLD } from '../constants'

export function NPC({ config }: { config: NPCConfig }) {
  const meshRef = useRef<THREE.Mesh>(null)
  const waypointIndex = useRef(0)
  const position = useRef(new THREE.Vector3(...config.position))

  useEffect(() => {
    useSuspicionStore.getState().registerNPC(config.id)
  }, [config.id])

  useFrame((_, delta) => {
    if (!meshRef.current) return

    const target = new THREE.Vector3(...config.waypoints[waypointIndex.current])
    const current = position.current
    const direction = new THREE.Vector3().subVectors(target, current)
    direction.y = 0 // XZ plane only

    if (direction.length() <= NPC_ARRIVAL_THRESHOLD) {
      waypointIndex.current = (waypointIndex.current + 1) % config.waypoints.length
      return
    }

    direction.normalize()
    current.addScaledVector(direction, config.patrolSpeed * delta)
    meshRef.current.position.copy(current)
    meshRef.current.lookAt(target.x, current.y, target.z)
  })

  // No RigidBody needed — NPCs are visual-only, no physics collisions
  return (
    <mesh ref={meshRef} name={config.id} position={config.position} castShadow>
      <capsuleGeometry args={[0.3, 0.8, 8, 16]} />
      <meshStandardMaterial color={config.color} />
    </mesh>
  )
}
```

- [ ] **Step 2: Mount NPCs in App.tsx**

Add inside `<Physics>`:
```tsx
import { NPC } from './entities/NPC'
import { NPCS } from './constants'
// ...
{NPCS.map((npc) => (
  <NPC key={npc.id} config={npc} />
))}
```

- [ ] **Step 3: Verify**

```bash
cd game && npm run dev
```
Expected: Three colored capsules patrolling between waypoints.

- [ ] **Step 4: Commit**

```bash
git add game/src/entities/NPC.tsx game/src/App.tsx
git commit -m "feat: add NPC entities with waypoint patrol behavior"
```

---

### Task 13: Police Entity

**Files:**
- Create: `game/src/entities/Police.tsx`
- Modify: `game/src/App.tsx`

- [ ] **Step 1: Create Police component**

Create `game/src/entities/Police.tsx`. The police follows the same patrol logic as NPCs but switches to path-following when in `MoveToPlayer` state. The PoliceAI system (Task 15) drives its state — this component just renders and moves.

```tsx
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { POLICE_CONFIG, NPC_ARRIVAL_THRESHOLD } from '../constants'
import { PoliceState } from '../types'

// Police state is read from a shared ref set by PoliceAI system
export const policeStateRef = { current: PoliceState.Patrol }
export const policePathRef = { current: [] as [number, number][] }
export const policePositionRef = { current: new THREE.Vector3(...POLICE_CONFIG.position) }

export function Police() {
  const meshRef = useRef<THREE.Mesh>(null)
  const waypointIndex = useRef(0)
  const pathIndex = useRef(0)
  // Police does NOT register as an NPC in suspicionStore — police is not a witness

  useFrame((_, delta) => {
    if (!meshRef.current) return
    const pos = policePositionRef.current
    const state = policeStateRef.current

    if (state === PoliceState.Patrol) {
      // Normal waypoint patrol
      const wp = POLICE_CONFIG.waypoints[waypointIndex.current]
      const target = new THREE.Vector3(...wp)
      const dir = new THREE.Vector3().subVectors(target, pos)
      dir.y = 0
      if (dir.length() <= NPC_ARRIVAL_THRESHOLD) {
        waypointIndex.current = (waypointIndex.current + 1) % POLICE_CONFIG.waypoints.length
      } else {
        dir.normalize()
        pos.addScaledVector(dir, POLICE_CONFIG.patrolSpeed * delta)
      }
    } else if (state === PoliceState.MoveToPlayer) {
      // Follow path computed by PoliceAI
      const path = policePathRef.current
      if (pathIndex.current < path.length) {
        const [tx, tz] = path[pathIndex.current]
        const target = new THREE.Vector3(tx, 0, tz)
        const dir = new THREE.Vector3().subVectors(target, pos)
        dir.y = 0
        if (dir.length() <= NPC_ARRIVAL_THRESHOLD) {
          pathIndex.current++
        } else {
          dir.normalize()
          pos.addScaledVector(dir, POLICE_CONFIG.patrolSpeed * delta)
        }
      }
    }
    // Interrogate and Cooldown: stay still

    meshRef.current.position.copy(pos)
    policePositionRef.current = pos
  })

  return (
    <mesh ref={meshRef} name="police" position={POLICE_CONFIG.position} castShadow>
      <capsuleGeometry args={[0.35, 1, 8, 16]} />
      <meshStandardMaterial color={POLICE_CONFIG.color} />
    </mesh>
  )
}
```

- [ ] **Step 2: Mount Police in App.tsx**

Add inside `<Physics>`:
```tsx
import { Police } from './entities/Police'
// ...
<Police />
```

- [ ] **Step 3: Commit**

```bash
git add game/src/entities/Police.tsx game/src/App.tsx
git commit -m "feat: add police entity with patrol and path-following modes"
```

---

## Phase 4: Game Systems

### Task 14: Suspicion Decay + Violation Response + Report Check Systems

**Files:**
- Create: `game/src/systems/SuspicionDecay.tsx`, `game/src/systems/ViolationResponse.tsx`, `game/src/systems/ReportCheck.tsx`
- Modify: `game/src/App.tsx`

- [ ] **Step 1: Create SuspicionDecay system**

Create `game/src/systems/SuspicionDecay.tsx`:
```tsx
import { useFrame } from '@react-three/fiber'
import { useSuspicionStore } from '../stores/suspicionStore'
import { useGameStore } from '../stores/gameStore'
import { GamePhase } from '../types'

export function SuspicionDecay() {
  useFrame((_, delta) => {
    if (useGameStore.getState().phase !== GamePhase.Playing) return
    // Clamp delta to prevent suspicion wipe on tab-switch (delta can be huge)
    const clampedDelta = Math.min(delta, 0.1)
    useSuspicionStore.getState().decayAll(clampedDelta)
  })
  return null
}
```

- [ ] **Step 2: Create ViolationResponse system**

Create `game/src/systems/ViolationResponse.tsx`:
```tsx
import { useEffect } from 'react'
import { useEventStore } from '../stores/eventStore'
import { useSuspicionStore } from '../stores/suspicionStore'
import { EventType } from '../types'
import { RULE_DELTAS, DEFAULT_SUSPICION_DELTA, ZONES } from '../constants'

export function ViolationResponse() {
  useEffect(() => {
    const unsub = useEventStore.getState().onEvent((event) => {
      if (event.eventType !== EventType.ViolationDetected) return

      // Determine rule ID: from event or from zone config
      let ruleId = event.ruleId
      if (!ruleId && event.zoneId) {
        const zone = ZONES.find((z) => z.id === event.zoneId)
        if (zone) ruleId = zone.ruleId
      }

      const delta = RULE_DELTAS[ruleId] ?? DEFAULT_SUSPICION_DELTA
      const store = useSuspicionStore.getState()

      // Apply suspicion to ALL witness NPCs (police is not in the store)
      for (const npcId of Object.keys(store.npcs)) {
        store.addSuspicion(npcId, delta, ruleId, event.id)
      }
    })
    return unsub
  }, [])

  return null
}
```

- [ ] **Step 3: Create ReportCheck system**

Create `game/src/systems/ReportCheck.tsx`:
```tsx
import { useFrame } from '@react-three/fiber'
import { useSuspicionStore } from '../stores/suspicionStore'
import { useReportStore } from '../stores/reportStore'
import { useEventStore } from '../stores/eventStore'
import { useGameStore } from '../stores/gameStore'
import { EventType, GamePhase } from '../types'

export function ReportCheck() {
  useFrame(() => {
    const { phase, elapsedSeconds } = useGameStore.getState()
    if (phase !== GamePhase.Playing) return

    const suspStore = useSuspicionStore.getState()
    const reportStore = useReportStore.getState()
    const now = elapsedSeconds

    // Check each NPC for report threshold
    for (const [npcId, npc] of Object.entries(suspStore.npcs)) {
      if (suspStore.shouldReport(npcId, now)) {
        suspStore.markReported(npcId, now)
        reportStore.fileReport(npcId, '', npc.suspicion, npc.lastEventId, now)
        useEventStore.getState().recordEvent({
          eventType: EventType.ReportFiled,
          actorId: npcId,
          actorRole: 'Citizen',
          severity: 2,
        })
      }
    }
  })
  return null
}
```

- [ ] **Step 4: Mount all three systems in App.tsx**

Add inside `<Physics>`:
```tsx
import { SuspicionDecay } from './systems/SuspicionDecay'
import { ViolationResponse } from './systems/ViolationResponse'
import { ReportCheck } from './systems/ReportCheck'
// ...
<SuspicionDecay />
<ViolationResponse />
<ReportCheck />
```

- [ ] **Step 5: Commit**

```bash
git add game/src/systems/ game/src/App.tsx
git commit -m "feat: add suspicion decay, violation response, and report check systems"
```

---

### Task 15: Police AI System (TDD for state machine)

**Files:**
- Create: `game/src/systems/PoliceAI.tsx`
- Test: `game/src/__tests__/policeAI.test.ts`

- [ ] **Step 1: Write tests for police state machine logic**

Create `game/src/__tests__/policeAI.test.ts`:
```typescript
import { describe, test, expect } from 'vitest'
import { determineVerdict, shouldStartInterrogation } from '../systems/PoliceAI'

describe('policeAI', () => {
  test('verdict: 2+ reporters → 외부인', () => {
    expect(determineVerdict(['clerk', 'elder'])).toBe('외부인')
  })

  test('verdict: 1 reporter → 외부인 의심', () => {
    expect(determineVerdict(['clerk'])).toBe('외부인 의심')
  })

  test('verdict: 0 reporters → 꿈 속 시민', () => {
    expect(determineVerdict([])).toBe('꿈 속 시민')
  })

  test('shouldStartInterrogation requires distance <= 2', () => {
    expect(shouldStartInterrogation(1.5)).toBe(true)
    expect(shouldStartInterrogation(2.0)).toBe(true)
    expect(shouldStartInterrogation(3.0)).toBe(false)
  })
})
```

- [ ] **Step 2: Implement PoliceAI system**

Create `game/src/systems/PoliceAI.tsx`:
```tsx
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { PoliceState, EventType, GamePhase, ReportEnvelope } from '../types'
import { useReportStore } from '../stores/reportStore'
import { useSuspicionStore } from '../stores/suspicionStore'
import { useGameStore } from '../stores/gameStore'
import { useEventStore } from '../stores/eventStore'
import { useUIStore } from '../stores/uiStore'
import {
  POLICE_INTERROGATION_DISTANCE,
  POLICE_COOLDOWN_SECONDS,
  INTERROGATION_DELAY_SECONDS,
} from '../constants'
import { policeStateRef, policePositionRef, policePathRef } from '../entities/Police'
import { findPath, createStoreGrid } from '../utils/gridPathfinding'

// Exported for testing
export function determineVerdict(reporterIds: string[]): string {
  if (reporterIds.length >= 2) return '외부인'
  if (reporterIds.length === 1) return '외부인 의심'
  return '꿈 속 시민'
}

export function shouldStartInterrogation(distance: number): boolean {
  return distance <= POLICE_INTERROGATION_DISTANCE
}

export function PoliceAI() {
  const stateTimer = useRef(0)
  const currentEnvelope = useRef<ReportEnvelope | null>(null)
  const grid = useRef(createStoreGrid([]))

  useFrame((_, delta) => {
    const game = useGameStore.getState()
    if (game.phase === GamePhase.Ended) return

    const state = policeStateRef.current
    const policePos = policePositionRef.current
    const playerPos = new THREE.Vector3(...game.playerPosition)
    const now = game.elapsedSeconds
    const distance = policePos.distanceTo(playerPos)

    switch (state) {
      case PoliceState.Patrol: {
        const reportStore = useReportStore.getState()
        const suspStore = useSuspicionStore.getState()
        if (reportStore.canTriggerInterrogation(suspStore.globalG, now)) {
          const envelope = reportStore.consumeReports(now, suspStore.globalG)
          if (envelope) {
            currentEnvelope.current = envelope
            policeStateRef.current = PoliceState.MoveToPlayer
            // Compute path to player
            const path = findPath(grid.current, policePos.x, policePos.z, playerPos.x, playerPos.z)
            policePathRef.current = path
            useEventStore.getState().recordEvent({
              eventType: EventType.InterrogationStarted,
              actorId: 'police',
              actorRole: 'Police',
              severity: 2,
            })
          }
        }
        break
      }

      case PoliceState.MoveToPlayer: {
        // Recompute path periodically
        if (shouldStartInterrogation(distance)) {
          policeStateRef.current = PoliceState.Interrogate
          stateTimer.current = 0
          useGameStore.getState().setPhase(GamePhase.Interrogating)
        }
        break
      }

      case PoliceState.Interrogate: {
        stateTimer.current += delta
        if (stateTimer.current >= INTERROGATION_DELAY_SECONDS) {
          // Render verdict
          const reporters = currentEnvelope.current?.reporterIds ?? []
          const verdict = determineVerdict(reporters)

          useEventStore.getState().recordEvent({
            eventType: EventType.VerdictGiven,
            actorId: 'police',
            actorRole: 'Police',
            note: verdict,
            severity: 3,
          })

          useUIStore.getState().setInterrogationText(verdict)
          useUIStore.getState().showToast(`판정: ${verdict}`)

          // Reset reporters
          const suspStore = useSuspicionStore.getState()
          for (const id of reporters) {
            suspStore.resetAfterInterrogation(id)
          }

          policeStateRef.current = PoliceState.Cooldown
          stateTimer.current = 0
          useGameStore.getState().setPhase(GamePhase.Playing)
        }
        break
      }

      case PoliceState.Cooldown: {
        stateTimer.current += delta
        if (stateTimer.current >= POLICE_COOLDOWN_SECONDS) {
          policeStateRef.current = PoliceState.Patrol
          useUIStore.getState().setInterrogationText(null)
          currentEnvelope.current = null
        }
        break
      }
    }
  })

  return null
}
```

- [ ] **Step 3: Run tests**

```bash
cd game && npx vitest run src/__tests__/policeAI.test.ts
```
Expected: All 4 tests PASS.

- [ ] **Step 4: Mount in App.tsx**

```tsx
import { PoliceAI } from './systems/PoliceAI'
// inside <Physics>:
<PoliceAI />
```

- [ ] **Step 5: Commit**

```bash
git add game/src/systems/PoliceAI.tsx game/src/__tests__/policeAI.test.ts game/src/App.tsx
git commit -m "feat: add police AI state machine with verdict logic"
```

---

### Task 16: Session Timer + Event Log Presenter

**Files:**
- Create: `game/src/systems/SessionTimer.tsx`, `game/src/systems/EventLogPresenter.tsx`
- Modify: `game/src/App.tsx`

- [ ] **Step 1: Create SessionTimer**

Create `game/src/systems/SessionTimer.tsx`:
```tsx
import { useFrame } from '@react-three/fiber'
import { useGameStore } from '../stores/gameStore'
import { useSuspicionStore } from '../stores/suspicionStore'
import { GamePhase } from '../types'
import { SESSION_DURATION_SECONDS, GLOBAL_SUSPICION_END_THRESHOLD } from '../constants'

export function SessionTimer() {
  useFrame((_, delta) => {
    const game = useGameStore.getState()
    if (game.phase === GamePhase.Ended) return

    game.tick(delta)

    if (game.elapsedSeconds >= SESSION_DURATION_SECONDS) {
      game.endGame('time_limit')
      return
    }

    const g = useSuspicionStore.getState().globalG
    if (g >= GLOBAL_SUSPICION_END_THRESHOLD) {
      game.endGame('global_awareness')
    }
  })
  return null
}
```

- [ ] **Step 2: Create EventLogPresenter**

Create `game/src/systems/EventLogPresenter.tsx`:
```tsx
import { useEffect, useRef } from 'react'
import { useEventStore } from '../stores/eventStore'
import { useUIStore } from '../stores/uiStore'
import { eventToText } from '../utils/semanticShaper'
import { EventType } from '../types'

export function EventLogPresenter() {
  const initialized = useRef(false)

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    useEventStore.getState().onEvent((event) => {
      const text = eventToText(event)
      useUIStore.getState().addLogLine(text)

      if (event.severity >= 2 || event.eventType === EventType.VerdictGiven) {
        useUIStore.getState().showToast(text)
      }
    })
  }, [])

  return null
}
```

- [ ] **Step 3: Mount both systems in App.tsx**

```tsx
import { SessionTimer } from './systems/SessionTimer'
import { EventLogPresenter } from './systems/EventLogPresenter'
// inside <Physics>:
<SessionTimer />
<EventLogPresenter />
```

- [ ] **Step 4: Commit**

```bash
git add game/src/systems/SessionTimer.tsx game/src/systems/EventLogPresenter.tsx game/src/App.tsx
git commit -m "feat: add session timer and event log presenter systems"
```

---

## Phase 5: UI

### Task 17: Complete UI Overlay

**Files:**
- Modify: `game/src/ui/HUD.tsx`
- Create: `game/src/ui/SuspicionBar.tsx`, `game/src/ui/EventLog.tsx`, `game/src/ui/Toast.tsx`, `game/src/ui/InterrogationPanel.tsx`, `game/src/ui/InteractionPrompt.tsx`

- [ ] **Step 1: Create all UI components**

Create `game/src/ui/SuspicionBar.tsx`:
```tsx
import { useSuspicionStore } from '../stores/suspicionStore'

export function SuspicionBar() {
  const globalG = useSuspicionStore((s) => s.globalG)
  const percent = Math.round(globalG * 100)

  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 14, marginBottom: 4 }}>G {percent}%</div>
      <div style={{ width: 200, height: 16, background: '#333', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{
          width: `${percent}%`,
          height: '100%',
          background: percent > 60 ? '#e74c3c' : percent > 30 ? '#f39c12' : '#2ecc71',
          transition: 'width 0.3s, background 0.3s',
        }} />
      </div>
    </div>
  )
}
```

Create `game/src/ui/EventLog.tsx`:
```tsx
import { useUIStore } from '../stores/uiStore'

export function EventLog() {
  const logLines = useUIStore((s) => s.logLines)

  return (
    <div style={{
      fontSize: 12, lineHeight: 1.4, maxHeight: 120, overflow: 'hidden',
      background: 'rgba(0,0,0,0.5)', padding: 8, borderRadius: 4, marginBottom: 8,
    }}>
      {logLines.map((line, i) => (
        <div key={i} style={{ opacity: 0.6 + (i / logLines.length) * 0.4 }}>{line}</div>
      ))}
      {logLines.length === 0 && <div style={{ opacity: 0.4 }}>이벤트 없음</div>}
    </div>
  )
}
```

Create `game/src/ui/Toast.tsx`:
```tsx
import { useUIStore } from '../stores/uiStore'

export function Toast() {
  const text = useUIStore((s) => s.toastText)
  if (!text) return null

  return (
    <div style={{
      position: 'fixed', top: '20%', left: '50%', transform: 'translateX(-50%)',
      background: 'rgba(0,0,0,0.8)', color: '#fff', padding: '12px 24px',
      borderRadius: 8, fontSize: 16, fontWeight: 'bold', zIndex: 100,
      pointerEvents: 'none',
    }}>
      {text}
    </div>
  )
}
```

Create `game/src/ui/InterrogationPanel.tsx`:
```tsx
import { useUIStore } from '../stores/uiStore'

export function InterrogationPanel() {
  const text = useUIStore((s) => s.interrogationText)
  if (!text) return null

  return (
    <div style={{
      position: 'fixed', top: '40%', left: '50%', transform: 'translate(-50%, -50%)',
      background: 'rgba(0,0,0,0.9)', color: '#fff', padding: '32px 48px',
      borderRadius: 12, fontSize: 24, fontWeight: 'bold', textAlign: 'center',
      border: '2px solid #e74c3c', zIndex: 200, pointerEvents: 'none',
    }}>
      <div style={{ fontSize: 14, marginBottom: 8, color: '#aaa' }}>경찰 심문 결과</div>
      <div>{text}</div>
    </div>
  )
}
```

Create `game/src/ui/InteractionPrompt.tsx`:
```tsx
import { useUIStore } from '../stores/uiStore'

export function InteractionPrompt() {
  const text = useUIStore((s) => s.promptText)
  const show = useUIStore((s) => s.showPrompt)
  if (!show || !text) return null

  return (
    <div style={{
      position: 'fixed', bottom: '15%', left: '50%', transform: 'translateX(-50%)',
      background: 'rgba(0,0,0,0.7)', color: '#fff', padding: '8px 16px',
      borderRadius: 6, fontSize: 14, pointerEvents: 'none',
    }}>
      {text}
    </div>
  )
}
```

- [ ] **Step 2: Update HUD to compose all components**

Update `game/src/ui/HUD.tsx`:
```tsx
import { SuspicionBar } from './SuspicionBar'
import { EventLog } from './EventLog'
import { Toast } from './Toast'
import { InterrogationPanel } from './InterrogationPanel'
import { InteractionPrompt } from './InteractionPrompt'
import { useGameStore } from '../stores/gameStore'
import { SESSION_DURATION_SECONDS } from '../constants'
import { GamePhase } from '../types'

export function HUD() {
  const elapsed = useGameStore((s) => s.elapsedSeconds)
  const phase = useGameStore((s) => s.phase)
  const endReason = useGameStore((s) => s.endReason)
  const remaining = Math.max(0, SESSION_DURATION_SECONDS - elapsed)
  const min = Math.floor(remaining / 60)
  const sec = Math.floor(remaining % 60)

  return (
    <>
      <div style={{
        position: 'absolute', top: 16, left: 16,
        pointerEvents: 'none', color: 'white', fontFamily: 'monospace',
      }}>
        <div style={{ fontSize: 14, marginBottom: 8 }}>
          ⏱ {min}:{sec.toString().padStart(2, '0')}
        </div>
        <SuspicionBar />
        <EventLog />
      </div>

      <Toast />
      <InterrogationPanel />
      <InteractionPrompt />

      {phase === GamePhase.Ended && (
        <div style={{
          position: 'fixed', inset: 0, display: 'flex', alignItems: 'center',
          justifyContent: 'center', background: 'rgba(0,0,0,0.8)', zIndex: 300,
          color: 'white', fontFamily: 'monospace',
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 16 }}>게임 종료</div>
            <div style={{ fontSize: 16 }}>
              {endReason === 'time_limit' ? '시간 초과' : '글로벌 의심도 초과'}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
```

- [ ] **Step 3: Add toast timer tick to a system**

Add to `game/src/systems/SessionTimer.tsx` inside the useFrame callback:
```tsx
import { useUIStore } from '../stores/uiStore'
// inside useFrame:
useUIStore.getState().tickToast(delta)
```

- [ ] **Step 4: Verify**

```bash
cd game && npm run dev
```
Expected: Top-left shows timer, G meter, event log. Walking into zones shows prompt. Pressing E triggers violation → suspicion rises → bar turns yellow/red → NPC reports → police moves → verdict appears.

- [ ] **Step 5: Commit**

```bash
git add game/src/ui/ game/src/systems/SessionTimer.tsx
git commit -m "feat: add complete UI overlay with suspicion bar, event log, toasts, and panels"
```

---

## Phase 6: Integration

### Task 18: Wire Everything Together + Fix Player Zone Interaction

**Files:**
- Modify: `game/src/App.tsx`, `game/src/entities/Player.tsx`

- [ ] **Step 1: Ensure Player E-key uses zone ruleId**

In `game/src/entities/Player.tsx`, update the interact handler to look up the zone's ruleId:
```tsx
// When E is pressed:
const zone = ZONES.find((z) => z.id === playerCurrentZone)
if (zone) {
  useEventStore.getState().recordEvent({
    eventType: EventType.ViolationDetected,
    actorId: 'player',
    actorRole: 'Player',
    zoneId: zone.id,
    ruleId: zone.ruleId,
    severity: 2,
  })
}
```

- [ ] **Step 2: Verify complete App.tsx has all components and systems**

Final `<Physics>` children should be:
```tsx
<ConvenienceStore />
<Player />
{ZONES.map((zone) => <TriggerZone key={zone.id} config={zone} />)}
{NPCS.map((npc) => <NPC key={npc.id} config={npc} />)}
<Police />
<SuspicionDecay />
<ViolationResponse />
<ReportCheck />
<PoliceAI />
<SessionTimer />
<EventLogPresenter />
```

- [ ] **Step 3: Run full test suite**

```bash
cd game && npx vitest run
```
Expected: All tests PASS.

- [ ] **Step 4: Manual playtest checklist**

```bash
cd game && npm run dev
```
Test each step:
- [ ] WASD moves player
- [ ] Walk into zone → prompt appears
- [ ] Press E → violation event in log
- [ ] G bar increases
- [ ] NPC suspicion reaches 50 → report event
- [ ] 2 reports + G ≥ 30% → police moves to player
- [ ] Police reaches player → interrogation panel
- [ ] Verdict displayed → panel clears after cooldown
- [ ] 25 min timer counts down

- [ ] **Step 5: Commit**

```bash
git add game/
git commit -m "feat: integrate all systems for complete game loop"
```

---

### Task 19: Tuning + Optional LLM Integration

**Files:**
- Modify: `game/src/constants.ts` (tune values)
- Create: `game/src/utils/llmClient.ts` (optional)

- [ ] **Step 1: Playtest and adjust constants**

Common tuning:
- If G rises too fast: increase `SUSPICION_DECAY_PER_SECOND` or decrease `RULE_DELTAS`
- If police never triggers: decrease `GLOBAL_SUSPICION_INTERROGATION_THRESHOLD` or `REPORTS_REQUIRED`
- If game ends too fast: increase `SESSION_DURATION_SECONDS`
- If zones are hard to find: increase zone `size` in ZONES config

- [ ] **Step 2: Optional — Add LLM client**

Create `game/src/utils/llmClient.ts`:
```typescript
import { clampLine } from './dialogueLimiter'
import { MAX_INTERROGATION_CHARS } from '../constants'

const FALLBACK = '규칙 위반을 확인했습니다. 조심해 주세요.'
const ENDPOINT = 'http://localhost:11434/api/generate'
const TIMEOUT_MS = 2000

export async function requestLLMLine(role: string, summary: string): Promise<string> {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama3',
        prompt: `당신은 ${role}입니다. 상황: ${summary}. 한 줄로 반응하세요. 80자 이내.`,
        stream: false,
      }),
      signal: controller.signal,
    })

    clearTimeout(timer)
    const data = await res.json()
    return clampLine(data.response || FALLBACK, MAX_INTERROGATION_CHARS)
  } catch {
    return FALLBACK
  }
}
```

- [ ] **Step 3: Final commit**

```bash
git add game/
git commit -m "feat: tune game constants and add optional LLM integration"
```

---

## Summary

| Phase | Tasks | What it produces |
|-------|-------|-----------------|
| 1. Foundation | 1-8 | TypeScript types, Zustand stores (all game logic), utility functions — all with tests |
| 2. 3D Scene | 9-11 | Playable 3D environment with player movement and zone triggers |
| 3. NPCs | 12-13 | Patrolling NPCs and police entity |
| 4. Systems | 14-16 | Suspicion decay, violation response, reports, police AI, session timer |
| 5. UI | 17 | Full HUD overlay with all display elements |
| 6. Integration | 18-19 | Complete game loop, tuning, optional LLM |

**Total: 19 tasks, ~100 steps**

Each phase produces independently verifiable results. Phase 1 can be fully validated with `vitest`. Phases 2-6 add visual layers that can be tested in the browser.
