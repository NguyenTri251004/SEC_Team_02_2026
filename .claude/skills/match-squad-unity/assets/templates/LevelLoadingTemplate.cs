using System;
using System.Collections;
using UnityEngine;
using DG.Tweening;

/// <summary>
/// Template for loading levels with proper cleanup, validation, and animation sequencing.
/// Based on Match Squad's LevelController pattern.
/// </summary>
public class LevelLoadingTemplate : MonoBehaviour
{
    [Header("References")]
    [SerializeField] private LevelDatabase levelDatabase;
    [SerializeField] private Map map;
    [SerializeField] private UIGame mainMenu;

    [Header("State")]
    private LevelData loadedLevelData;
    private bool isStageLoaded = false;
    private bool isGeneratingMap = false;
    private float levelDuration;

    // Save references
    private LevelSave levelSave;

    private void Awake()
    {
        // Get save data reference
        levelSave = SaveController.GetSaveObject<LevelSave>();
    }

    /// <summary>
    /// Main level loading sequence with proper cleanup and validation.
    /// </summary>
    public void LoadLevel(Action onComplete)
    {
        // Step 1: Stop existing timers
        StopTimer();

        // Step 2: Get level data with randomization support
        int levelIndex = GetLevelIndex();
        loadedLevelData = levelDatabase.GetLevel(levelIndex);

        // Step 3: Validate level data
        if (!ValidateLevelData(loadedLevelData))
        {
            Debug.LogError($"Invalid level data at index {levelIndex}");
            return;
        }

        // Step 4: Clear previous level state
        if (isStageLoaded)
        {
            UnLoadStage();
        }

        // Step 5: Create new map with animations
        CreateMap(loadedLevelData, () =>
        {
            // Step 6: Setup UI and progression tracking
            mainMenu.InitCountTraits(loadedLevelData.Traits.Length);

            // Step 7: Configure timer if needed
            if (loadedLevelData.LevelDuration > 0f)
            {
                levelDuration = loadedLevelData.LevelDuration;
                mainMenu.ShowTimer(true, levelDuration);
                StartTimer();
            }

            isStageLoaded = true;
            onComplete?.Invoke();
        });
    }

    /// <summary>
    /// Gets the appropriate level index based on player progression.
    /// </summary>
    private int GetLevelIndex()
    {
        return levelDatabase.GetRandomLevelIndex(
            levelSave.DisplayLevelNumber,
            levelSave.RealLevelNumber,
            levelSave.ReplayingLevelAgain);
    }

    /// <summary>
    /// Validates level data before loading.
    /// </summary>
    private bool ValidateLevelData(LevelData levelData)
    {
        if (levelData == null)
        {
            return false;
        }

        if (levelData.Traits == null || levelData.Traits.Length == 0)
        {
            Debug.LogWarning("Level has no traits defined");
            return false;
        }

        return true;
    }

    /// <summary>
    /// Creates the map with animated tile spawning.
    /// </summary>
    private void CreateMap(LevelData levelData, Action onComplete)
    {
        // Block input during map generation
        isGeneratingMap = true;

        // Setup grid layout
        map.SetupGrid(levelData.Width, levelData.Height);

        // Create tiles with staggered animation
        StartCoroutine(CreateTileGridCoroutine(levelData, () =>
        {
            // Re-enable input after map generation
            isGeneratingMap = false;

            // Detect initial groups
            map.UpdateGroupsAfterMapCreated();

            onComplete?.Invoke();
        }));
    }

    /// <summary>
    /// Creates tile grid with animated spawning sequence.
    /// </summary>
    private IEnumerator CreateTileGridCoroutine(LevelData levelData, Action onComplete)
    {
        float spawnDelay = 0.02f; // Stagger timing between tiles

        for (int i = 0; i < levelData.Elements.Length; i++)
        {
            ElementData element = levelData.Elements[i];

            // Spawn tile from pool
            Vector3 worldPos = map.GridToWorldPosition(element.Position);
            Tile tile = SpawnTileFromPool(element, worldPos);

            // Animate tile spawn
            AnimateTileSpawn(tile, i * spawnDelay);

            // Yield every few tiles to prevent frame drops
            if (i % 10 == 0)
            {
                yield return null;
            }
        }

        // Wait for all animations to complete
        yield return new WaitForSeconds(0.5f);

        onComplete?.Invoke();
    }

    /// <summary>
    /// Spawns tile from object pool.
    /// </summary>
    private Tile SpawnTileFromPool(ElementData element, Vector3 position)
    {
        GameObject tilePrefab = GetTilePrefab(element.Type);

        Tile tile = PYDPool.Spawn<Tile>(
            tilePrefab,
            position,
            Quaternion.identity,
            map.transform);

        tile.Initialize(element);

        return tile;
    }

    /// <summary>
    /// Animates tile spawn with scale effect.
    /// </summary>
    private void AnimateTileSpawn(Tile tile, float delay)
    {
        tile.transform.localScale = Vector3.zero;

        tile.transform.DOScale(1f, 0.3f)
            .SetDelay(delay)
            .SetEase(Ease.OutBack);
    }

    /// <summary>
    /// Unloads current stage with proper cleanup.
    /// </summary>
    private void UnLoadStage()
    {
        // Clear map state
        map.ClearGroups();

        // Reset animation state
        TileGroupHelper.ResetAnimationState();

        // Reset input state
        NormalTile.ForceResetDragState();

        // Return all tiles to pool
        map.ReturnAllTilesToPool();

        // Kill any remaining animations
        DOTween.Kill(map.transform);

        isStageLoaded = false;
    }

    /// <summary>
    /// Gets the appropriate tile prefab based on element type.
    /// </summary>
    private GameObject GetTilePrefab(ElementType type)
    {
        // Implement based on your prefab management system
        return GameController.Data.GetTilePrefab(type);
    }

    private void StopTimer()
    {
        // Implement timer stop logic
    }

    private void StartTimer()
    {
        // Implement timer start logic
    }

    /// <summary>
    /// Called when input needs to be validated.
    /// </summary>
    public bool CanProcessInput()
    {
        return !isGeneratingMap;
    }
}
