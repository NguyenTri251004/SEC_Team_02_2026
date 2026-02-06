using UnityEngine;
using DG.Tweening;
using System.Collections;

/// <summary>
/// Template for implementing custom power-ups with theme integration and visual feedback.
/// Based on Match Squad's PowerUpHelper patterns.
/// </summary>
public class PowerUpTemplate : MonoBehaviour
{
    [Header("Power-Up Configuration")]
    [SerializeField] private PowerUpType powerUpType;
    [SerializeField] private float powerUpDuration = 30f;
    [SerializeField] private int powerUpCost = 1;

    [Header("Visual Effects")]
    [SerializeField] private ParticleSystem activationEffect;
    [SerializeField] private GameObject visualIndicator;

    [Header("Audio")]
    [SerializeField] private AudioClip activationSound;

    // Power-up state
    private bool isActive = false;
    private Coroutine powerUpCoroutine;

    #region Activation

    /// <summary>
    /// Activates the power-up with validation and feedback.
    /// </summary>
    public void Activate()
    {
        // 1. Check if power-up can be activated
        if (!CanActivate())
        {
            ShowCannotActivateMessage();
            return;
        }

        // 2. Consume power-up
        if (!ConsumePowerUp())
        {
            Debug.LogWarning($"Failed to consume power-up: {powerUpType}");
            return;
        }

        // 3. Execute power-up logic
        ExecutePowerUp();

        // 4. Provide feedback
        ProvideFeedback();

        // 5. Update UI
        UpdateUI();
    }

    /// <summary>
    /// Validates if power-up can be activated.
    /// </summary>
    private bool CanActivate()
    {
        // Check if another power-up is active
        if (isActive)
        {
            Debug.Log("Power-up already active");
            return false;
        }

        // Check if player has enough power-ups
        int availablePowerUps = PowerUpManager.Instance.GetPowerUpCount(powerUpType);
        if (availablePowerUps < powerUpCost)
        {
            Debug.Log($"Not enough power-ups. Need {powerUpCost}, have {availablePowerUps}");
            return false;
        }

        // Check if game state allows power-up usage
        if (LevelController.IsGeneratingMap)
        {
            Debug.Log("Cannot use power-up during map generation");
            return false;
        }

        return true;
    }

    /// <summary>
    /// Consumes the power-up from player's inventory.
    /// </summary>
    private bool ConsumePowerUp()
    {
        return PowerUpManager.Instance.ConsumePowerUp(powerUpType, powerUpCost);
    }

    #endregion

    #region Power-Up Logic

    /// <summary>
    /// Executes the main power-up effect. Override for custom behavior.
    /// </summary>
    protected virtual void ExecutePowerUp()
    {
        isActive = true;

        // Start power-up coroutine
        powerUpCoroutine = StartCoroutine(PowerUpCoroutine());
    }

    /// <summary>
    /// Main power-up coroutine. Customize this for specific power-up behavior.
    /// </summary>
    private IEnumerator PowerUpCoroutine()
    {
        // Apply power-up effect
        ApplyPowerUpEffect();

        // Wait for duration
        yield return new WaitForSeconds(powerUpDuration);

        // Remove power-up effect
        RemovePowerUpEffect();

        isActive = false;
    }

    /// <summary>
    /// Applies the power-up effect. Override for custom implementation.
    /// </summary>
    protected virtual void ApplyPowerUpEffect()
    {
        // Example: Pause timer
        // LevelController.Instance.PauseTimer();

        // Example: Change theme
        // ThemeManager.Instance.SetTheme(ThemeType.SnowTimer);

        // Show visual indicator
        if (visualIndicator != null)
        {
            visualIndicator.SetActive(true);
        }

        Debug.Log($"Power-up {powerUpType} activated");
    }

    /// <summary>
    /// Removes the power-up effect when duration expires.
    /// </summary>
    protected virtual void RemovePowerUpEffect()
    {
        // Example: Resume timer
        // LevelController.Instance.ResumeTimer();

        // Example: Restore theme
        // ThemeManager.Instance.RestoreOriginalTheme();

        // Hide visual indicator
        if (visualIndicator != null)
        {
            visualIndicator.SetActive(false);
        }

        Debug.Log($"Power-up {powerUpType} expired");
    }

    #endregion

    #region Feedback

    /// <summary>
    /// Provides audio/visual/haptic feedback on activation.
    /// </summary>
    private void ProvideFeedback()
    {
        // Visual feedback
        if (activationEffect != null)
        {
            activationEffect.Play();
        }

        PlayActivationAnimation();

        // Audio feedback
        if (activationSound != null)
        {
            AudioController.PlaySound(activationSound);
        }

        // Haptic feedback
        HapticManager.Instance?.PlayPowerUpActivation();
    }

    /// <summary>
    /// Plays activation animation sequence.
    /// </summary>
    private void PlayActivationAnimation()
    {
        if (visualIndicator != null)
        {
            visualIndicator.transform.localScale = Vector3.zero;

            Sequence sequence = DOTween.Sequence();
            sequence.Append(visualIndicator.transform.DOScale(1.2f, 0.3f).SetEase(Ease.OutBack));
            sequence.Append(visualIndicator.transform.DOScale(1f, 0.2f));
            sequence.SetAutoKill(true);
        }
    }

    /// <summary>
    /// Shows message when power-up cannot be activated.
    /// </summary>
    private void ShowCannotActivateMessage()
    {
        // Example: Show toast message
        // UIGame.Instance.ShowToast("Cannot activate power-up right now");
    }

    #endregion

    #region UI Updates

    /// <summary>
    /// Updates UI to reflect power-up state.
    /// </summary>
    private void UpdateUI()
    {
        UIGame.Instance?.UpdatePowerUpDisplay(powerUpType);

        // Update remaining count
        int remaining = PowerUpManager.Instance.GetPowerUpCount(powerUpType);
        UIGame.Instance?.UpdatePowerUpCount(powerUpType, remaining);
    }

    #endregion

    #region Cleanup

    /// <summary>
    /// Cancels active power-up (e.g., when level ends).
    /// </summary>
    public void Cancel()
    {
        if (!isActive)
        {
            return;
        }

        // Stop coroutine
        if (powerUpCoroutine != null)
        {
            StopCoroutine(powerUpCoroutine);
            powerUpCoroutine = null;
        }

        // Remove effect
        RemovePowerUpEffect();

        isActive = false;
    }

    private void OnDestroy()
    {
        // Cancel active power-up
        Cancel();

        // Kill animations
        if (visualIndicator != null)
        {
            visualIndicator.transform.DOKill();
        }

        // Stop particle effects
        if (activationEffect != null && activationEffect.isPlaying)
        {
            activationEffect.Stop();
        }
    }

    #endregion

    #region Public API

    /// <summary>
    /// Gets the current power-up state.
    /// </summary>
    public bool IsActive => isActive;

    /// <summary>
    /// Gets the power-up type.
    /// </summary>
    public PowerUpType PowerUpType => powerUpType;

    #endregion
}

/// <summary>
/// Example power-up types. Customize based on your game.
/// </summary>
public enum PowerUpType
{
    TimerPause,
    Hint,
    TileHighlight,
    Shuffle,
    Undo
}
