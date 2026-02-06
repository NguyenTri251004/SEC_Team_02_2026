# Refactoring Process

Systematic approach to decouple modules.

## Phase 1: Prepare Module Structure

Create module controller as single point of contact:
- Singleton pattern for access
- Events region for notifications
- Public API region for commands
- Private internals region

## Phase 2: Define Communication

### Events
For each state change orchestrator cares about, define event.
**Pattern:** `On[Module][Action]` (e.g., OnGameWin, OnLevelLoaded)

### Delegates
For each action orchestrator triggers, create delegate method.
**Pattern:** Public method → internal implementation (null-safe)

## Phase 3: Move Responsibilities

**To Module (feature-specific):**
- Game logic (win/lose conditions)
- Internal state management
- Feature timers/counters
- Input handling for feature

**Keep in Orchestrator (cross-cutting):**
- Analytics/event tracking
- UI navigation between screens
- Save/load coordination
- Lives/economy systems

## Phase 4: Rewire Communication

1. Replace direct calls with API calls
2. Replace direct state reads with properties
3. Subscribe to events in Awake()
4. Unsubscribe in OnDestroy()
5. Remove internal namespace imports

## Phase 5: Cleanup

- Remove redundant null checks
- Verify no direct internal access
- Test all flows (win, lose, pause, etc.)

## Common Pitfalls

**Pitfall 1:** Forgetting event unsubscribe → memory leaks
**Solution:** Always pair += in Awake with -= in OnDestroy

**Pitfall 2:** Shared mutable state → race conditions
**Solution:** Single owner, others use read-only API

**Pitfall 3:** Events with too much data → coupling
**Solution:** Events notify change, orchestrator queries via API if needed
