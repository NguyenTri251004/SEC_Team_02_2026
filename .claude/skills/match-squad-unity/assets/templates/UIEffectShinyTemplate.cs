using Coffee.UIEffects;
using DG.Tweening;
using UnityEngine;
using UnityEngine.UI;

namespace MIMUltility.MatchSquad
{
    /// <summary>
    /// Template for implementing UIEffect Shiny functionality.
    /// Provides common patterns for highlighting, rewards, and attention drawing.
    /// 
    /// Usage:
    /// 1. Add UIEffect component to UI element in Inspector
    /// 2. Configure Effect Mode = Transition, Edge Mode = Shiny
    /// 3. Attach this script and configure references
    /// 4. Call public methods to control shiny effect
    /// </summary>
    public class UIEffectShinyTemplate : MonoBehaviour
    {
        #region Components

        [Header("Shiny Effect Components")]
        [Tooltip("UIEffect component. If null, will try to get from this GameObject.")]
        [SerializeField] private UIEffect shinyEffect;
        
        [Tooltip("UIEffectReplica component for replicating effect from master.")]
        [SerializeField] private UIEffectReplica shinyReplica;
        
        [Tooltip("Master UIEffect for replica to follow.")]
        [SerializeField] private UIEffect masterShinyEffect;

        [Header("Target UI Element")]
        [Tooltip("Target UI element (Button, Image, etc.). Used for auto-setup.")]
        [SerializeField] private Graphic targetGraphic;

        #endregion

        #region Configuration

        [Header("Shiny Configuration")]
        [Tooltip("Width of shiny effect (0-1). Recommended: 0.3-0.5")]
        [Range(0f, 1f)]
        [SerializeField] private float shinyWidth = 0.4f;
        
        [Tooltip("Auto-play speed. 0 = disabled, 1 = normal speed")]
        [Range(0f, 3f)]
        [SerializeField] private float autoPlaySpeed = 1f;

        [Header("Animation Settings")]
        [Tooltip("Duration for manual shiny animations")]
        [SerializeField] private float animationDuration = 1.5f;
        
        [Tooltip("Easing type for animations")]
        [SerializeField] private Ease animationEase = Ease.OutQuad;

        #endregion

        #region Private Variables

        private Sequence activeSequence;
        private bool isInitialized = false;

        #endregion

        #region Initialization

        private void Awake()
        {
            InitializeComponents();
        }

        private void Start()
        {
            if (!isInitialized)
            {
                ConfigureShinyEffect();
                isInitialized = true;
            }
        }

        /// <summary>
        /// Initialize and find required components
        /// </summary>
        private void InitializeComponents()
        {
            // Find target graphic if not assigned
            if (targetGraphic == null)
            {
                targetGraphic = GetComponent<Graphic>();
            }

            // Find or add UIEffect component
            if (shinyEffect == null)
            {
                shinyEffect = GetComponent<UIEffect>();
                if (shinyEffect == null && targetGraphic != null)
                {
                    shinyEffect = targetGraphic.gameObject.AddComponent<UIEffect>();
                }
            }

            // Find UIEffectReplica if exists
            if (shinyReplica == null)
            {
                shinyReplica = GetComponent<UIEffectReplica>();
            }
        }

        /// <summary>
        /// Configure shiny effect properties
        /// </summary>
        private void ConfigureShinyEffect()
        {
            if (shinyEffect == null) return;

            // Set effect mode to Transition
            shinyEffect.effectMode = EffectMode.Transition;
            
            // Set edge mode to Shiny
            shinyEffect.edgeMode = EdgeMode.Shiny;
            
            // Configure shiny properties
            shinyEffect.shinyWidth = shinyWidth;
            shinyEffect.shinyRate = 0f; // Start hidden
            
            // Set auto-play speed
            shinyEffect.shinyAutoPlaySpeed = autoPlaySpeed;

            // Configure replica if exists
            if (shinyReplica != null && masterShinyEffect != null)
            {
                shinyReplica.targetEffect = masterShinyEffect;
            }
        }

        #endregion

        #region Public Control Methods

        /// <summary>
        /// Enable shiny effect with auto-play
        /// </summary>
        public void EnableShiny()
        {
            if (shinyEffect == null) return;

            shinyEffect.shinyAutoPlaySpeed = autoPlaySpeed;
            shinyEffect.shinyRate = 1f;
        }

