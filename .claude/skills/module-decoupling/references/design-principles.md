# Design Principles

Core principles guiding module API design.

## Principle 1: Single Source of Truth

Each piece of state/behavior belongs to exactly ONE module.

**Test:** If you delete module, does orchestrator still compile (with stub)?
- Yes → Good encapsulation
- No → Coupling exists

## Principle 2: One-Way Data Flow

```
Orchestrator → Module: Commands (public API)
Module → Orchestrator: Notifications (events)
```

Never reverse flow. No circular dependencies.

## Principle 3: Information Hiding

Orchestrator knows WHAT module does, not HOW.

**Bad:** Orchestrator knows about internal timer implementation
**Good:** Orchestrator calls `Module.PauseTimer()`, doesn't care how

## Principle 4: Null-Safety Ownership

Module handles its own null-safety internally. Callers shouldn't worry.

**Before (bad):**
```
if (Internal.Instance != null)
    Internal.Instance.DoThing()
```

**After (good):**
```
Module.DoThing()  // Null-safe inside
```

## API Design Checklist

- [ ] Events defined for all state changes
- [ ] Delegate methods for all actions orchestrator needs
- [ ] Properties exposed for read-only state access
- [ ] No internal types in public API signatures
- [ ] All null-checks inside module, not caller

## Communication Patterns

### Events (Module → Orchestrator)
**Use for:** State changes, lifecycle notifications
**Don't:** Pass large objects, expose implementation

### Delegate Methods (Orchestrator → Module)
**Use for:** Commands, actions, queries
**Don't:** Expose internal classes in parameters/returns

### Shared State
**Avoid.** If needed, Module owns, Orchestrator reads via property.
