using UnityEngine;
using DG.Tweening;
using System;
using System.Collections.Generic;

/// <summary>
/// Template for implementing new tile mechanics like Hidden, Frost, Key-Lock.
/// Includes state management, visual feedback, and proper cleanup patterns.
/// </summary>
public class NewMechanicTemplate : NormalTile
{
    #region Mechanic Configuration

    [Header("Mechanic Type")]
    [SerializeField] private MechanicType mechanicType;

    [Header("Hidden Mechanic")]
    [SerializeField] private GameObject coverSprite;
    [SerializeField] private ParticleSystem revealEffect;
    private bool isRevealed = false;

    [Header("Frost Mechanic")]
    [SerializeField] private GameObject[] frostLayers;
    [SerializeField] private ParticleSystem thawEffect;
    private int currentFrostLevel = 0;
    private const int MAX_FROST_LEVEL = 2;

    [Header("Lock Mechanic")]
    [SerializeField] private int keyId;
    [SerializeField] private GameObject lockSprite;
    [SerializeField] private ParticleSystem unlockEffect;
    private bool isLocked = false;

    [Header("Visual Effects")]
    [SerializeField] private Color mechanicHighlightColor = Color.cyan;

    private Sequence activeSequence;

    #endregion

    #region Initialization

    public override void Initialize(ElementData elementData)
    {
        base.Initialize(elementData);

        // Initialize based on mechanic type
        switch (mechanicType)
        {
            case MechanicType.Hidden:
                InitializeHiddenMechanic(elementData);
                break;

            case MechanicType.Frost:
                InitializeFrostMechanic(elementData);
                break;

            case MechanicType.Lock:
                InitializeLockMechanic(elementData);
                break;
        }

        UpdateVisualState();
    }

    private void InitializeHiddenMechanic(ElementData elementData)
    {
        isRevealed = elementData.IsRevealed;

        if (coverSprite != null)
        {
            coverSprite.SetActive(!isRevealed);
        }
    }

    private void InitializeFrostMechanic(ElementData elementData)
    {
        currentFrostLevel = elementData.FrostLevel;

        UpdateFrostLayers();
    }

    private void InitializeLockMechanic(ElementData elementData)
    {
        isLocked = elementData.IsLocked;
        keyId = elementData.KeyId;

        if (lockSprite != null)
        {
            lockSprite.SetActive(isLocked);
        }
    }

    #endregion

    #region Interaction Validation

    protected override bool CanBeInteracted()
    {
        // Check base conditions first
        if (!base.CanBeInteracted())
        {
            return false;
        }

        // Check mechanic-specific conditions
        switch (mechanicType)
        {
            case MechanicType.Hidden:
                if (!isRevealed)
                {
                    Debug.Log("Hidden tiles cannot be interacted with until revealed");
                    return false;
                }
                break;

            case MechanicType.Lock:
                if (isLocked)
                {
                    Debug.Log("Locked tiles cannot be interacted with until unlocked");
                    PlayLockedFeedback();
                    return false;
                }
                break;

            case MechanicType.Frost:
                // Frost tiles can be swapped but have restricted matching
                break;
        }

        return true;
    }

    public override bool CanMatch()
    {
        // Frost tiles can only match when fully thawed
        if (mechanicType == MechanicType.Frost && currentFrostLevel > 0)
        {
            return false;
        }

        return base.CanMatch();
    }

    #endregion

    #region Hidden Mechanic

    /// <summary>
    /// Reveals a hidden tile.
    /// </summary>
    public void Reveal()
    {
        if (mechanicType != MechanicType.Hidden || isRevealed)
        {
            return;
        }

        isRevealed = true;
        PlayRevealAnimation();
    }

    private void PlayRevealAnimation()
    {
        // Kill existing sequences
        if (activeSequence != null && activeSequence.IsActive())
        {
            activeSequence.Kill();
        }

        activeSequence = DOTween.Sequence();

        // Animate cover disappearing
        if (coverSprite != null)
        {
            var spriteRenderer = coverSprite.GetComponent<SpriteRenderer>();
            if (spriteRenderer != null)
            {
                activeSequence.Append(coverSprite.transform.DOScale(0f, 0.3f));
                activeSequence.Join(spriteRenderer.DOFade(0f, 0.3f));
                activeSequence.OnComplete(() => coverSprite.SetActive(false));
            }
        }

        // Play reveal effect
        if (revealEffect != null)
        {
            revealEffect.Play();
        }

        // Feedback
        AudioController.PlaySound(AudioController.AudioClips.revealSound);
        HapticManager.Instance?.PlayReveal();

        activeSequence.SetAutoKill(true);
    }

    #endregion

    #region Frost Mechanic

    /// <summary>
    /// Reduces frost level by one.
    /// </summary>
    public void ReduceFrost()
    {
        if (mechanicType != MechanicType.Frost || currentFrostLevel <= 0)
        {
            return;
        }

        currentFrostLevel--;
        PlayThawAnimation();
        UpdateFrostLayers();
    }

    private void PlayThawAnimation()
    {
        // Kill existing sequences
        if (activeSequence != null && activeSequence.IsActive())
        {
            activeSequence.Kill();
        }

        // Play thaw effect
        if (thawEffect != null)
        {
            thawEffect.Play();
        }

        // Animate current frost layer disappearing
        if (currentFrostLevel < MAX_FROST_LEVEL && frostLayers != null && frostLayers.Length > currentFrostLevel)
        {
            GameObject layer = frostLayers[currentFrostLevel];
            if (layer != null)
            {
                activeSequence = DOTween.Sequence();
                activeSequence.Append(layer.transform.DOScale(0f, 0.3f));

                var spriteRenderer = layer.GetComponent<SpriteRenderer>();
                if (spriteRenderer != null)
                {
                    activeSequence.Join(spriteRenderer.DOFade(0f, 0.3f));
                }

                activeSequence.OnComplete(() => layer.SetActive(false));
                activeSequence.SetAutoKill(true);
            }
        }

        // Feedback
        AudioController.PlaySound(AudioController.AudioClips.thawSound);
        HapticManager.Instance?.PlayThaw();
    }

