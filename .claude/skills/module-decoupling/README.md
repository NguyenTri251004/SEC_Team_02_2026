# Module Decoupling Skill

**Tư duy framework** để refactor tightly-coupled code thành loosely-coupled modules.

## Core Philosophy

Module decoupling không phải về code examples - nó là về **thinking process**:
- How to identify coupling?
- How to design clean boundaries?
- How to communicate between modules?
- How to verify decoupling?

## Structure

```
module-decoupling/
├── SKILL.md                           # Overview & principles
└── references/
    ├── identify-coupling.md           # Phân tích coupling hiện tại
    ├── design-principles.md           # Nguyên tắc thiết kế API
    ├── decision-framework.md          # Framework ra quyết định
    ├── refactoring-process.md         # Quy trình refactor
    └── verification.md                # Xác minh decoupling
```

## Key Principles

1. **Single Source of Truth** - Mỗi state/behavior thuộc đúng 1 module
2. **One-Way Data Flow** - Orchestrator → Module (commands), Module → Orchestrator (events)
3. **Information Hiding** - Orchestrator biết WHAT, không biết HOW
4. **Null-Safety Ownership** - Module tự handle null-safety

## Usage

Skill tự động activate khi detect từ khóa:
- "refactor module"
- "decouple"
- "extract module"
- "event-driven architecture"

Hoặc explicit: "use module-decoupling skill"

## Application

**NOT** for code reuse - **FOR** thinking framework.

Apply tư duy này cho BẤT KỲ module nào cần decouple:
- Gameplay modules
- Feature systems
- UI components
- Business logic layers

## Progressive Disclosure

- **SKILL.md:** Quick overview & when to use (74 lines)
- **References:** Detailed thinking models (58-80 lines each)
- Load references as needed based on refactoring phase
