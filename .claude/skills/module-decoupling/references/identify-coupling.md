# Identify Coupling

Systematic process to analyze tightly-coupled code.

## Analysis Questions

### Q1: What are the actors?
- **Orchestrator:** Class coordinating overall flow
- **Module:** Feature/gameplay system to extract
- **Internal Classes:** Implementation details inside module

### Q2: Who knows about whom?
Map current dependencies:
- Does Orchestrator import Internal namespaces? → Coupling
- Does Orchestrator null-check Internal instances? → Coupling
- Does Orchestrator read Internal properties? → Coupling

### Q3: Who owns what?
For each responsibility, ask:
- Is it **feature-specific** (gameplay logic, internal state)? → Module
- Is it **cross-feature** (UI navigation, save/load, events)? → Orchestrator

## Categorize References

Search pattern: `grep -r "InternalClass" OrchestratorFile`

For each match, categorize:

| Pattern | Type | Action |
|---------|------|--------|
| `.Instance.Method()` | Method call | Create delegate |
| `.Instance.Property` | State read | Create delegate property |
| `if (.Instance != null)` | Null check | Move inside delegate |
| `.OnEvent += Handler` | Event subscription | Keep if public |

## Output Structure

Document findings:
```
## Current Coupling Analysis

### Direct References Found:
- [File:Line] Orchestrator accesses Internal.Method()
- [File:Line] Orchestrator reads Internal.Property

### Responsibility Mapping:
**Module should own:**
- [Concern A] - feature-specific logic
- [Concern B] - internal state

**Orchestrator should own:**
- [Concern X] - cross-feature coordination
- [Concern Y] - external integrations
```

## Next Step

Use findings to design module API (see `design-principles.md`)
