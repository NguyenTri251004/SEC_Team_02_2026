# New Mechanics Implementation Guide

Complete guide for implementing tile mechanics in Match Squad including Hidden tiles, Frost effects, Key-Lock systems, Jammers, and Nails.

## Architecture Overview

### Mechanic Inheritance Structure
```csharp
Tile (abstract base)
└── NormalTile (draggable gameplay tiles)
    ├── HiddenTile (requires reveal)
    ├── FrostTile (requires thawing)
    ├── LockedTile (requires key)
    ├── JammerTile (isolated tiles)
    └── NailTile (permanent position)
```

## Hidden Tile Mechanic

Hidden tiles are not visible until revealed by matching adjacent tiles.

### PATTERN: Hidden Tile Implementation
```csharp
public class HiddenTile : NormalTile
{
    [Header("Hidden State")]
    [SerializeField] private GameObject coverSprite;
    [SerializeField] private ParticleSystem revealEffect;

    private bool isRevealed = false;

    public override void Initialize(ElementData elementData)
    {
        base.Initialize(elementData);

        // Start hidden
        isRevealed = false;
        UpdateVisualState();
    }

    /// <summary>
    /// Hidden tiles cannot be interacted with until revealed.
    /// </summary>
    protected override bool CanBeInteracted()
    {
        if (!isRevealed)
        {
            return false;
        }

        return base.CanBeInteracted();
    }

    /// <summary>
    /// Reveal the tile with animation.
    /// </summary>
    public void Reveal()
    {
        if (isRevealed) return;

        isRevealed = true;
        PlayRevealAnimation();
    }

    private void PlayRevealAnimation()
    {
        // Hide cover with animation
        Sequence sequence = DOTween.Sequence();
        sequence.Append(coverSprite.transform.DOScale(0f, 0.3f));
        sequence.Join(coverSprite.GetComponent<SpriteRenderer>().DOFade(0f, 0.3f));
        sequence.OnComplete(() => coverSprite.SetActive(false));

        // Play reveal effect
        if (revealEffect != null)
        {
            revealEffect.Play();
        }

        // Audio/haptic feedback
        AudioController.PlaySound(AudioController.AudioClips.revealSound);
        HapticManager.Instance?.PlayReveal();
    }

    private void UpdateVisualState()
    {
        coverSprite.SetActive(!isRevealed);
    }
}
```

### PATTERN: Hidden Tile Detection System
```csharp
// In Map.cs or GroupDetector.cs
public void CheckAdjacentHiddenTiles(List<Tile> matchedTiles)
{
    HashSet<HiddenTile> hiddenToReveal = new HashSet<HiddenTile>();

    foreach (Tile tile in matchedTiles)
    {
        // Get adjacent tiles
        List<Tile> adjacents = GetAdjacentTiles(tile.GridPosition);

        foreach (Tile adjacent in adjacents)
        {
            if (adjacent is HiddenTile hiddenTile && !hiddenTile.IsRevealed)
            {
                hiddenToReveal.Add(hiddenTile);
            }
        }
    }

    // Reveal all hidden tiles
    foreach (HiddenTile hidden in hiddenToReveal)
    {
        hidden.Reveal();
    }
}
```

## Frost Tile Mechanic

Frost tiles require multiple matches to thaw completely.

### PATTERN: Frost Tile with Progressive Thawing
```csharp
public class FrostTile : NormalTile
{
    [Header("Frost State")]
    [SerializeField] private GameObject[] frostLayers; // Visual layers for each frost level
    [SerializeField] private ParticleSystem thawEffect;

    private int currentFrostLevel = 2; // 0 = no frost, 1-2 = frost levels
    private const int MAX_FROST_LEVEL = 2;

    public override void Initialize(ElementData elementData)
    {
        base.Initialize(elementData);

        // Set initial frost level from element data
        currentFrostLevel = elementData.FrostLevel;
        UpdateFrostVisual();
    }

    /// <summary>
    /// Frost tiles can be swapped but require thawing to match.
    /// </summary>
    public override bool CanMatch()
    {
        // Can only match when fully thawed
        return currentFrostLevel == 0 && base.CanMatch();
    }

    /// <summary>
    /// Called when adjacent tiles are matched.
    /// </summary>
    public void ReduceFrost()
    {
        if (currentFrostLevel > 0)
        {
            currentFrostLevel--;
            PlayThawAnimation();
            UpdateFrostVisual();
        }
    }

    private void PlayThawAnimation()
    {
        // Play thaw effect
        if (thawEffect != null)
        {
            thawEffect.Play();
        }

        // Animate current layer disappearing
        if (currentFrostLevel < MAX_FROST_LEVEL && frostLayers[currentFrostLevel] != null)
        {
            GameObject layer = frostLayers[currentFrostLevel];

            Sequence sequence = DOTween.Sequence();
            sequence.Append(layer.transform.DOScale(0f, 0.3f));
            sequence.Join(layer.GetComponent<SpriteRenderer>().DOFade(0f, 0.3f));
            sequence.OnComplete(() => layer.SetActive(false));
        }

        // Feedback
        AudioController.PlaySound(AudioController.AudioClips.thawSound);
        HapticManager.Instance?.PlayThaw();
    }

    private void UpdateFrostVisual()
    {
        for (int i = 0; i < frostLayers.Length; i++)
        {
            frostLayers[i].SetActive(i < currentFrostLevel);
        }
    }

    public bool IsFullyThawed => currentFrostLevel == 0;
}
```

