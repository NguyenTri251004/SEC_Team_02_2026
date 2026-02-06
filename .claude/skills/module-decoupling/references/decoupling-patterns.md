# Decoupling Patterns

Concise patterns giảm coupling. Chỉ apply khi cần, tránh over-engineering.

## Pattern 1: Facade

**Problem:** Orchestrator needs many operations from module
**Solution:** Single facade method combines multiple operations

**When:** Orchestrator repeats same sequence of calls

## Pattern 2: Dependency Injection

**Problem:** Module hard-codes dependencies
**Solution:** Pass dependencies via constructor/Initialize

**When:** Module needs external services, want testability

## Pattern 3: Strategy

**Problem:** Need swap implementations at runtime
**Solution:** Interface + multiple implementations

**When:** A/B testing, platform-specific implementations

## Pattern 4: Command

**Problem:** Complex undo/redo or queued operations
**Solution:** Encapsulate operations as objects

**When:** Need operation history, batch processing

## Pattern 5: Repository

**Problem:** Multiple modules access same data
**Solution:** Single repository owns data access

**When:** Shared data, multiple consumers

## Anti-Patterns to Avoid

**❌ God Object:** One class doing everything
**Fix:** Split by concerns (flow vs gameplay)

**❌ Leaky Abstraction:** Internal details exposed
**Fix:** Public API only, hide implementation

**❌ Bidirectional Dependencies:** A needs B, B needs A
**Fix:** Events for notifications, API for commands

**❌ Shared Mutable State:** Multiple owners
**Fix:** Single owner, others read via API

## Selection Guide

| Need | Pattern |
|------|---------|
| Hide complexity | Facade |
| Swap implementations | Strategy |
| External dependencies | Dependency Injection |
| Shared data access | Repository |
| Operation history | Command |

**Default:** Start with Events + Delegates. Add patterns only when needed.