        /// <summary>
        /// Disable shiny effect
        /// </summary>
        public void DisableShiny()
        {
            if (shinyEffect == null) return;

            shinyEffect.shinyAutoPlaySpeed = 0f;
            shinyEffect.shinyRate = 0f;
        }

        /// <summary>
        /// Play single shiny animation (fade in → fade out)
        /// </summary>
        public void PlayShinyAnimation()
        {
            PlayShinyAnimation(animationDuration);
        }

        /// <summary>
        /// Play single shiny animation with custom duration
        /// </summary>
        public void PlayShinyAnimation(float duration)
        {
            if (shinyEffect == null) return;

            // Kill existing sequence
            KillActiveSequence();

            // Disable auto-play for manual control
            shinyEffect.shinyAutoPlaySpeed = 0f;

            // Create animation sequence
            activeSequence = DOTween.Sequence();

            // Fade in
            activeSequence.Append(
                DOTween.To(
                    () => shinyEffect.shinyRate,
                    x => shinyEffect.shinyRate = x,
                    1f,
                    duration * 0.5f
                )
                .SetEase(animationEase)
            );

            // Fade out
            activeSequence.Append(
                DOTween.To(
                    () => shinyEffect.shinyRate,
                    x => shinyEffect.shinyRate = x,
                    0f,
                    duration * 0.5f
                )
                .SetEase(Ease.InQuad)
            );

            activeSequence.SetAutoKill(true);
        }

        /// <summary>
        /// Play pulse animation (multiple pulses)
        /// </summary>
        public void PlayPulseAnimation(int pulseCount = 3)
        {
            PlayPulseAnimation(pulseCount, animationDuration);
        }

        /// <summary>
        /// Play pulse animation with custom settings
        /// </summary>
        public void PlayPulseAnimation(int pulseCount, float totalDuration)
        {
            if (shinyEffect == null) return;

            // Kill existing sequence
            KillActiveSequence();

            // Disable auto-play
            shinyEffect.shinyAutoPlaySpeed = 0f;

            // Calculate pulse duration
            float pulseDuration = totalDuration / (pulseCount * 2f);

            // Create pulse sequence
            activeSequence = DOTween.Sequence();

            for (int i = 0; i < pulseCount; i++)
            {
                // Fade in
                activeSequence.Append(
                    DOTween.To(
                        () => shinyEffect.shinyRate,
                        x => shinyEffect.shinyRate = x,
                        1f,
                        pulseDuration
                    )
                    .SetEase(animationEase)
                );

                // Fade out
                activeSequence.Append(
                    DOTween.To(
                        () => shinyEffect.shinyRate,
                        x => shinyEffect.shinyRate = x,
                        0f,
                        pulseDuration
                    )
                    .SetEase(Ease.InQuad)
                );
            }

            activeSequence.SetAutoKill(true);
        }

        /// <summary>
        /// Play reward celebration animation
        /// </summary>
        public void PlayRewardAnimation()
        {
            PlayRewardAnimation(animationDuration);
        }

        /// <summary>
        /// Play reward celebration with custom duration
        /// </summary>
        public void PlayRewardAnimation(float duration)
        {
            if (shinyEffect == null) return;

            // Kill existing sequence
            KillActiveSequence();

            // Disable auto-play
            shinyEffect.shinyAutoPlaySpeed = 0f;

            // Increase width for celebration
            float originalWidth = shinyEffect.shinyWidth;
            shinyEffect.shinyWidth = Mathf.Min(shinyWidth * 1.5f, 1f);

            // Create celebration sequence
            activeSequence = DOTween.Sequence();

            // Quick fade in
            activeSequence.Append(
                DOTween.To(
                    () => shinyEffect.shinyRate,
                    x => shinyEffect.shinyRate = x,
                    1f,
                    duration * 0.2f
                )
                .SetEase(Ease.OutQuad)
            );

            // Hold at peak
            activeSequence.AppendInterval(duration * 0.3f);

            // Slow fade out
            activeSequence.Append(
                DOTween.To(
                    () => shinyEffect.shinyRate,
                    x => shinyEffect.shinyRate = x,
                    0f,
                    duration * 0.5f
                )
                .SetEase(Ease.InQuad)
            );

            // Restore original width
            activeSequence.OnComplete(() =>
            {
                shinyEffect.shinyWidth = originalWidth;
            });

            activeSequence.SetAutoKill(true);
        }