    private void UpdateFrostLayers()
    {
        if (frostLayers == null) return;

        for (int i = 0; i < frostLayers.Length; i++)
        {
            if (frostLayers[i] != null)
            {
                frostLayers[i].SetActive(i < currentFrostLevel);
            }
        }
    }

    public bool IsFullyThawed => currentFrostLevel == 0;

    #endregion

    #region Lock Mechanic

    /// <summary>
    /// Unlocks the tile.
    /// </summary>
    public void Unlock()
    {
        if (mechanicType != MechanicType.Lock || !isLocked)
        {
            return;
        }

        isLocked = false;
        PlayUnlockAnimation();
    }

    private void PlayUnlockAnimation()
    {
        // Kill existing sequences
        if (activeSequence != null && activeSequence.IsActive())
        {
            activeSequence.Kill();
        }

        activeSequence = DOTween.Sequence();

        // Shake and scale down lock
        if (lockSprite != null)
        {
            activeSequence.Append(lockSprite.transform.DOShakeRotation(0.5f, 30f));
            activeSequence.Append(lockSprite.transform.DOScale(0f, 0.3f));
            activeSequence.OnComplete(() => lockSprite.SetActive(false));
        }

        // Play unlock effect
        if (unlockEffect != null)
        {
            unlockEffect.Play();
        }

        // Feedback
        AudioController.PlaySound(AudioController.AudioClips.unlockSound);
        HapticManager.Instance?.PlayUnlock();

        activeSequence.SetAutoKill(true);
    }

    private void PlayLockedFeedback()
    {
        // Shake animation to indicate locked state
        if (lockSprite != null)
        {
            lockSprite.transform.DOShakePosition(0.3f, 5f, 10, 90f);
        }

        // Audio feedback
        AudioController.PlaySound(AudioController.AudioClips.blockedSound);
        HapticManager.Instance?.PlayBlocked();
    }

    public int KeyId => keyId;
    public bool IsLocked => isLocked;

    #endregion

    #region Visual State Management

    private void UpdateVisualState()
    {
        switch (mechanicType)
        {
            case MechanicType.Hidden:
                if (coverSprite != null)
                {
                    coverSprite.SetActive(!isRevealed);
                }
                break;

            case MechanicType.Frost:
                UpdateFrostLayers();
                break;

            case MechanicType.Lock:
                if (lockSprite != null)
                {
                    lockSprite.SetActive(isLocked);
                }
                break;
        }
    }

    #endregion

    #region Pooling & Cleanup

    /// <summary>
    /// Called when returning to pool. CRITICAL for proper cleanup.
    /// </summary>
    private void OnReturnToPool()
    {
        // Kill all animations
        KillAllMechanicAnimations();

        // Stop particle effects
        StopAllParticleEffects();

        // Reset mechanic state
        ResetMechanicState();
    }

    private void KillAllMechanicAnimations()
    {
        // Kill active sequence
        if (activeSequence != null && activeSequence.IsActive())
        {
            activeSequence.Kill();
        }

        // Kill cover sprite animations
        if (coverSprite != null)
        {
            coverSprite.transform.DOKill();
            var spriteRenderer = coverSprite.GetComponent<SpriteRenderer>();
            if (spriteRenderer != null)
            {
                spriteRenderer.DOKill();
            }
        }

        // Kill lock sprite animations
        if (lockSprite != null)
        {
            lockSprite.transform.DOKill();
        }

        // Kill frost layer animations
        if (frostLayers != null)
        {
            foreach (var layer in frostLayers)
            {
                if (layer != null)
                {
                    layer.transform.DOKill();
                }
            }
        }
    }

    private void StopAllParticleEffects()
    {
        if (revealEffect != null && revealEffect.isPlaying)
        {
            revealEffect.Stop();
        }

        if (thawEffect != null && thawEffect.isPlaying)
        {
            thawEffect.Stop();
        }

        if (unlockEffect != null && unlockEffect.isPlaying)
        {
            unlockEffect.Stop();
        }
    }

    private void ResetMechanicState()
    {
        isRevealed = false;
        currentFrostLevel = 0;
        isLocked = false;
    }

    private void OnDestroy()
    {
        // Kill all animations
        KillAllMechanicAnimations();

        // Stop particle effects
        StopAllParticleEffects();
    }

    #endregion

    #region Debug Helpers

#if UNITY_EDITOR
    private void OnDrawGizmos()
    {
        // Visualize mechanic state in editor
        Gizmos.color = mechanicHighlightColor;

        switch (mechanicType)
        {
            case MechanicType.Hidden:
                if (!isRevealed)
                {
                    Gizmos.DrawWireSphere(transform.position, 0.3f);
                }
                break;

            case MechanicType.Frost:
                if (currentFrostLevel > 0)
                {
                    Gizmos.DrawWireCube(transform.position, Vector3.one * 0.5f);
                }
                break;

            case MechanicType.Lock:
                if (isLocked)
                {
                    Gizmos.DrawIcon(transform.position, "lock_icon.png", true);
                }
                break;
        }
    }
#endif

    #endregion
}

/// <summary>
/// Types of tile mechanics.
/// </summary>
public enum MechanicType
{
    None,
    Hidden,
    Frost,
    Lock,
    Jammer,
    Nail
}