## Key-Lock Mechanic

Locked tiles require a key tile to be matched first.

### PATTERN: Key-Lock System
```csharp
public class LockedTile : NormalTile
{
    [Header("Lock State")]
    [SerializeField] private int requiredKeyId; // Which key unlocks this
    [SerializeField] private GameObject lockSprite;
    [SerializeField] private ParticleSystem unlockEffect;

    private bool isLocked = true;

    public override void Initialize(ElementData elementData)
    {
        base.Initialize(elementData);

        requiredKeyId = elementData.KeyId;
        isLocked = true;
        UpdateLockVisual();
    }

    protected override bool CanBeInteracted()
    {
        if (isLocked)
        {
            return false;
        }

        return base.CanBeInteracted();
    }

    public void Unlock()
    {
        if (!isLocked) return;

        isLocked = false;
        PlayUnlockAnimation();
    }

    private void PlayUnlockAnimation()
    {
        Sequence sequence = DOTween.Sequence();
        sequence.Append(lockSprite.transform.DOShakeRotation(0.5f, 30f));
        sequence.Append(lockSprite.transform.DOScale(0f, 0.3f));
        sequence.OnComplete(() => lockSprite.SetActive(false));

        if (unlockEffect != null)
        {
            unlockEffect.Play();
        }

        AudioController.PlaySound(AudioController.AudioClips.unlockSound);
        HapticManager.Instance?.PlayUnlock();
    }

    private void UpdateLockVisual()
    {
        lockSprite.SetActive(isLocked);
    }

    public int KeyId => requiredKeyId;
    public bool IsLocked => isLocked;
}

public class KeyTile : NormalTile
{
    [Header("Key State")]
    [SerializeField] private int keyId; // Which locks this key opens

    public override void OnMatched()
    {
        base.OnMatched();

        // Unlock all tiles with matching key ID
        UnlockMatchingTiles();
    }

    private void UnlockMatchingTiles()
    {
        // Find all locked tiles with matching key ID
        var allTiles = Map.Instance.GetAllTiles();

        foreach (Tile tile in allTiles)
        {
            if (tile is LockedTile lockedTile && lockedTile.KeyId == keyId)
            {
                lockedTile.Unlock();
            }
        }
    }

    public int KeyId => keyId;
}
```

## Jammer Tile Detection

Jammer tiles are isolated and prevent matching until cleared.

### PATTERN: Jammer Detection (from GroupDetector.cs:434-460)
```csharp
public List<Tile> DetectJammerTiles()
{
    List<Tile> jammers = new List<Tile>();

    for (int row = 0; row < map.Height; row++)
    {
        for (int col = 0; col < map.Width; col++)
        {
            Tile tile = map.GetTileAt(row, col);

            if (tile == null || tile.IsEmpty) continue;

            // Check if tile is isolated (no matching neighbors)
            if (IsIsolatedTile(tile))
            {
                jammers.Add(tile);
            }
        }
    }

    return jammers;
}

private bool IsIsolatedTile(Tile tile)
{
    List<Tile> adjacents = GetAdjacentTiles(tile.GridPosition);

    // Check if any adjacent tile shares traits
    foreach (Tile adjacent in adjacents)
    {
        if (adjacent != null && HasSharedTraits(tile, adjacent))
        {
            return false; // Not isolated
        }
    }

    return true; // Isolated (jammer)
}
```

## Nail Tile Mechanic

Nail tiles cannot be moved but can be matched in place.

### PATTERN: Nail Tile (from NormalTile.cs:69-73)
```csharp
public class NailTile : NormalTile
{
    protected override bool CanBeInteracted()
    {
        // Nail tiles cannot be dragged
        return false;
    }

    public override bool CanMatch()
    {
        // Can still be matched in place
        return base.CanMatch();
    }
}
```

## WARNING: Common Pitfalls

1. **Mechanic State Persistence**: Always save mechanic state (frost level, locked state) in element data
2. **Animation Conflicts**: Ensure mechanic animations don't conflict with tile swap animations
3. **Group Detection**: Update GroupDetector to handle mechanic-specific matching rules
4. **Win Condition**: Account for mechanics when checking win conditions (e.g., all locks must be unlocked)
