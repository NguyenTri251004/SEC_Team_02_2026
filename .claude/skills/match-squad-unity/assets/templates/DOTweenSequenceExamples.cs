using UnityEngine;
using DG.Tweening;
using System;

/// <summary>
/// Comprehensive DOTween examples covering common animation patterns in Match Squad.
/// Copy and adapt these patterns for your animations.
/// </summary>
public class DOTweenSequenceExamples : MonoBehaviour
{
    [Header("References")]
    [SerializeField] private Transform targetTransform;
    [SerializeField] private SpriteRenderer spriteRenderer;
    [SerializeField] private RectTransform uiElement;

    // Active sequences (for cleanup)
    private Sequence activeSequence;

    #region Basic Animations

    /// <summary>
    /// Simple scale bounce animation.
    /// </summary>
    public void SimpleBounce()
    {
        targetTransform.DOScale(1.2f, 0.3f)
            .SetEase(Ease.OutBack)
            .OnComplete(() => targetTransform.DOScale(1f, 0.2f));
    }

    /// <summary>
    /// Smooth move to position.
    /// </summary>
    public void SmoothMove(Vector3 targetPosition)
    {
        targetTransform.DOMove(targetPosition, 0.5f)
            .SetEase(Ease.OutCubic);
    }

    /// <summary>
    /// Fade sprite in/out.
    /// </summary>
    public void FadeSprite(float targetAlpha, float duration)
    {
        spriteRenderer.DOFade(targetAlpha, duration)
            .SetEase(Ease.InOutSine);
    }

    #endregion

    #region Sequences (Chained Animations)

    /// <summary>
    /// Complex chained sequence with multiple animations.
    /// </summary>
    public void ChainedSequence()
    {
        // Kill existing sequence
        if (activeSequence != null && activeSequence.IsActive())
        {
            activeSequence.Kill();
        }

        // Create new sequence
        activeSequence = DOTween.Sequence();

        // Add animations in order (one after another)
        activeSequence.Append(targetTransform.DOScale(1.2f, 0.2f));
        activeSequence.Append(targetTransform.DORotate(new Vector3(0, 0, 360), 0.5f, RotateMode.FastBeyond360));
        activeSequence.Append(targetTransform.DOScale(1f, 0.2f));

        // Configure sequence
        activeSequence.SetAutoKill(true);
        activeSequence.OnComplete(() => Debug.Log("Sequence complete"));
    }

    /// <summary>
    /// Parallel animations using Insert.
    /// </summary>
    public void ParallelAnimations()
    {
        Sequence sequence = DOTween.Sequence();

        // Append creates sequential animations
        sequence.Append(targetTransform.DOMove(Vector3.up, 0.5f));

        // Insert creates parallel animations at specific times
        sequence.Insert(0f, targetTransform.DOScale(1.5f, 0.5f)); // Parallel at start
        sequence.Insert(0f, spriteRenderer.DOFade(0f, 0.5f));      // Also parallel at start

        sequence.SetAutoKill(true);
    }

    /// <summary>
    /// Join adds animations to the end of the last added tween.
    /// </summary>
    public void JoinExample()
    {
        Sequence sequence = DOTween.Sequence();

        // These happen sequentially
        sequence.Append(targetTransform.DOMove(Vector3.up, 0.5f));

        // Join makes this happen SIMULTANEOUSLY with the previous Append
        sequence.Join(targetTransform.DOScale(1.5f, 0.5f));
        sequence.Join(spriteRenderer.DOFade(0f, 0.5f));

        sequence.SetAutoKill(true);
    }

    #endregion

    #region UI Animations

    /// <summary>
    /// UI animation independent of timeScale (for pause menus).
    /// </summary>
    public void UIAnimation()
    {
        uiElement.DOAnchorPos(Vector2.zero, 0.5f)
            .SetEase(Ease.OutCubic)
            .SetUpdate(true); // ⚠️ CRITICAL: Independent of timeScale
    }

    /// <summary>
    /// UI popup animation sequence.
    /// </summary>
    public void UIPopup()
    {
        uiElement.localScale = Vector3.zero;

        Sequence sequence = DOTween.Sequence();
        sequence.Append(uiElement.DOScale(1.2f, 0.3f).SetEase(Ease.OutBack));
        sequence.Append(uiElement.DOScale(1f, 0.1f));
        sequence.SetUpdate(true); // Independent of timeScale
        sequence.SetAutoKill(true);
    }

    /// <summary>
    /// UI slide in from side.
    /// </summary>
    public void UISlideIn(bool fromLeft = true)
    {
        float startX = fromLeft ? -Screen.width : Screen.width;
        uiElement.anchoredPosition = new Vector2(startX, uiElement.anchoredPosition.y);

        uiElement.DOAnchorPosX(0f, 0.5f)
            .SetEase(Ease.OutCubic)
            .SetUpdate(true);
    }

    #endregion

    #region Loops

    /// <summary>
    /// Infinite ping-pong loop (back and forth).
    /// </summary>
    public void PingPongLoop()
    {
        targetTransform.DOScale(1.2f, 0.5f)
            .SetEase(Ease.InOutSine)
            .SetLoops(-1, LoopType.Yoyo); // -1 = infinite, Yoyo = ping-pong
    }

