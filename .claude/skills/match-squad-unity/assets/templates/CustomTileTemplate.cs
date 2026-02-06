using UnityEngine;
using DG.Tweening;
using System.Collections.Generic;

/// <summary>
/// Template for creating custom tile types with proper pooling, animations, and state management.
/// Inherits from NormalTile base class following Match Squad patterns.
/// </summary>
public class CustomTileTemplate : NormalTile
{
    [Header("Custom Tile Settings")]
    [SerializeField] private SpriteRenderer customSprite;
    [SerializeField] private ParticleSystem customEffect;

    // Custom tile state
    private bool isCustomStateActive = false;
    private Sequence activeSequence;

    #region Initialization

    /// <summary>
    /// Initialize tile with element data. Called when spawned from pool.
    /// </summary>
    public override void Initialize(ElementData elementData)
    {
        // Call base initialization (sets up traits, position, etc.)
        base.Initialize(elementData);

        // Custom initialization
        InitializeCustomState();

        // Setup visual elements
        SetupCustomVisuals(elementData);
    }

    private void InitializeCustomState()
    {
        isCustomStateActive = false;

        // Reset custom visuals
        if (customSprite != null)
        {
            customSprite.color = Color.white;
        }
    }

    private void SetupCustomVisuals(ElementData elementData)
    {
        // Configure custom sprite or effects based on element data
        if (customSprite != null)
        {
            // Example: Set sprite based on trait
            // customSprite.sprite = GetSpriteForTrait(elementData.Traits[0]);
        }
    }

    #endregion

    #region Custom Tile Behavior

    /// <summary>
    /// Custom behavior when tile is matched in a group.
    /// </summary>
    public override void OnMatched()
    {
        base.OnMatched();

        // Custom match behavior
        ActivateCustomEffect();
    }

    /// <summary>
    /// Custom behavior when tile is swapped.
    /// </summary>
    public override void OnSwapped(Tile otherTile)
    {
        base.OnSwapped(otherTile);

        // Custom swap behavior
        PlaySwapAnimation();
    }

    /// <summary>
    /// Activates custom visual effect.
    /// </summary>
    private void ActivateCustomEffect()
    {
        if (customEffect != null)
        {
            customEffect.Play();
        }

        // Custom animation sequence
        activeSequence = DOTween.Sequence();
        activeSequence.Append(transform.DOScale(1.2f, 0.2f));
        activeSequence.Append(transform.DOScale(1.0f, 0.2f));
        activeSequence.SetAutoKill(true);
    }

    /// <summary>
    /// Plays swap animation with custom easing.
    /// </summary>
    private void PlaySwapAnimation()
    {
        // Kill existing animations
        transform.DOKill();

        // Custom swap animation
        transform.DOPunchRotation(new Vector3(0, 0, 15f), 0.3f, 10, 1f)
            .SetEase(Ease.OutElastic);
    }

    #endregion

    #region Input Handling

    /// <summary>
    /// Override input validation to add custom checks.
    /// </summary>
    protected override bool CanBeInteracted()
    {
        // Check base conditions (locked, generating map, etc.)
        if (!base.CanBeInteracted())
        {
            return false;
        }

        // Add custom interaction checks
        if (isCustomStateActive)
        {
            Debug.Log("Custom tile cannot be interacted with while in custom state");
            return false;
        }

        return true;
    }

    #endregion

    #region Pooling Management

    /// <summary>
    /// Called when returning tile to pool. CRITICAL for proper cleanup.
    /// </summary>
    private void OnReturnToPool()
    {
        // Kill all animations
        KillAllAnimations();

        // Stop custom effects
        if (customEffect != null && customEffect.isPlaying)
        {
            customEffect.Stop();
        }

        // Reset custom state
        isCustomStateActive = false;

        // Unsubscribe from events
        UnsubscribeFromEvents();
    }

    /// <summary>
    /// Kills all active DOTween animations on this tile.
    /// </summary>
    private void KillAllAnimations()
    {
        // Kill transform animations
        transform.DOKill();

        // Kill custom sprite animations
        if (customSprite != null)
        {
            customSprite.DOKill();
        }

        // Kill active sequence
        if (activeSequence != null && activeSequence.IsActive())
        {
            activeSequence.Kill();
        }
    }

    #endregion

    #region Event Management

    private void OnEnable()
    {
        SubscribeToEvents();
    }

    private void OnDisable()
    {
        UnsubscribeFromEvents();
    }

    private void SubscribeToEvents()
    {
        // Subscribe to custom events
        // Example: Map.OnGroupsDetected += HandleGroupsDetected;
    }

    private void UnsubscribeFromEvents()
    {
        // Unsubscribe from all events to prevent memory leaks
        // Example: Map.OnGroupsDetected -= HandleGroupsDetected;
    }

    #endregion

    #region Cleanup

    /// <summary>
    /// Unity lifecycle cleanup. ALWAYS implement proper cleanup.
    /// </summary>
    private void OnDestroy()
    {
        // Kill all animations
        KillAllAnimations();

        // Unsubscribe from events
        UnsubscribeFromEvents();

        // Stop particle effects
        if (customEffect != null && customEffect.isPlaying)
        {
            customEffect.Stop();
        }
    }

    #endregion

    #region Debug Helpers

#if UNITY_EDITOR
    /// <summary>
    /// Debug visualization in Unity Editor.
    /// </summary>
    private void OnDrawGizmos()
    {
        if (isCustomStateActive)
        {
            Gizmos.color = Color.cyan;
            Gizmos.DrawWireSphere(transform.position, 0.5f);
        }
    }
#endif

    #endregion
}
