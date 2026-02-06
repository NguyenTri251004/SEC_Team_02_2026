# Verification

Verify decoupling is complete and correct.

## Static Verification

### 1. No Internal Imports
```bash
grep -r "using.*Internal" OrchestratorFile
```
**Expected:** No matches

### 2. No Direct Instance Access
```bash
grep -r "InternalClass.Instance" OrchestratorFile
```
**Expected:** No matches (except comments)

### 3. Null-Checks Location
```bash
# Should find inside Module
grep -r "Instance\?" ModuleController
# Should NOT find in Orchestrator for Internal
grep -r "Instance.*!=.*null" OrchestratorFile
```

### 4. Event Subscription Pairs
Every `+= Handler` must have matching `-= Handler`

## Conceptual Test

**Delete Module Test:**
1. Imagine deleting module folder
2. Create stub module with only public API signatures
3. Does orchestrator compile?
   - Yes → Good encapsulation
   - No → Still coupled

## Runtime Verification

Test each interaction flow:
- Module events fire correctly
- Orchestrator handles events
- API methods work as expected
- No null reference exceptions
- State synchronized properly

## Architecture Check

Ask:
- Can module be replaced without changing orchestrator?
- Does orchestrator only use public module interface?
- Are boundaries clear (who owns what)?
- Can module be removed leaving only stub?

## Final Verification Questions

- [ ] Orchestrator has zero knowledge of internal classes?
- [ ] All communication via events or public API?
- [ ] Module fully encapsulates implementation?
- [ ] Boundaries clearly defined and respected?
- [ ] All runtime flows tested and working?
