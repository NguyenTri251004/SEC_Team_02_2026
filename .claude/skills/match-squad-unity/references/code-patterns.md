# Code Patterns - Copy-Paste Ready Examples

Production-ready code patterns for common Match Squad development tasks.

## Level Loading Pattern

### PATTERN: Standard Level Loading Sequence
```csharp
public void LoadLevel(Action onComplete)
{
    // 1. Stop existing timers
    StopTimer();

    // 2. Get level data with randomization
    int levelIndex = levelDatabase.GetRandomLevelIndex(
        levelSave.DisplayLevelNumber,
        levelSave.RealLevelNumber,
        levelSave.ReplayingLevelAgain);

    // 3. Load and validate level data
    loadedLevelData = levelDatabase.GetLevel(levelIndex);

    // 4. Clear previous level state
    if (isStageLoaded)
    {
        UnLoadStage();
    }

    // 5. Create new map with animations
    CreateMap(loadedLevelData);

    // 6. Setup UI and progression tracking
    mainMenu.InitCountTraits(loadedLevelData.Traits.Length);

    // 7. Configure timer if needed
    if (loadedLevelData.LevelDuration > 0f)
    {
        levelDuration = loadedLevelData.LevelDuration;
        mainMenu.ShowTimer(true, levelDuration);
    }

    onComplete?.Invoke();
}
```

## Tile Swapping Pattern

### PATTERN: Safe Tile Swapping with Validation
```csharp
public bool RequestSwap(Tile tile1, Tile tile2)
{
    // 1. Validate swap possibility
    if (!CanSwap(tile1, tile2))
    {
        return false;
    }

    // 2. Perform position swap with visual feedback
    SwapTilePositions(tile1, tile2);

    // 3. Notify observers
    OnTilesSwapped?.Invoke(tile1, tile2);

    // 4. Update game state
    UpdateGroupsAndWinCondition();

    // 5. Provide audio/haptic feedback
    AudioController.PlaySound(AudioController.AudioClips.swapSound);
    HapticManager.Instance?.PlayTileSwap();

    return true;
}
```

## Group Detection Pattern

### PATTERN: Efficient Group Detection with Caching
```csharp
public List<TileGroup> DetectHorizontalGroups()
{
    // 1. Build cache if needed (expensive operation)
    if (cachedSegments.Count == 0)
    {
        BuildSegmentsCache();
    }

    // 2. Use cached segments for detection (fast operation)
    var groups = DetectGroupsFromCachedSegments();

    // 3. Filter completed traits to prevent double-counting
    var activeGroups = groups.Where(g =>
        !completeTraits.Contains(g.sharedTraits.First())).ToList();

    // 4. Update completion tracking
    foreach (var group in activeGroups)
    {
        completeTraits.Add(group.sharedTraits.First());
    }

    return activeGroups;
}
```

## Object Pooling Patterns

### PATTERN: Spawn from Pool
```csharp
// Spawn tile from pool
TileSlot newSlot = PYDPool.Spawn<TileSlot>(
    GameController.Data.TileSlotPrefab.gameObject,
    Vector3.zero,
    Quaternion.identity,
    map.transform);

// Configure spawned object
newSlot.Initialize(position);
```

### PATTERN: Return to Pool
```csharp
// ALWAYS return objects to pool (NEVER use Destroy)
PYDPool.ReturnToPool(tile.gameObject);
```

## DOTween Sequence Examples

### PATTERN: Simple Scale Bounce
```csharp
transform.DOScale(1.2f, 0.2f)
    .SetEase(Ease.OutBack)
    .OnComplete(() => transform.DOScale(1f, 0.2f));
```

### PATTERN: Complex Chained Sequence
```csharp
Sequence sequence = DOTween.Sequence();
sequence.Append(transform.DOScale(1.2f, 0.2f));
sequence.Append(transform.DORotate(new Vector3(0, 0, 360), 0.5f, RotateMode.FastBeyond360));
sequence.Append(transform.DOScale(1f, 0.2f));
sequence.SetAutoKill(true);
sequence.OnComplete(() => Debug.Log("Sequence complete"));
```

### PATTERN: Parallel Animations with Insert
```csharp
Sequence sequence = DOTween.Sequence();
sequence.Append(transform.DOMove(targetPos, 0.5f));
sequence.Insert(0f, spriteRenderer.DOFade(0f, 0.5f)); // Parallel at start
sequence.Insert(0.2f, transform.DOScale(1.5f, 0.3f)); // Parallel at 0.2s
```

### PATTERN: Loop with Ping-Pong
```csharp
transform.DOScale(1.2f, 0.5f)
    .SetEase(Ease.InOutSine)
    .SetLoops(-1, LoopType.Yoyo); // Infinite ping-pong
```

## Event Handling Pattern

### PATTERN: Subscribe and Unsubscribe
```csharp
private void OnEnable()
{
    Map.OnTilesSwapped += HandleTileSwap;
    Map.OnGroupsUpdated += HandleGroupUpdate;
}

private void OnDisable()
{
    Map.OnTilesSwapped -= HandleTileSwap;
    Map.OnGroupsUpdated -= HandleGroupUpdate;
}

private void HandleTileSwap(Tile tile1, Tile tile2)
{
    Debug.Log($"Tiles swapped: {tile1.name} <-> {tile2.name}");
}

private void HandleGroupUpdate(List<TileGroup> groups)
{
    Debug.Log($"Groups updated: {groups.Count} groups detected");
}
```

## Animation Queue Processing

### PATTERN: Sequential Animation Processing
```csharp
private IEnumerator ProcessAnimationQueue()
{
    isProcessingAnimations = true;

    while (pendingAnimationBatches.Count > 0)
    {
        var currentBatch = pendingAnimationBatches.Dequeue();

        // Separate trait spawning (blocking) from normal animations
        var (normalGroups, traitSpawningGroups) = SeparateGroupsByType(currentBatch);

        // Process trait spawning FIRST (blocking operation)
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
    CheckWinConditionAfterAnimations();
}
```

## Power-Up Implementation Pattern

### PATTERN: Basic Power-Up Structure
```csharp
public class CustomPowerUp : PowerUpBase
{
    public override void Activate()
    {
        // 1. Check if power-up is available
        if (!CanActivate())
        {
            return;
        }

        // 2. Consume power-up
        PowerUpManager.Instance.ConsumePowerUp(powerUpType);

        // 3. Execute power-up logic
        ExecutePowerUpEffect();

        // 4. Provide feedback
        AudioController.PlaySound(AudioController.AudioClips.powerUpSound);
        HapticManager.Instance?.PlayPowerUpActivation();

        // 5. Update UI
        UIGame.Instance.UpdatePowerUpDisplay(powerUpType);
    }

    protected override void ExecutePowerUpEffect()
    {
        // Custom power-up logic here
    }
}
```

## Cache Invalidation Pattern

### PATTERN: Invalidate Cache After Map Changes
```csharp
public void OnTileRemoved()
{
    // Map structure changed - invalidate cache
    groupDetector.InvalidateCache();

    // Re-detect groups with fresh cache
    UpdateGroupsAndWinCondition();
}
```

## Level Transition Cleanup

### PATTERN: Complete Cleanup on Level Change
```csharp
public void UnloadLevel()
{
    // 1. Clear map state
    Map.Instance.ClearGroups();

    // 2. Reset animation state
    TileGroupHelper.ResetAnimationState();

    // 3. Reset input state
    NormalTile.ForceResetDragState();

    // 4. Kill all active animations
    DOTween.KillAll();

    // 5. Return all pooled objects
    Map.Instance.ReturnAllTilesToPool();
}
```
