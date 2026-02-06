using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.UI;
using DG.Tweening;

/// <summary>
/// TEMPLATE: Enhanced input handling với gamefeel improvements
/// Copy và customize template này để cải thiện input system
/// </summary>
public class EnhancedTileInput : MonoBehaviour, IPointerDownHandler, IDragHandler, IPointerUpHandler
{
    #region Serialized Fields
    
    [Header("Visual Feedback")]
    [SerializeField] private float touchScaleUp = 1.1f;
    [SerializeField] private float touchScaleDuration = 0.1f;
    [SerializeField] private Color touchHighlightColor = new Color(1.2f, 1.2f, 1.2f, 1f);
    
    [Header("Drag Settings")]
    [SerializeField] private float touchLiftOffset = 100f;
    [SerializeField] private float dragSmoothTime = 0.15f;
    [SerializeField] private float magneticSnapDistance = 100f;
    
    [Header("Audio")]
    [SerializeField] private AudioClip touchSound;
    [SerializeField] private AudioClip dragSound;
    [SerializeField] private AudioClip dropSound;
    [SerializeField] private AudioClip errorSound;
    [SerializeField, Range(0.8f, 1.2f)] private float pitchVariation = 0.1f;
    
    [Header("Haptics")]
    [SerializeField] private bool enableHaptics = true;
    
    #endregion
    
    #region Private Fields
    
    private RectTransform rectTransform;
    private CanvasGroup canvasGroup;
    private Image mainImage;
    
    private Vector2 dragOffset;
    private Vector2 dragVelocity;
    private Vector3 originalScale;
    private Color originalColor;
    
    private bool isDragging;
    private float dragStartTime;
    private Vector2 dragStartPosition;
    
    private Sequence currentSequence;
    
    #endregion
    
    #region Unity Lifecycle
    
    private void Awake()
    {
        rectTransform = GetComponent<RectTransform>();
        canvasGroup = GetComponent<CanvasGroup>();
        mainImage = GetComponent<Image>();
        
        originalScale = transform.localScale;
        originalColor = mainImage.color;
    }
    
    private void OnDestroy()
    {
        // 🔥 CRITICAL: Always kill tweens
        currentSequence?.Kill();
        rectTransform.DOKill();
        mainImage.DOKill();
    }
    
    #endregion
    
    #region Input Handlers
    
    public void OnPointerDown(PointerEventData eventData)
    {
        // 🎯 PRIORITY 1: Immediate feedback (< 100ms)
        PlayImmediateFeedback();
        
        // ⚠️ PRIORITY 2: Validation
        if (!CanStartDrag())
        {
            PlayErrorFeedback();
            return;
        }
        
        // 🎬 PRIORITY 3: Start drag
        StartDragOperation(eventData);
    }
    
    public void OnDrag(PointerEventData eventData)
    {
        if (!isDragging) return;
        
        // Update drag position with smoothing
        UpdateDragPosition(eventData);
        
        // Check for target slot with magnetic snapping
        CheckTargetSlotWithMagnetism(eventData);
        
        // Update visual effects
        UpdateDragVisuals();
    }
    
    public void OnPointerUp(PointerEventData eventData)
    {
        if (!isDragging) return;
        
        // End drag operation
        EndDragOperation(eventData);
        
        // Check drop validity
        if (IsValidDrop(eventData))
        {
            PlaySuccessFeedback();
            PerformDrop(eventData);
        }
        else
        {
            PlayErrorFeedback();
            ReturnToOriginalPosition();
        }
    }
    
    #endregion
    
    #region Drag Operations
    
    private void StartDragOperation(PointerEventData eventData)
    {
        isDragging = true;
        dragStartTime = Time.time;
        dragStartPosition = eventData.position;
        
        // Kill any ongoing animations
        currentSequence?.Kill();
        
        // Calculate drag offset
        RectTransformUtility.ScreenPointToLocalPointInRectangle(
            rectTransform.parent as RectTransform,
            eventData.position,
            eventData.pressEventCamera,
            out dragOffset
        );
        dragOffset = rectTransform.anchoredPosition - dragOffset;
        
        // Visual feedback sequence
        currentSequence = DOTween.Sequence();
        currentSequence.Append(transform.DOScale(touchScaleUp, touchScaleDuration)
            .SetEase(Ease.OutBack));
        currentSequence.Join(mainImage.DOColor(touchHighlightColor, touchScaleDuration));
        currentSequence.SetUpdate(true);
        
        // Disable raycast blocking to prevent self-raycast
        canvasGroup.blocksRaycasts = false;
        
        // Audio feedback
        PlayAudioWithVariation(dragSound);
    }
    
