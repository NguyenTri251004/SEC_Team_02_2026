# Game Flow Validation Guide

Comprehensive guide for validating level design, detecting impossible levels, deadlock scenarios, and unwinnable states.

## Validation Categories

1. **Solvability Check**: Can the level be completed?
2. **Deadlock Detection**: Can player get stuck?
3. **Win Condition Validation**: Are win conditions achievable?
4. **Move Count Estimation**: Is move limit realistic?
5. **Trait Balance**: Are traits distributed properly?

## Level Solvability Validation

### PATTERN: Basic Solvability Check
```csharp
public class LevelValidator
{
    public ValidationResult ValidateLevel(LevelData levelData)
    {
        var result = new ValidationResult();

        // 1. Check basic structure
        if (!ValidateBasicStructure(levelData, result))
        {
            return result;
        }

        // 2. Check trait coverage
        if (!ValidateTraitCoverage(levelData, result))
        {
            return result;
        }

        // 3. Check for deadlock scenarios
        if (!ValidateNoDeadlocks(levelData, result))
        {
            return result;
        }

        // 4. Check win condition achievability
        if (!ValidateWinCondition(levelData, result))
        {
            return result;
        }

        // 5. Estimate move count
        ValidateMoveCount(levelData, result);

        result.IsValid = !result.HasErrors;
        return result;
    }

    private bool ValidateBasicStructure(LevelData levelData, ValidationResult result)
    {
        // Check grid dimensions
        if (levelData.Width <= 0 || levelData.Height <= 0)
        {
            result.AddError("Invalid grid dimensions");
            return false;
        }

        // Check element count matches grid size
        int expectedElements = levelData.Width * levelData.Height;
        if (levelData.Elements.Length != expectedElements)
        {
            result.AddError($"Element count mismatch: expected {expectedElements}, got {levelData.Elements.Length}");
            return false;
        }

        // Check for empty grid
        int nonEmptyCount = levelData.Elements.Count(e => e.Type != ElementType.Empty);
        if (nonEmptyCount == 0)
        {
            result.AddError("Level has no playable tiles");
            return false;
        }

        return true;
    }

    private bool ValidateTraitCoverage(LevelData levelData, ValidationResult result)
    {
        // Get required traits
        HashSet<int> requiredTraits = new HashSet<int>(levelData.Traits);

        // Count available traits
        Dictionary<int, int> traitCounts = new Dictionary<int, int>();

        foreach (var element in levelData.Elements)
        {
            if (element.Type == ElementType.Empty) continue;

            foreach (int trait in element.CharacterTraits)
            {
                if (!traitCounts.ContainsKey(trait))
                {
                    traitCounts[trait] = 0;
                }
                traitCounts[trait]++;
            }
        }

        // Check each required trait has minimum coverage
        const int MIN_TRAIT_COUNT = 3; // Minimum tiles per trait for matching

        foreach (int requiredTrait in requiredTraits)
        {
            if (!traitCounts.ContainsKey(requiredTrait))
            {
                result.AddError($"Required trait {requiredTrait} not found in level");
                return false;
            }

            if (traitCounts[requiredTrait] < MIN_TRAIT_COUNT)
            {
                result.AddWarning($"Trait {requiredTrait} has only {traitCounts[requiredTrait]} tiles (minimum {MIN_TRAIT_COUNT} recommended)");
            }
        }

        return true;
    }
}
```

## Deadlock Detection

