# Debugging Scenarios - Rapid Issue Diagnosis

Quick diagnostic guide for common issues in Match Squad with step-by-step fixes.

## Scenario 1: Tiles Not Responding to Input

### Root Cause A: Input Blocking During Map Generation

**DEBUG**:
```csharp
Debug.Log($"Input blocked: {LevelController.IsGeneratingMap}");
```

**FIX**: Wait for map generation to complete, or force enable if stuck:
```csharp
// Force enable if stuck (emergency only)
LevelController.ForceEnableInput();
```

### Root Cause B: Animation State Stuck

**DEBUG**:
```csharp
Debug.Log($"Animations running: {TileGroupHelper.IsAnimationRunning}");
Debug.Log($"Active count: {TileGroupHelper.ActiveAnimationCount}");
```

**FIX**: Reset animation state:
```csharp
TileGroupHelper.ResetAnimationState();
```

### Root Cause C: Tile Permanently Locked

**DEBUG**:
```csharp
// Check individual tile lock status
Debug.Log($"Tile locked: {normalTile.IsLocked()}");
```

**FIX**: Unlock tiles (careful - may affect gameplay):
```csharp
Map.Instance.UnlockAllTiles();
```

## Scenario 2: Group Detection Not Working

### Root Cause A: Stale Cache

**DEBUG**:
```csharp
var cachedSegments = Map.Instance.GroupDetector.CachedSegments;
Debug.Log($"Cached segments: {cachedSegments.Count}");
```

**FIX**: Invalidate cache to force rebuild:
```csharp
Map.Instance.GroupDetector.InvalidateCache();
```

### Root Cause B: Trait Double-Counting

**DEBUG**:
```csharp
var completeTraits = Map.Instance.GroupDetector.CompleteTraits;
Debug.Log($"Complete traits: {string.Join(", ", completeTraits)}");
```

**FIX**: Clear spawned traits if incorrect:
```csharp
Map.Instance.GroupDetector.ClearSpawnedTraits();
```

**WARNING**: This will affect win condition calculation. Use only if traits are genuinely miscounted.

## Scenario 3: Win Condition Not Triggering

### Root Cause A: Animations Still Processing

**DEBUG**:
```csharp
Debug.Log($"Processing animations: {Map.Instance.isProcessingAnimations}");
Debug.Log($"Pending groups: {Map.Instance.allPendingGroups.Count}");
```

**FIX**: Win condition is deferred until animations complete. Wait for `isProcessingAnimations` to become false.

### Root Cause B: Trait Count Mismatch

**DEBUG**:
```csharp
var levelData = LevelController.Instance.LevelData;
var requiredTraits = levelData.Traits.Length;
var completedTraits = Map.Instance.GroupDetector.CompleteTraits.Count;
Debug.Log($"Win Check: {completedTraits}/{requiredTraits} traits completed");
```

**FIX**: If counts don't match expected values, check:
1. Are all required traits in the level data?
2. Are complete traits being double-counted? (see Scenario 2B)
3. Is trait spawning system replacing traits correctly?

## Scenario 4: DOTween Animation Stuck/Not Playing

### Root Cause A: Animation Not Killed Properly

**DEBUG**:
```csharp
// Check if old animations are still running
DOTween.TotalPlayingTweens();  // Returns total active tweens
```

**FIX**: Kill all animations on the object:
```csharp
transform.DOKill();
rectTransform.DOKill();
spriteRenderer.DOKill();
// Or use helper:
TileAnimationController.KillAllAnimations(rectTransform);
```

### Root Cause B: SetUpdate() Not Used for UI

**DEBUG**:
```csharp
Debug.Log($"Time.timeScale: {Time.timeScale}");
```

**FIX**: If timeScale is 0 (paused), UI animations need SetUpdate(true):
```csharp
rectTransform.DOAnchorPos(targetPos, 0.5f)
    .SetUpdate(true);  // ⚠️ Independent of timeScale
```

### Root Cause C: Animation Interrupted by Object Destruction

**WARNING**: If the GameObject is destroyed before animation completes, DOTween throws errors.

**FIX**: Kill animations before destroying:
```csharp
TileAnimationController.KillAllAnimations(rectTransform);
Destroy(gameObject);
```

## Scenario 5: Performance Issues / Frame Drops

### Root Cause A: Object Pool Leaks

**DEBUG**: Check for increasing object counts without returns:
```csharp
// Look in Unity Hierarchy for increasing tile/UI counts
// Or add custom pool statistics logging
```

**FIX**: Ensure all pooled objects are returned:
```csharp
// ALWAYS return to pool
PYDPool.ReturnToPool(tile.gameObject);
```

### Root Cause B: DOTween Memory Leaks

**DEBUG**:
```csharp
Debug.Log($"Total tweens: {DOTween.TotalPlayingTweens()}");
```

**FIX**: Kill animations properly and use SetAutoKill:
```csharp
Sequence sequence = DOTween.Sequence();
sequence.SetAutoKill(true);  // Auto-cleanup when complete
```

### Root Cause C: Event Subscription Leaks

**WARNING**: Events not unsubscribed cause memory leaks and duplicate callbacks.

**FIX**: Always unsubscribe in OnDestroy:
```csharp
private void OnDestroy()
{
    Map.OnTilesSwapped -= HandleTileSwap;
    Map.OnGroupsUpdated -= HandleGroupUpdate;
}
```

## Scenario 6: Trait Spawning Not Replacing Tiles

### Root Cause: Data Replacement Interrupted

**DEBUG**: Check if trait spawning animation completed:
```csharp
Debug.Log($"Processing trait spawning: {Map.Instance.isProcessingTraitSpawning}");
```

**WARNING**: TraitSpawningEffectHelper's 12-step sequence MUST complete fully. Data replacement occurs at frames 132-133. If interrupted, tiles appear unchanged.

**FIX**: Ensure no level transitions or input during trait spawning animation (3-4 seconds).

## Scenario 7: Input Validation Failures

### Root Cause: Multi-Touch Interference

**DEBUG**:
```csharp
// Check touch count
Debug.Log($"Touch count: {Input.touchCount}");
```

**FIX**: Validate single-touch input:
```csharp
if (Input.touchCount > 1)
{
    return; // Ignore multi-touch
}
```

**WARNING**: NormalTile.cs:14 mentions `debugMultiTouch` flag needs improvement for handling rapid touch sequences.