    private void UpdateDragPosition(PointerEventData eventData)
    {
        Vector2 localPoint;
        RectTransformUtility.ScreenPointToLocalPointInRectangle(
            rectTransform.parent as RectTransform,
            eventData.position,
            eventData.pressEventCamera,
            out localPoint
        );
        
        // Apply touch lift offset
        localPoint += Vector2.up * touchLiftOffset;
        
        // Smooth drag with velocity
        Vector2 targetPosition = localPoint + dragOffset;
        rectTransform.anchoredPosition = Vector2.SmoothDamp(
            rectTransform.anchoredPosition,
            targetPosition,
            ref dragVelocity,
            dragSmoothTime
        );
    }
    
    private void EndDragOperation(PointerEventData eventData)
    {
        isDragging = false;
        
        // Restore raycast blocking
        canvasGroup.blocksRaycasts = true;
        
        // Calculate drag metrics for gesture detection
        float dragTime = Time.time - dragStartTime;
        float dragDistance = Vector2.Distance(dragStartPosition, eventData.position);
        float velocity = dragDistance / dragTime;
        
        // Log for tuning (remove in production)
        Debug.Log($"Drag Stats: Distance={dragDistance:F1}px, Time={dragTime:F2}s, Velocity={velocity:F1}px/s");
    }
    
    #endregion
    
    #region Validation & Detection
    
    private bool CanStartDrag()
    {
        // Add your validation logic here
        // Examples:
        // - Check if map is generating
        // - Check if tile is locked
        // - Check if multi-touch is active
        
        return true;
    }
    
    private bool IsValidDrop(PointerEventData eventData)
    {
        // Add your drop validation logic here
        // Examples:
        // - Check if dropping on valid slot
        // - Check if swap is allowed
        // - Check game state
        
        return true;
    }
    
    private void CheckTargetSlotWithMagnetism(PointerEventData eventData)
    {
        // Find nearest slot
        // Calculate distance
        // If within magnetic threshold:
        //   - Apply pull force
        //   - Highlight slot
        //   - Play haptic
        
        // IMPLEMENTATION:
        // var nearestSlot = FindNearestSlot(eventData.position);
        // if (nearestSlot != null && Vector2.Distance(...) < magneticSnapDistance)
        // {
        //     ApplyMagneticPull(nearestSlot);
        //     HighlightSlot(nearestSlot);
        // }
    }
    
    #endregion
    
    #region Feedback Systems
    
    private void PlayImmediateFeedback()
    {
        // 🔸 Haptic - Lightest, instant
        if (enableHaptics)
        {
            // HapticManager.Instance?.PlaySelectionHaptic();
        }
        
        // 🔊 Audio - With pitch variation
        PlayAudioWithVariation(touchSound);
        
        // 🎨 Visual - Scale pulse
        transform.DOPunchScale(Vector3.one * 0.05f, 0.1f)
            .SetUpdate(true);
    }
    
    private void PlaySuccessFeedback()
    {
        // 🔴 Haptic - Heavy
        if (enableHaptics)
        {
            // HapticManager.Instance?.PlaySuccessHaptic();
        }
        
        // 🔊 Audio - Success sound
        PlayAudioWithVariation(dropSound);
        
        // 🎨 Visual - Elastic bounce
        currentSequence?.Kill();
        currentSequence = DOTween.Sequence();
        currentSequence.Append(transform.DOScale(originalScale * 1.2f, 0.15f)
            .SetEase(Ease.OutQuad));
        currentSequence.Append(transform.DOScale(originalScale, 0.25f)
            .SetEase(Ease.OutElastic));
        currentSequence.Join(mainImage.DOColor(originalColor, 0.25f));
        currentSequence.SetUpdate(true);
    }
    
