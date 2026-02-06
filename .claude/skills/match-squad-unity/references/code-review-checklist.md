# Code Review Checklist - Mandatory Pre-Commit Validation

Complete this checklist before committing any changes to Match Squad. These checks prevent critical issues and ensure production quality.

## ✅ Object Pooling Verification

### Critical Checks
- [ ] All tiles created use `PYDPool.Spawn()` (NEVER `Instantiate()`)
- [ ] All tiles destroyed use `PYDPool.ReturnToPool()` (NEVER `Destroy()`)
- [ ] All UI elements use pooling where applicable
- [ ] All particle effects use pooling
- [ ] Pool returns happen in OnDestroy or cleanup methods

### Code Review Questions
- Are there any `new GameObject()` calls for tiles/UI?
- Are there any `Instantiate()` calls that should use pooling?
- Are all spawned objects returned to pool before scene transitions?

## ✅ DOTween Animation Cleanup

### Critical Checks
- [ ] All DOTween animations have corresponding `DOKill()` calls in OnDestroy
- [ ] UI animations use `SetUpdate(true)` for timeScale independence
- [ ] Complex sequences use `SetAutoKill(true)` for automatic cleanup
- [ ] No animations created in Update/FixedUpdate loops
- [ ] Animations killed before GameObject destruction

### Code Review Questions
```csharp
// Check for these patterns:
private void OnDestroy()
{
    transform.DOKill();
    rectTransform.DOKill();
    spriteRenderer.DOKill();
    // Or: TileAnimationController.KillAllAnimations(rectTransform);
}
```

## ✅ Event Subscription Management

### Critical Checks
- [ ] All event subscriptions in OnEnable/Start have corresponding unsubscribe in OnDisable/OnDestroy
- [ ] No memory leaks from forgotten event handlers
- [ ] Static events properly managed (subscribe once, unsubscribe reliably)

### Code Review Questions
```csharp
// Pattern check:
private void OnEnable()
{
    Map.OnTilesSwapped += HandleTileSwap;
}

private void OnDisable()
{
    Map.OnTilesSwapped -= HandleTileSwap; // ⚠️ MUST exist
}
```

## ✅ Input Blocking Verification

### Critical Checks
- [ ] Input handlers check `LevelController.IsGeneratingMap` before processing
- [ ] Map generation sets `isGeneratingMap = true` at start
- [ ] Map generation sets `isGeneratingMap = false` after completion
- [ ] Animation sequences block input during critical phases

### Code Review Questions
```csharp
// Check for this pattern in all input handlers:
if (LevelController.IsGeneratingMap)
{
    return; // Block input during map generation
}
```

## ✅ Cache Invalidation

### Critical Checks
- [ ] `GroupDetector.InvalidateCache()` called after tile swaps
- [ ] Cache invalidated after tile removals
- [ ] Cache invalidated after map structure changes
- [ ] Cache invalidated on level transitions

### Code Review Questions
- Does the code modify tile positions or states?
- If yes, is `InvalidateCache()` called afterward?

## ✅ Win Condition Edge Cases

### Critical Checks
- [ ] Win condition deferred until animations complete
- [ ] Trait completion tracking prevents double-counting
- [ ] Win condition handles edge cases (empty levels, single trait, etc.)
- [ ] Win events fire exactly once (no duplicate triggers)

## ✅ Performance Validation

### Mobile Device Testing (MANDATORY)
- [ ] Tested on actual Android device (not just editor)
- [ ] Frame rate stable at 60fps during complex animations
- [ ] No memory leaks (test multiple level transitions)
- [ ] Object pool statistics reviewed (no unbounded growth)
- [ ] GC allocations minimized (use Profiler)

### Editor Testing
- [ ] Unity Profiler shows no CPU spikes > 16.67ms (60fps)
- [ ] Deep Profile reveals no performance bottlenecks
- [ ] Memory Profiler shows no leaked objects
- [ ] Animation queue processes without deadlocks

## ✅ Level Transition Cleanup

### Critical Checks
- [ ] `Map.Instance.ClearGroups()` called on level exit
- [ ] `TileGroupHelper.ResetAnimationState()` called
- [ ] `NormalTile.ForceResetDragState()` called
- [ ] All animations killed with `DOTween.KillAll()` or selective kills
- [ ] All pooled objects returned before transition

## ✅ Animation Queue Integrity

### Critical Checks
- [ ] No direct calls to `ProcessAnimationQueue()` (should be internal)
- [ ] Animation queue has timeout mechanism (prevent infinite loops)
- [ ] Trait spawning animations complete before normal groups process
- [ ] `isProcessingAnimations` flag managed correctly

## ✅ Mobile-Specific Checks

### IL2CPP Compatibility
- [ ] No reflection usage (IL2CPP incompatible)
- [ ] No dynamic code generation
- [ ] Platform-specific code properly isolated

### Input Handling
- [ ] Multi-touch scenarios handled gracefully
- [ ] Rapid touch sequences don't break state
- [ ] Input validation prevents edge cases

## Final Sign-Off

Before committing, answer these questions:

1. **Performance**: Will this change maintain 60fps on mid-range Android devices?
2. **Memory**: Are all allocations necessary, or can they be avoided/pooled?
3. **Animations**: Are all DOTween sequences properly cleaned up?
4. **Events**: Are all event subscriptions properly unsubscribed?
5. **Testing**: Have you tested on an actual mobile device?

If you can answer "yes" to all questions, proceed with commit. Otherwise, address the issues first.
