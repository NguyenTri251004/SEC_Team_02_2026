# Decision Framework

Thinking model for module decoupling decisions.

## Question 1: Should This Be a Separate Module?

**Ask:**
- Is it replaceable? (Can we swap with different implementation?)
- Is it removable? (Can we delete without breaking core flow?)
- Is it cohesive? (Related behaviors grouped together?)

**If 2+ yes:** Candidate for extraction

## Question 2: What's the Module Boundary?

**Ownership test:**
For each function/class, ask: "If I remove the module, who should own this?"

- Feature-specific → Inside module
- Cross-feature → Outside (orchestrator)
- Shared utility → Separate common module

## Question 3: Events or API?

**Use Events when:**
- Module needs to notify about state change
- Orchestrator decides what to do with notification
- Multiple handlers might subscribe
- Timing of notification matters

**Use API when:**
- Orchestrator needs to command action
- Orchestrator needs to query state
- Synchronous operation expected
- Single point of execution

## Question 4: What Data to Expose?

**Expose:**
- Read-only state needed for decisions
- Commands that trigger actions
- Notifications of state changes

**Don't Expose:**
- Internal implementation classes
- Mutable state (unless owned externally)
- Implementation details

## Question 5: How to Handle Dependencies?

**If Module depends on External:**
- Pass via constructor/initialize
- Store reference internally
- Access via public API only

**If Orchestrator needs Module data:**
- Module exposes property
- Module fires event with data
- Never direct internal access

## Question 6: Where Does This Belong?

Decision matrix for common concerns:

| Concern | Belongs To |
|---------|------------|
| Win/lose detection | Module (gameplay) |
| Analytics tracking | Orchestrator (flow) |
| Timer management | Module (if feature-specific) |
| UI navigation | Orchestrator (flow) |
| Save/load | Orchestrator (persistence) |
| Internal state | Module (encapsulation) |

## Red Flags Checklist

If any true, revisit design:
- [ ] Orchestrator imports internal namespace
- [ ] Circular dependencies exist
- [ ] Both touch same mutable state
- [ ] Events carry implementation objects
- [ ] Multiple sources of truth for state