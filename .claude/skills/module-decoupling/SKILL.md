---
name: module-decoupling
description: Refactor tightly-coupled code into loosely-coupled modules using event-driven architecture and delegate patterns. Use when extracting modules that can be replaced/removed independently, when multiple classes directly reference implementation details of another, or when needing clean API boundaries between systems. Covers event-based communication, delegate methods, encapsulation, and systematic refactoring process.
---

# Module Decoupling

Tư duy và framework để tách code tightly-coupled thành independent, replaceable modules.

## Core Principle

**Modules communicate via events and public API - never internal implementation details.**

Parent module (orchestrator) chỉ biết về public interface của child module, không biết internal dependencies.

## When to Use

- Tách gameplay/feature modules có thể remove/replace
- Multiple classes trực tiếp access internal state của class khác
- Cần clean separation giữa systems (Flow vs Gameplay, Core vs Feature)
- Chuẩn bị codebase cho A/B testing different implementations
- Giảm compile-time dependencies giữa systems

## Architecture Pattern

```
Orchestrator (Flow Controller)
├── Event subscriptions → Module events
├── Public API calls → Module methods
└── NO knowledge of Module internals

Module (Feature Controller)
├── Events → notify state changes
├── Public API → delegate to internals
└── Encapsulates implementation
```

## Framework Phases

```
IDENTIFY → references/identify-coupling.md
DESIGN → references/design-principles.md
PATTERNS → references/decoupling-patterns.md (if needed)
IMPLEMENT → references/refactoring-process.md
VERIFY → references/verification.md
```

## Key Techniques

### 1. Event-Driven Communication
Module fires events, Orchestrator subscribes. One-way data flow, no reverse dependencies.

**When:** State changes (win/lose/started), lifecycle events (loaded/unloaded)

### 2. Delegate Pattern
Public API methods internally delegate to implementation classes with null-safety.

**When:** Orchestrator needs to trigger actions or read state

### 3. Boundary Definition
Clear ownership: Which concerns belong to Module vs Orchestrator?

**When:** Designing module separation before implementation

## Red Flags

Stop if orchestrator code has:
- `if (InternalClass.Instance != null)` checks
- Direct property access to internal classes
- Imports of internal module namespaces
- Circular dependencies
- "God class" mixing flow and gameplay

## References

- `identify-coupling.md` - Phân tích coupling
- `design-principles.md` - Nguyên tắc thiết kế
- `decision-framework.md` - Framework quyết định
- `decoupling-patterns.md` - Patterns bổ sung (optional)
- `refactoring-process.md` - Quy trình thực hiện
- `verification.md` - Xác minh kết quả