    private void PlayErrorFeedback()
    {
        // ⚠️ Haptic - Error pattern
        if (enableHaptics)
        {
            // HapticManager.Instance?.PlayNailHaptic();
        }
        
        // 🔊 Audio - Error sound
        PlayAudioWithVariation(errorSound);
        
        // 🎨 Visual - Shake
        currentSequence?.Kill();
        currentSequence = DOTween.Sequence();
        currentSequence.Append(rectTransform.DOShakeAnchorPos(0.3f, 20f, 20)
            .SetUpdate(true));
        currentSequence.Join(mainImage.DOColor(Color.red, 0.15f));
        currentSequence.Append(mainImage.DOColor(originalColor, 0.15f));
        currentSequence.Join(transform.DOScale(originalScale, 0.2f)
            .SetEase(Ease.OutBack));
    }
    
    private void PlayAudioWithVariation(AudioClip clip)
    {
        if (clip == null) return;
        
        float pitch = 1f + Random.Range(-pitchVariation, pitchVariation);
        // AudioController.PlaySound(clip, pitch: pitch);
    }
    
    #endregion
    
    #region Drop Handling
    
    private void PerformDrop(PointerEventData eventData)
    {
        // Implement your drop logic here
        // Examples:
        // - Swap tiles
        // - Update game state
        // - Trigger animations
        
        Debug.Log("Performing drop operation");
    }
    
    private void ReturnToOriginalPosition()
    {
        currentSequence?.Kill();
        currentSequence = DOTween.Sequence();
        
        // Return to original position
        currentSequence.Append(rectTransform.DOAnchorPos(Vector2.zero, 0.3f)
            .SetEase(Ease.InOutQuad));
        
        // Return to original scale and color
        currentSequence.Join(transform.DOScale(originalScale, 0.3f)
            .SetEase(Ease.OutBack));
        currentSequence.Join(mainImage.DOColor(originalColor, 0.3f));
        
        currentSequence.SetUpdate(true);
    }
    
    #endregion
    
    #region Visual Effects
    
    private void UpdateDragVisuals()
    {
        // Update any ongoing visual effects during drag
        // Examples:
        // - Trail effect
        // - Wobble rotation
        // - Shadow distance
        
        // Subtle wobble effect
        float wobble = Mathf.Sin(Time.time * 5f) * 5f;
        transform.rotation = Quaternion.Euler(0f, 0f, wobble);
    }
    
    #endregion
    
    #region Gizmos (Debug Visualization)
    
    private void OnDrawGizmosSelected()
    {
        // Visualize magnetic snap distance
        Gizmos.color = Color.yellow;
        Gizmos.DrawWireSphere(transform.position, magneticSnapDistance);
        
        // Visualize drag velocity
        if (isDragging && dragVelocity.magnitude > 0)
        {
            Gizmos.color = Color.cyan;
            Gizmos.DrawLine(transform.position, 
                transform.position + (Vector3)dragVelocity.normalized * 100f);
        }
    }
    
    #endregion
}

/// <summary>
/// USAGE EXAMPLE:
/// 
/// 1. Attach EnhancedTileInput to your tile GameObject
/// 2. Configure serialized fields in Inspector
/// 3. Implement validation logic in CanStartDrag() and IsValidDrop()
/// 4. Implement drop logic in PerformDrop()
/// 5. Test and tune parameters for best feel
/// 
/// CUSTOMIZATION TIPS:
/// - Adjust touchScaleUp (1.05-1.15) for subtle vs prominent feedback
/// - Tune dragSmoothTime (0.1-0.2) for responsive vs smooth feel
/// - Modify pitchVariation (0.05-0.15) for audio variety
/// - Set magneticSnapDistance (50-150) based on tile size
/// 
/// PERFORMANCE NOTES:
/// - Always kill tweens in OnDestroy()
/// - Use SetUpdate(true) for UI animations
/// - Consider pooling trail effects if implemented
/// - Profile on actual device for accurate feel
/// </summary>