### PATTERN: Detect Impossible States
```csharp
public bool ValidateNoDeadlocks(LevelData levelData, ValidationResult result)
{
    // Simulate level to check for deadlocks
    var simulator = new LevelSimulator(levelData);

    // Check for isolated tiles (jammers)
    var jammers = simulator.DetectJammerTiles();
    if (jammers.Count > 0)
    {
        // Check if jammers can be cleared
        bool allJammersClearable = CheckJammersClearable(jammers, simulator);

        if (!allJammersClearable)
        {
            result.AddError($"Found {jammers.Count} unclearable jammer tiles");
            return false;
        }
        else
        {
            result.AddWarning($"Found {jammers.Count} jammer tiles (may be intentional)");
        }
    }

    // Check for locked regions
    var lockedRegions = simulator.DetectLockedRegions();
    if (lockedRegions.Count > 0)
    {
        result.AddWarning($"Found {lockedRegions.Count} potentially locked regions");
    }

    // Check for impossible key-lock configurations
    if (!ValidateKeyLockConfiguration(levelData, result))
    {
        return false;
    }

    return true;
}

private bool CheckJammersClearable(List<Vector2Int> jammers, LevelSimulator simulator)
{
    foreach (var jammerPos in jammers)
    {
        // Check if jammer has special mechanics that can clear it
        var element = simulator.GetElementAt(jammerPos);

        // Hidden tiles can be revealed
        if (element.IsHidden)
        {
            continue;
        }

        // Frost tiles can be thawed
        if (element.HasFrost)
        {
            continue;
        }

        // Locked tiles can be unlocked
        if (element.IsLocked && simulator.HasMatchingKey(element.KeyId))
        {
            continue;
        }

        // Check trait spawning
        if (simulator.HasTraitSpawningForJammer(jammerPos))
        {
            continue;
        }

        // No way to clear this jammer
        return false;
    }

    return true;
}

private bool ValidateKeyLockConfiguration(LevelData levelData, ValidationResult result)
{
    // Find all locked tiles and keys
    Dictionary<int, int> lockedTileCount = new Dictionary<int, int>();
    Dictionary<int, int> keyCount = new Dictionary<int, int>();

    foreach (var element in levelData.Elements)
    {
        if (element.IsLocked)
        {
            int keyId = element.KeyId;
            if (!lockedTileCount.ContainsKey(keyId))
            {
                lockedTileCount[keyId] = 0;
            }
            lockedTileCount[keyId]++;
        }

        if (element.IsKey)
        {
            int keyId = element.KeyId;
            if (!keyCount.ContainsKey(keyId))
            {
                keyCount[keyId] = 0;
            }
            keyCount[keyId]++;
        }
    }

    // Check each locked tile has corresponding key
    foreach (var kvp in lockedTileCount)
    {
        int keyId = kvp.Key;
        int lockedCount = kvp.Value;

        if (!keyCount.ContainsKey(keyId))
        {
            result.AddError($"Locked tiles with key ID {keyId} have no corresponding key");
            return false;
        }

        if (keyCount[keyId] == 0)
        {
            result.AddError($"Key ID {keyId} count is zero but has {lockedCount} locked tiles");
            return false;
        }
    }

    return true;
}
```

## Win Condition Validation

### PATTERN: Win Condition Achievability
```csharp
private bool ValidateWinCondition(LevelData levelData, ValidationResult result)
{
    // Check if all required traits can form valid groups
    foreach (int requiredTrait in levelData.Traits)
    {
        if (!CanTraitFormValidGroup(levelData, requiredTrait))
        {
            result.AddError($"Required trait {requiredTrait} cannot form a valid group (minimum 3 tiles in a row)");
            return false;
        }
    }

    // Check trait spawning configuration
    if (levelData.TraitSpawningConfigurations != null)
    {
        foreach (var config in levelData.TraitSpawningConfigurations)
        {
            if (!ValidateTraitSpawningConfig(levelData, config, result))
            {
                return false;
            }
        }
    }

    return true;
}

private bool CanTraitFormValidGroup(LevelData levelData, int traitId)
{
    // Create grid representation
    var grid = CreateGridFromLevelData(levelData);

    // Find all tiles with this trait
    List<Vector2Int> traitPositions = new List<Vector2Int>();

    for (int row = 0; row < levelData.Height; row++)
    {
        for (int col = 0; col < levelData.Width; col++)
        {
            var element = grid[row, col];
            if (element.CharacterTraits.Contains(traitId))
            {
                traitPositions.Add(new Vector2Int(col, row));
            }
        }
    }

    // Check if at least 3 tiles can potentially form a horizontal group
    // This is a simplified check - full validation would require path-finding
    return traitPositions.Count >= 3;
}

private bool ValidateTraitSpawningConfig(LevelData levelData, TraitSpawnConfiguration config, ValidationResult result)
{
    // Check required trait exists
    if (!levelData.Traits.Contains(config.RequiredTraitId))
    {
        result.AddError($"Trait spawning config requires trait {config.RequiredTraitId} but it's not in required traits");
        return false;
    }

    // Check replacement tiles are valid
    if (config.ReplacementTiles == null || config.ReplacementTiles.Length == 0)
    {
        result.AddError("Trait spawning config has no replacement tiles");
        return false;
    }

    // Check replacement doesn't create impossible state
    // (This would require full simulation)

    return true;
}
```