        /// <summary>
        /// Set shiny rate manually (0-1)
        /// </summary>
        public void SetShinyRate(float rate)
        {
            if (shinyEffect == null) return;

            rate = Mathf.Clamp01(rate);
            shinyEffect.shinyRate = rate;
        }

        /// <summary>
        /// Set shiny width (0-1)
        /// </summary>
        public void SetShinyWidth(float width)
        {
            if (shinyEffect == null) return;

            width = Mathf.Clamp01(width);
            shinyEffect.shinyWidth = width;
            shinyWidth = width; // Update serialized value
        }

        /// <summary>
        /// Set auto-play speed (0 = disabled)
        /// </summary>
        public void SetAutoPlaySpeed(float speed)
        {
            if (shinyEffect == null) return;

            speed = Mathf.Max(0f, speed);
            shinyEffect.shinyAutoPlaySpeed = speed;
            autoPlaySpeed = speed; // Update serialized value
        }

        #endregion

        #region Replica Control Methods

        /// <summary>
        /// Control group of shiny effects via master (for UIEffectReplica)
        /// </summary>
        public void SetGroupShinyEnabled(bool enabled)
        {
            if (masterShinyEffect == null) return;

            masterShinyEffect.shinyAutoPlaySpeed = enabled ? autoPlaySpeed : 0f;
            masterShinyEffect.shinyRate = enabled ? 1f : 0f;
        }

        /// <summary>
        /// Play animation on master effect (affects all replicas)
        /// </summary>
        public void PlayMasterAnimation(float duration)
        {
            if (masterShinyEffect == null) return;

            masterShinyEffect.shinyAutoPlaySpeed = 0f;

            DOTween.To(
                () => masterShinyEffect.shinyRate,
                x => masterShinyEffect.shinyRate = x,
                1f,
                duration * 0.5f
            )
            .SetEase(animationEase)
            .OnComplete(() =>
            {
                DOTween.To(
                    () => masterShinyEffect.shinyRate,
                    x => masterShinyEffect.shinyRate = x,
                    0f,
                    duration * 0.5f
                )
                .SetEase(Ease.InQuad);
            });
        }

        #endregion

        #region Utility Methods

        /// <summary>
        /// Kill active DOTween sequence
        /// </summary>
        private void KillActiveSequence()
        {
            if (activeSequence != null && activeSequence.IsActive())
            {
                activeSequence.Kill();
                activeSequence = null;
            }
        }

        /// <summary>
        /// Reset shiny effect to default state
        /// </summary>
        public void ResetShiny()
        {
            KillActiveSequence();

            if (shinyEffect != null)
            {
                shinyEffect.shinyAutoPlaySpeed = autoPlaySpeed;
                shinyEffect.shinyRate = 0f;
                shinyEffect.shinyWidth = shinyWidth;
            }
        }

        #endregion

        #region Cleanup

        private void OnDestroy()
        {
            // CRITICAL: Kill all animations on destroy
            KillActiveSequence();

            // Kill any DOTween tweens on shiny effect
            if (shinyEffect != null)
            {
                DOTween.Kill(shinyEffect);
            }
        }

        #endregion

        #region Editor Helpers

#if UNITY_EDITOR
        /// <summary>
        /// Test shiny effect in editor
        /// </summary>
        [ContextMenu("Test Shiny Animation")]
        private void TestShinyAnimation()
        {
            if (Application.isPlaying)
            {
                PlayShinyAnimation();
            }
            else
            {
                Debug.LogWarning("Shiny animation can only be tested in Play Mode");
            }
        }

        /// <summary>
        /// Enable shiny in editor
        /// </summary>
        [ContextMenu("Enable Shiny")]
        private void EditorEnableShiny()
        {
            if (Application.isPlaying && shinyEffect != null)
            {
                EnableShiny();
            }
        }

        /// <summary>
        /// Disable shiny in editor
        /// </summary>
        [ContextMenu("Disable Shiny")]
        private void EditorDisableShiny()
        {
            if (Application.isPlaying && shinyEffect != null)
            {
                DisableShiny();
            }
        }
#endif

        #endregion
    }
}
