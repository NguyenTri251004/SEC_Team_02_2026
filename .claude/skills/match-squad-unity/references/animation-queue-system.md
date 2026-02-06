# Animation Queue System & DOTween Deep Dive

This reference covers the complex animation system in Match Squad, with emphasis on DOTween usage patterns and the sequential animation queue that prevents race conditions.

## DOTween Best Practices

### PATTERN: Basic DOTween Animation
```csharp
// Single animation with proper cleanup
transform.DOScale(Vector3.one * 1.2f, 0.3f)
    .SetEase(Ease.OutBack)
    .OnComplete(() => Debug.Log("Animation complete"));
```

### PATTERN: DOTween Sequence Building
```csharp
// Chained animations (best practice for multi-step animations)
Sequence sequence = DOTween.Sequence();
sequence.Append(transform.DOScale(1.2f, 0.2f));
sequence.Append(transform.DOScale(1.0f, 0.2f));
sequence.Insert(0.1f, spriteRenderer.DOFade(0f, 0.3f)); // Parallel at 0.1s
sequence.OnComplete(() => OnAnimationComplete());
```

### PATTERN: UI Animations with SetUpdate(true)
```csharp
// UI animations independent of timeScale (for pause menus, etc.)
rectTransform.DOAnchorPos(targetPos, 0.5f)
    .SetUpdate(true)  // ⚠️ CRITICAL for UI
    .SetEase(Ease.OutCubic);
```

### WARNING: Animation Cleanup
```csharp
// ALWAYS kill animations in OnDestroy
private void OnDestroy()
{
    TileAnimationController.KillAllAnimations(rectTransform);
    // Or for specific tweens:
    transform.DOKill();
    spriteRenderer.DOKill();
}
```

### PATTERN: Performance-Optimized Sequences
```csharp
// Reuse sequences and set recycling
Sequence sequence = DOTween.Sequence();
sequence.SetAutoKill(true);  // Auto-cleanup when complete
sequence.SetRecyclable(true); // Allow DOTween to reuse internal structures
```

## Map Animation Queue System

The Map class uses a queue-based system to prevent animation conflicts and deadlocks.

### FIX: Map.cs Lines 492-500 - Animation Queue Processing
```csharp
// PATTERN: Enqueue animations for sequential processing
pendingAnimationBatches.Enqueue(new List<TileGroup> { normalGroups, traitSpawningGroups });

if (!isProcessingAnimations)
{
    LevelController.Instance.StartCoroutine(ProcessAnimationQueue());
}
```

**WARNING**: Never start ProcessAnimationQueue() if `isProcessingAnimations` is true. This causes deadlocks.

### PATTERN: ProcessAnimationQueue() Structure (Map.cs:586-643)
```csharp
private IEnumerator ProcessAnimationQueue()
{
    isProcessingAnimations = true;

    while (pendingAnimationBatches.Count > 0)
    {
        var currentBatch = pendingAnimationBatches.Dequeue();

        // Separate trait spawning (blocking) from normal animations
        var (normalGroups, traitSpawningGroups) = SeparateGroupsByType(currentBatch);

        // Process trait spawning FIRST (must complete before normal groups)
        if (traitSpawningGroups.Count > 0)
        {
            yield return new WaitUntil(() => !isProcessingTraitSpawning);
        }

        // Process normal group animations
        if (normalGroups.Count > 0)
        {
            yield return StartCoroutine(TileGroupHelper.HighlightGroups(normalGroups));
        }
    }

    isProcessingAnimations = false;
    CheckWinConditionAfterAnimations(); // ⚠️ Deferred until all animations complete
}
```

## TileGroupHelper Coordination

### DEBUG: Check Animation State (TileGroupHelper.cs)
```csharp
// Is any animation running?
bool isAnimating = TileGroupHelper.IsAnimationRunning;  // Static property
int activeCount = TileGroupHelper.ActiveAnimationCount;  // Internal counter

// Force reset if stuck (use with caution)
TileGroupHelper.ResetAnimationState();
```

### WARNING: TileGroupHelper.cs Lines 572-580 - Group Locking
Tiles are locked during group animations to prevent player input. Locks MUST be released after animations complete, or tiles become permanently unresponsive.

```csharp
// Pattern: Lock tiles during animation
Map.Instance.LockAllTilesInGroups(groups);

// Pattern: Unlock after animation completes
Map.Instance.UnlockAllTiles();
```

## TraitSpawningEffectHelper 12-Step Sequence

This is the most complex animation system in the game, spanning ~3-4 seconds with frame-accurate timing.

### Full 12-Step Animation Timeline (TraitSpawningEffectHelper.cs:48-80)

1. **Color Tiles** (Frame 1) - Visual recognition phase
2. **Zoom In** (Frames 2-7) - Focus drawing animation (5 frames)
3. **Show UnderBoard** (Frames 5-19) - Background highlight (14 frames)
4. **Show Topic** (Frames 14-28) - Trait identification (14 frames)
5. **Wait Period** (Frames 28-67) - Player recognition time (39 frames)
6. **Move Row** (Frames 68-85) - Row repositioning (17 frames)
7. **Hide Effects** (Frame 86+) - Cleanup phase
8. **Collapse** (125-132 frames) - Tile compression (7 frames)
9. **Data Replacement** (132-133 frames) - ⚠️ CRITICAL: Core logic update (1 frame)
10. **Expand** (138-148 frames) - Tile expansion (10 frames)
11. **Reset Position** - Final layout adjustment
12. **Unlock Tiles** - Re-enable interaction

**WARNING**: Steps 8-10 (Collapse → Data Replacement → Expand) MUST NOT be interrupted. Data replacement at frames 132-133 is the critical juncture where tile traits are actually changed in the level data.

## Deadlock Prevention Strategies

### FIX: Timeout Mechanism (Add to Map.cs)
```csharp
// Add timeout to prevent infinite animation loops
IEnumerator ProcessAnimationQueueWithTimeout()
{
    isProcessingAnimations = true;
    float timeout = 10f; // 10 second timeout
    float startTime = Time.time;

    while (pendingAnimationBatches.Count > 0)
    {
        if (Time.time - startTime > timeout)
        {
            Debug.LogError("Animation queue timeout! Force clearing...");
            pendingAnimationBatches.Clear();
            break;
        }

        // ... process batches
    }

    isProcessingAnimations = false;
}
```

### FIX: Level Transition Cleanup
```csharp
// ALWAYS call when switching levels
Map.Instance.ClearGroups();
TileGroupHelper.ResetAnimationState();
NormalTile.ForceResetDragState();
```