## Move Count Estimation

### PATTERN: Estimate Required Moves
```csharp
private void ValidateMoveCount(LevelData levelData, ValidationResult result)
{
    // Estimate minimum moves required
    int estimatedMoves = EstimateMinimumMoves(levelData);

    // Add buffer for player mistakes (typical player needs 2-3x optimal)
    int recommendedMoves = estimatedMoves * 3;

    if (levelData.MaxMoves > 0 && levelData.MaxMoves < estimatedMoves)
    {
        result.AddError($"Move limit ({levelData.MaxMoves}) is less than estimated minimum ({estimatedMoves})");
    }
    else if (levelData.MaxMoves > 0 && levelData.MaxMoves < recommendedMoves)
    {
        result.AddWarning($"Move limit ({levelData.MaxMoves}) may be too strict. Recommended: {recommendedMoves}");
    }

    result.EstimatedMoves = estimatedMoves;
    result.RecommendedMoves = recommendedMoves;
}

private int EstimateMinimumMoves(LevelData levelData)
{
    // Count required trait groups
    int requiredGroups = levelData.Traits.Length;

    // Factor in trait spawning
    int traitSpawningSteps = levelData.TraitSpawningConfigurations?.Length ?? 0;

    // Rough estimate: each group requires 2-3 moves on average
    int baseMoves = requiredGroups * 2;

    // Add trait spawning steps
    int totalMoves = baseMoves + traitSpawningSteps;

    return totalMoves;
}
```

## Auto-Validation in Editor

### PATTERN: Editor Validation Tool
```csharp
#if UNITY_EDITOR
[CustomEditor(typeof(LevelData))]
public class LevelDataEditor : Editor
{
    public override void OnInspectorGUI()
    {
        base.OnInspectorGUI();

        LevelData levelData = (LevelData)target;

        GUILayout.Space(10);

        if (GUILayout.Button("Validate Level", GUILayout.Height(30)))
        {
            ValidateLevel(levelData);
        }
    }

    private void ValidateLevel(LevelData levelData)
    {
        var validator = new LevelValidator();
        var result = validator.ValidateLevel(levelData);

        // Display results
        if (result.IsValid)
        {
            EditorUtility.DisplayDialog("Validation Success",
                $"Level is valid!\n\nEstimated moves: {result.EstimatedMoves}\nRecommended moves: {result.RecommendedMoves}",
                "OK");
        }
        else
        {
            string message = "Validation Failed:\n\n";
            message += string.Join("\n", result.Errors);

            if (result.Warnings.Count > 0)
            {
                message += "\n\nWarnings:\n";
                message += string.Join("\n", result.Warnings);
            }

            EditorUtility.DisplayDialog("Validation Failed", message, "OK");
        }
    }
}
#endif
```

## ValidationResult Structure

```csharp
public class ValidationResult
{
    public bool IsValid { get; set; }
    public List<string> Errors { get; private set; } = new List<string>();
    public List<string> Warnings { get; private set; } = new List<string>();

    public int EstimatedMoves { get; set; }
    public int RecommendedMoves { get; set; }

    public bool HasErrors => Errors.Count > 0;
    public bool HasWarnings => Warnings.Count > 0;

    public void AddError(string error)
    {
        Errors.Add(error);
    }

    public void AddWarning(string warning)
    {
        Warnings.Add(warning);
    }
}
```

## WARNING: Common Validation Pitfalls

1. **Over-Validation**: Don't block creative level designs that seem unusual but are solvable
2. **Performance**: Validation should be fast for Editor workflow (< 1 second)
3. **False Positives**: Some "impossible" levels may be solvable with trait spawning
4. **Dynamic Content**: Account for power-ups that can alter level state