    /// <summary>
    /// Continuous rotation loop.
    /// </summary>
    public void ContinuousRotation()
    {
        targetTransform.DORotate(new Vector3(0, 0, 360), 2f, RotateMode.FastBeyond360)
            .SetEase(Ease.Linear)
            .SetLoops(-1, LoopType.Restart); // Restart from beginning each loop
    }

    /// <summary>
    /// Limited loop count.
    /// </summary>
    public void LimitedLoop()
    {
        targetTransform.DOScale(1.2f, 0.3f)
            .SetEase(Ease.InOutSine)
            .SetLoops(3, LoopType.Yoyo) // Loop 3 times
            .OnComplete(() => Debug.Log("3 loops complete"));
    }

    #endregion

    #region Advanced Patterns

    /// <summary>
    /// Tile spawn animation with delayed start.
    /// </summary>
    public void TileSpawnAnimation(float delay)
    {
        targetTransform.localScale = Vector3.zero;

        targetTransform.DOScale(1f, 0.3f)
            .SetDelay(delay)
            .SetEase(Ease.OutBack);
    }

    /// <summary>
    /// Tile match animation with callback.
    /// </summary>
    public void TileMatchAnimation(Action onComplete)
    {
        Sequence sequence = DOTween.Sequence();

        // Highlight
        sequence.Append(targetTransform.DOScale(1.3f, 0.2f));
        sequence.Join(spriteRenderer.DOColor(Color.yellow, 0.2f));

        // Hold
        sequence.AppendInterval(0.3f);

        // Shrink and fade
        sequence.Append(targetTransform.DOScale(0f, 0.3f));
        sequence.Join(spriteRenderer.DOFade(0f, 0.3f));

        sequence.SetAutoKill(true);
        sequence.OnComplete(() => onComplete?.Invoke());
    }

    /// <summary>
    /// Shake effect for feedback.
    /// </summary>
    public void ShakeEffect()
    {
        targetTransform.DOShakePosition(0.5f, strength: 0.5f, vibrato: 10, randomness: 90f);
    }

    /// <summary>
    /// Punch effect (elastic bump).
    /// </summary>
    public void PunchEffect()
    {
        targetTransform.DOPunchScale(Vector3.one * 0.2f, 0.5f, vibrato: 10, elasticity: 1f);
    }

    /// <summary>
    /// Path-based movement (curved motion).
    /// </summary>
    public void PathMovement()
    {
        Vector3[] path = new Vector3[]
        {
            targetTransform.position,
            targetTransform.position + Vector3.up * 2f,
            targetTransform.position + Vector3.right * 2f,
            targetTransform.position + Vector3.down * 2f
        };

        targetTransform.DOPath(path, 2f, PathType.CatmullRom)
            .SetEase(Ease.InOutSine)
            .SetLoops(-1, LoopType.Restart);
    }

    #endregion

    #region Performance Optimization

    /// <summary>
    /// Performance-optimized sequence with recycling.
    /// </summary>
    public void OptimizedSequence()
    {
        Sequence sequence = DOTween.Sequence();
        sequence.SetRecyclable(true);  // Allow DOTween to reuse internal structures
        sequence.SetAutoKill(true);    // Auto-cleanup when complete

        sequence.Append(targetTransform.DOScale(1.2f, 0.2f));
        sequence.Append(targetTransform.DOScale(1f, 0.2f));
    }

    /// <summary>
    /// Batch multiple similar animations efficiently.
    /// </summary>
    public void BatchAnimations(Transform[] objects)
    {
        Sequence sequence = DOTween.Sequence();

        foreach (Transform obj in objects)
        {
            // All animations start simultaneously
            sequence.Insert(0f, obj.DOScale(1.2f, 0.3f));
        }

        sequence.SetAutoKill(true);
    }

    #endregion

    #region Cleanup

    /// <summary>
    /// Kill all animations on this object. CRITICAL for cleanup.
    /// </summary>
    public void KillAllAnimations()
    {
        // Kill all tweens on these objects
        targetTransform.DOKill();
        spriteRenderer.DOKill();
        uiElement.DOKill();

        // Kill active sequence
        if (activeSequence != null && activeSequence.IsActive())
        {
            activeSequence.Kill();
        }
    }

    private void OnDestroy()
    {
        // ⚠️ ALWAYS kill animations in OnDestroy
        KillAllAnimations();
    }

    #endregion

    #region Callbacks

    /// <summary>
    /// All available callbacks in DOTween.
    /// </summary>
    public void AllCallbacks()
    {
        targetTransform.DOScale(1.2f, 0.5f)
            .OnStart(() => Debug.Log("Animation started"))
            .OnPlay(() => Debug.Log("Animation playing"))
            .OnPause(() => Debug.Log("Animation paused"))
            .OnRewind(() => Debug.Log("Animation rewound"))
            .OnUpdate(() => Debug.Log("Animation updated"))
            .OnStepComplete(() => Debug.Log("Animation step complete"))
            .OnComplete(() => Debug.Log("Animation complete"))
            .OnKill(() => Debug.Log("Animation killed"));
    }

    #endregion
}
