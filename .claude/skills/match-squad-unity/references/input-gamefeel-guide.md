# Input System & Gamefeel Enhancement Guide

> **Mục đích**: Cải thiện input responsiveness, gamefeel và UX cho hệ thống drag-drop của Match Squad

---

## 📋 Tổng quan

Match Squad đang sử dụng **Unity UI Event System** với drag-drop pattern cho tile interaction. Hướng dẫn này cung cấp best practices và techniques để tối ưu hóa input system và nâng cao gamefeel.

### Current Architecture
```
NormalTile (IPointerDownHandler, IDragHandler, IPointerUpHandler)
    ↓
TileDragHandler (Static controller)
    ↓
TileInputValidator (Input validation)
    ↓
TileEffectManager (Visual/Audio/Haptic feedback)
```

---

## 🎯 Gamefeel Pillars (5 trụ cột cảm giác chơi)

### 1. **Instant Response** (Phản hồi tức thì)
✅ **Mục tiêu**: Input phải được nhận biết ngay lập tức (< 100ms)

**Current Implementation:**
```csharp
public override void OnPointerDown(PointerEventData eventData)
{
    if (!TileInputValidator.CanProcessInput(this, eventData, debugMultiTouch)) return;
    
    TileEffectManager.PlayTouchHaptic();        // ✅ Haptic ngay lập tức
    TileEffectManager.PlayClickSound(this);     // ✅ Audio feedback
    
    // ... drag logic
}
```

**Best Practices:**
- ✅ Haptic/audio phải chạy TRƯỚC bất kỳ validation nào
- ✅ Visual feedback phải xuất hiện trong frame đầu tiên
- ❌ TRÁNH: Chờ animation hoàn thành trước khi phản hồi
- ❌ TRÁNH: Validation phức tạp trước khi cho feedback cơ bản

**Enhancement Checklist:**
```csharp
// 🔥 PRIORITY: Immediate feedback
TileEffectManager.PlayTouchHaptic();           // Frame 0
TileEffectManager.PlayClickSound(this);        // Frame 0
SetTouchVisualState(true);                     // Frame 0 - Highlight tile

// ⏱️ AFTER: Validation
if (!TileInputValidator.CanProcessInput(...)) 
{
    SetTouchVisualState(false);                // Revert visual if invalid
    return;
}

// 🎬 LAST: Start drag animations
TileDragHandler.StartDrag(this, eventData, touchLiftOffsetPixels);
```

---

### 2. **Visual Clarity** (Rõ ràng trực quan)

✅ **Mục tiêu**: User luôn biết tile có thể tương tác được và trạng thái hiện tại

#### A. Touch State Feedback
```csharp
// Thêm vào NormalTile.cs
private void SetTouchVisualState(bool isTouched)
{
    if (isTouched)
    {
        // Scale up slightly
        transform.DOScale(touchScaleUp, touchScaleDuration)
            .SetEase(Ease.OutBack)
            .SetUpdate(true);
        
        // Brighten color
        characterSpriteRenderer.DOColor(Color.white * 1.2f, touchScaleDuration)
            .SetUpdate(true);
    }
    else
    {
        // Return to normal
        transform.DOScale(1f, touchScaleDuration)
            .SetEase(Ease.InBack)
            .SetUpdate(true);
        
        characterSpriteRenderer.DOColor(Color.white, touchScaleDuration)
            .SetUpdate(true);
    }
}
```

#### B. Drag State Feedback
```csharp
// Trong TileDragHandler.cs - UpdateDrag
public static void UpdateDrag(NormalTile tile, PointerEventData eventData)
{
    if (!CanContinueDrag(tile)) return;
    
    // Update position
    DragUtils.DragUI(tile.RectTransform, eventData, currentPointerOffset);
    
    // 🎯 VISUAL: Trail effect
    CreateDragTrail(tile);
    
    // 🎯 VISUAL: Target highlight
    var targetSlot = FindTargetSlot(tile, eventData);
    HighlightTargetSlot(targetSlot);
}

private static void HighlightTargetSlot(TileSlot targetSlot)
{
    // Clear previous highlight
    if (lastHighlightedSlot != null && lastHighlightedSlot != targetSlot)
    {
        lastHighlightedSlot.SetHighlight(false);
    }
    
    // Highlight new target
    if (targetSlot != null)
    {
        targetSlot.SetHighlight(true);
        lastHighlightedSlot = targetSlot;
    }
}
```

#### C. Valid/Invalid Drop Zones
```csharp
// Trong TileSlot.cs
public void SetHighlight(bool isValid)
{
    if (isValid)
    {
        // Green highlight for valid drop
        background.DOColor(new Color(0.5f, 1f, 0.5f, 0.5f), 0.2f);
        transform.DOScale(1.05f, 0.2f).SetEase(Ease.OutBack);
    }
    else
    {
        // Red highlight for invalid drop
        background.DOColor(new Color(1f, 0.5f, 0.5f, 0.5f), 0.2f);
        transform.DOScale(0.95f, 0.2f).SetEase(Ease.InBack);
    }
}
```

---

### 3. **Tactile Feedback** (Phản hồi xúc giác)

✅ **Mục tiêu**: Mỗi action có haptic feedback phù hợp

#### Haptic Hierarchy
```csharp
public static class HapticPatterns
{
    // Light - Cho touch/hover
    public static void PlayLight()
    {
        HapticManager.Instance?.PlaySelectionHaptic();
    }
    
    // Medium - Cho drag start/end
    public static void PlayMedium()
    {
        HapticManager.Instance?.PlayTileSwap();
    }
    
    // Heavy - Cho successful match
    public static void PlayHeavy()
    {
        HapticManager.Instance?.PlaySuccessHaptic();
    }
    
    // Error - Cho invalid action
    public static void PlayError()
    {
        HapticManager.Instance?.PlayNailHaptic();
    }
}
```

#### Implementation Pattern
```csharp
// Touch Start - Light
public override void OnPointerDown(PointerEventData eventData)
{
    HapticPatterns.PlayLight();  // 🔸 Light tap
    // ...
}

// Drag Start - Medium
TileDragHandler.StartDrag(...)
{
    HapticPatterns.PlayMedium();  // 🔶 Medium intensity
    // ...
}

// Successful Swap - Heavy
OnSwapSuccess()
{
    HapticPatterns.PlayHeavy();  // 🔴 Strong feedback
    // ...
}

// Invalid Action - Error
OnSwapFailed()
{
    HapticPatterns.PlayError();  // ⚠️ Error pattern
    // ...
}
```

---

### 4. **Audio Layering** (Phân lớp âm thanh)

✅ **Mục tiêu**: Audio feedback phải phong phú và không lặp lại

#### Audio System Structure
```csharp
public static class AudioFeedbackSystem
{
    // Base touch sounds (varied pitch)
    public static void PlayTouchSound()
    {
        float randomPitch = Random.Range(0.95f, 1.05f);
        AudioController.PlaySound(AudioClips.touchSound, pitch: randomPitch);
    }
    
    // Drag sounds (pitch increases with distance)
    public static void PlayDragSound(float dragDistance)
    {
        float pitch = 1f + (dragDistance / 500f) * 0.3f;  // Max +30% pitch
        AudioController.PlaySound(AudioClips.dragSound, pitch: pitch);
    }
    
    // Drop sounds (volume based on velocity)
    public static void PlayDropSound(float dropVelocity)
    {
        float volume = Mathf.Clamp01(dropVelocity / 1000f);
        AudioController.PlaySound(AudioClips.dropSound, volume: volume);
    }
    
    // Success sounds (layered)
    public static void PlaySuccessSound()
    {
        AudioController.PlaySound(AudioClips.successJingle);
        
        // Layer with particle sound
        DOVirtual.DelayedCall(0.1f, () => 
        {
            AudioController.PlaySound(AudioClips.particleWhoosh);
        });
    }
}
```

#### Spatial Audio for Polish
```csharp
// Play sound at tile position for spatial feel
public static void PlaySoundAtPosition(AudioClip clip, Vector3 worldPosition)
{
    if (Camera.main == null) return;
    
    // Calculate pan based on screen position
    Vector3 screenPos = Camera.main.WorldToScreenPoint(worldPosition);
    float pan = (screenPos.x / Screen.width - 0.5f) * 2f;  // -1 to 1
    
    AudioController.PlaySound(clip, pan: Mathf.Clamp(pan, -0.5f, 0.5f));
}
```

---

### 5. **Motion Design** (Thiết kế chuyển động)

✅ **Mục tiêu**: Animations phải smooth, predictable và satisfying

#### A. Easing Functions cho từng trường hợp

```csharp
// Touch Down - Snappy and responsive
transform.DOScale(1.1f, 0.1f)
    .SetEase(Ease.OutBack)      // ✅ OutBack for bounce
    .SetUpdate(true);

// Drag Follow - Smooth tracking
rectTransform.DOAnchorPos(targetPos, 0.15f)
    .SetEase(Ease.OutQuad)      // ✅ OutQuad for smooth follow
    .SetUpdate(true);

// Drop Success - Satisfying landing
transform.DOScale(1f, 0.2f)
    .SetEase(Ease.OutElastic)   // ✅ Elastic for "pop"
    .SetUpdate(true);

// Return to Slot - Quick but smooth
rectTransform.DOAnchorPos(Vector2.zero, 0.25f)
    .SetEase(Ease.InOutQuad)    // ✅ InOutQuad for smooth return
    .SetUpdate(true);
```

#### B. Animation Sequencing
```csharp
public static Sequence CreateSwapSequence(NormalTile tile1, NormalTile tile2)
{
    Sequence swapSeq = DOTween.Sequence();
    
    // Phase 1: Lift (0.1s)
    swapSeq.Append(tile1.transform.DOScale(1.2f, 0.1f).SetEase(Ease.OutQuad));
    swapSeq.Join(tile2.transform.DOScale(1.2f, 0.1f).SetEase(Ease.OutQuad));
    
    // Phase 2: Swap positions (0.3s)
    swapSeq.Append(tile1.RectTransform.DOAnchorPos(tile2.Slot.RectTransform.anchoredPosition, 0.3f)
        .SetEase(Ease.InOutBack));
    swapSeq.Join(tile2.RectTransform.DOAnchorPos(tile1.Slot.RectTransform.anchoredPosition, 0.3f)
        .SetEase(Ease.InOutBack));
    
    // Phase 3: Land (0.15s)
    swapSeq.Append(tile1.transform.DOScale(1f, 0.15f).SetEase(Ease.OutElastic));
    swapSeq.Join(tile2.transform.DOScale(1f, 0.15f).SetEase(Ease.OutElastic));
    
    // Sound callbacks
    swapSeq.InsertCallback(0f, () => AudioFeedbackSystem.PlayTouchSound());
    swapSeq.InsertCallback(0.1f, () => AudioFeedbackSystem.PlayDragSound(100f));
    swapSeq.InsertCallback(0.4f, () => AudioFeedbackSystem.PlayDropSound(500f));
    
    return swapSeq.SetUpdate(true);
}
```

---

## 🚀 Advanced Techniques

### 1. **Predictive Highlighting**

Show target slot BEFORE finger reaches it:

```csharp
private static TileSlot PredictTargetSlot(NormalTile tile, PointerEventData eventData)
{
    // Get drag velocity
    Vector2 velocity = (eventData.position - lastEventPosition) / Time.deltaTime;
    
    // Extrapolate position 0.1s into future
    Vector2 predictedPos = eventData.position + velocity * 0.1f;
    
    // Find slot at predicted position
    return FindTargetSlotAtPosition(tile, predictedPos);
}
```

### 2. **Gesture Detection**

Enhance with swipe gestures:

```csharp
public class GestureDetector
{
    private Vector2 dragStartPos;
    private float dragStartTime;
    
    public void OnDragStart(PointerEventData eventData)
    {
        dragStartPos = eventData.position;
        dragStartTime = Time.time;
    }
    
    public GestureType DetectGesture(PointerEventData eventData)
    {
        float dragDistance = Vector2.Distance(dragStartPos, eventData.position);
        float dragTime = Time.time - dragStartTime;
        float velocity = dragDistance / dragTime;
        
        // Fast swipe = quick swap animation
        if (velocity > 2000f && dragTime < 0.2f)
        {
            return GestureType.FastSwipe;
        }
        
        // Slow drag = precise placement
        if (velocity < 500f)
        {
            return GestureType.SlowDrag;
        }
        
        return GestureType.NormalDrag;
    }
}

public enum GestureType
{
    SlowDrag,       // Precise, show guides
    NormalDrag,     // Standard behavior
    FastSwipe       // Quick snap animation
}
```

### 3. **Elastic Drag Limits**

Prevent dragging outside valid area with elastic resistance:

```csharp
private static Vector2 ApplyElasticConstraints(Vector2 dragPosition, Rect validArea)
{
    Vector2 clampedPos = dragPosition;
    
    // Apply elastic resistance outside bounds
    if (dragPosition.x < validArea.xMin)
    {
        float overflow = validArea.xMin - dragPosition.x;
        clampedPos.x = validArea.xMin - Mathf.Sqrt(overflow * 50f);  // Elastic curve
    }
    else if (dragPosition.x > validArea.xMax)
    {
        float overflow = dragPosition.x - validArea.xMax;
        clampedPos.x = validArea.xMax + Mathf.Sqrt(overflow * 50f);
    }
    
    // Same for Y axis
    // ...
    
    return clampedPos;
}
```

### 4. **Magnetic Snapping**

Tiles "snap" to nearby slots when close enough:

```csharp
public static TileSlot FindTargetSlotWithMagnetism(NormalTile tile, Vector2 dragPosition)
{
    TileSlot nearestSlot = FindNearestSlot(dragPosition);
    
    if (nearestSlot == null) return null;
    
    float distance = Vector2.Distance(dragPosition, nearestSlot.RectTransform.position);
    float magneticThreshold = 100f;  // Pixels
    
    if (distance < magneticThreshold)
    {
        // Apply magnetic pull
        float pullStrength = 1f - (distance / magneticThreshold);
        Vector2 pullDirection = (Vector2)nearestSlot.RectTransform.position - dragPosition;
        
        tile.RectTransform.anchoredPosition += pullDirection * pullStrength * Time.deltaTime * 5f;
        
        // Visual feedback
        nearestSlot.SetMagneticPulse(pullStrength);
        
        return nearestSlot;
    }
    
    return null;
}
```

---

## 📊 Performance Optimization

### 1. **Input Throttling**

Reduce update frequency for drag events:

```csharp
public class ThrottledDragHandler
{
    private static float lastUpdateTime = 0f;
    private static float updateInterval = 0.016f;  // 60 FPS
    
    public static void UpdateDrag(NormalTile tile, PointerEventData eventData)
    {
        if (Time.time - lastUpdateTime < updateInterval)
        {
            return;  // Skip this frame
        }
        
        lastUpdateTime = Time.time;
        
        // Actual drag update
        DragUtils.DragUI(tile.RectTransform, eventData, currentPointerOffset);
    }
}
```

### 2. **Raycast Optimization**

```csharp
// Current: Raycast caching trong TileDragHandler (line 82-87)
// ✅ GOOD: Already implemented

// Additional: Use raycast distance limit
private static void ConfigureRaycastOptimization()
{
    EventSystem.current.raycastCacheHitstestGraceTime = 0.016f;  // Cache for 1 frame
    
    // Limit raycast distance
    GraphicRaycaster raycaster = FindObjectOfType<GraphicRaycaster>();
    if (raycaster != null)
    {
        // Only raycast UI layer
        raycaster.blockingMask = LayerMask.GetMask("UI");
    }
}
```

### 3. **Object Pooling for Feedback Effects**

```csharp
// Pool trail effects instead of instantiating
public class TrailEffectPool
{
    private static Queue<GameObject> trailPool = new Queue<GameObject>();
    private static GameObject trailPrefab;
    
    public static GameObject GetTrail()
    {
        if (trailPool.Count > 0)
        {
            var trail = trailPool.Dequeue();
            trail.SetActive(true);
            return trail;
        }
        
        return PYDPool.Spawn<GameObject>(trailPrefab);
    }
    
    public static void ReturnTrail(GameObject trail)
    {
        trail.SetActive(false);
        trailPool.Enqueue(trail);
    }
}
```

---

## 🎨 Polish Checklist

### Essential Polish (Must Have)

- [ ] **Immediate haptic feedback** trên OnPointerDown
- [ ] **Visual scale up** (1.05-1.1x) khi touch
- [ ] **Audio click** với pitch variation
- [ ] **Smooth drag follow** với OutQuad easing
- [ ] **Valid/invalid drop zone** highlighting
- [ ] **Return animation** với elastic bounce
- [ ] **Success feedback** (haptic + audio + visual)
- [ ] **Error feedback** cho invalid actions

### Advanced Polish (Nice to Have)

- [ ] **Drag trail effect** following tile
- [ ] **Predictive target highlighting**
- [ ] **Magnetic snapping** near slots
- [ ] **Gesture detection** (fast swipe vs slow drag)
- [ ] **Elastic boundaries** outside valid area
- [ ] **Spatial audio** based on position
- [ ] **Particle effects** on successful swap
- [ ] **Screen shake** on impactful actions

### Mobile-Specific

- [ ] **Touch lift offset** (đã có: touchLiftOffsetPixels = 100f)
- [ ] **Large touch targets** (minimum 44x44 dp)
- [ ] **Visual feedback** for locked tiles
- [ ] **Multi-touch prevention** (đã có trong TileInputValidator)
- [ ] **Orientation support** (landscape/portrait)
- [ ] **Safe area** handling for notches
- [ ] **Performance target**: 60 FPS during drag

---

## 🧪 Testing Scenarios

### Functional Testing

```csharp
// Test case 1: Rapid taps
[Test] public void TestRapidTaps()
{
    for (int i = 0; i < 10; i++)
    {
        SimulateTouch(tile1);
        yield return null;  // Wait 1 frame
    }
    // Verify: No state corruption
}

// Test case 2: Multi-touch prevention
[Test] public void TestMultiTouch()
{
    SimulateTouch(tile1, touchId: 0);
    SimulateTouch(tile2, touchId: 1);  // Should be blocked
    // Verify: Only first touch is processed
}

// Test case 3: Drag cancellation
[Test] public void TestDragCancellation()
{
    SimulateDragStart(tile1);
    MIMLevelController.IsGeneratingMap = true;
    SimulateDragUpdate(tile1);
    // Verify: Drag is cancelled
}
```

### Feel Testing (Manual)

1. **Responsiveness Test**
   - Touch tile and check if feedback is instant
   - Should feel like tile "sticks" to finger

2. **Animation Smoothness**
   - Drag should be smooth with no stuttering
   - Return animation should be satisfying

3. **Feedback Richness**
   - Haptic should be noticeable but not overwhelming
   - Audio should be clear and varied

4. **Visual Clarity**
   - Always know which slot is target
   - Clear feedback for valid/invalid actions

---

## 📝 Implementation Roadmap

### Phase 1: Foundation (Week 1)
1. ✅ Audit current input system
2. ⬜ Add instant touch feedback (scale + color)
3. ⬜ Implement haptic hierarchy
4. ⬜ Add audio pitch variation
5. ⬜ Testing & tuning

### Phase 2: Visual Polish (Week 2)
1. ⬜ Target slot highlighting
2. ⬜ Drag trail effect
3. ⬜ Valid/invalid drop zones
4. ⬜ Return animation improvement
5. ⬜ Testing & tuning

### Phase 3: Advanced Features (Week 3)
1. ⬜ Predictive highlighting
2. ⬜ Magnetic snapping
3. ⬜ Gesture detection
4. ⬜ Elastic boundaries
5. ⬜ Testing & tuning

### Phase 4: Optimization (Week 4)
1. ⬜ Performance profiling
2. ⬜ Input throttling if needed
3. ⬜ Raycast optimization
4. ⬜ Memory optimization
5. ⬜ Final polish & testing

---

## 🔗 External Resources

### Unity Documentation
- [UI Event System](https://docs.unity3d.com/Packages/com.unity.ugui@1.0/manual/EventSystem.html)
- [Input System Package](https://docs.unity3d.com/Packages/com.unity.inputsystem@1.0/manual/index.html)
- [DOTween Documentation](http://dotween.demigiant.com/documentation.php)

### Gamefeel References
- **Juice It Or Lose It** - Classic talk about game feel
- **The Art of Screenshake** - Visual feedback techniques
- **Game Feel by Steve Swink** - Comprehensive book on the topic

### Performance
- [Unity Mobile Optimization Guide](https://unity.com/how-to/mobile-game-optimization)
- [UI Optimization Best Practices](https://unity.com/how-to/unity-ui-optimization-tips)

---

## 💡 Quick Wins (Implement Right Now)

### 1. Instant Scale Feedback (5 minutes)
```csharp
// In NormalTile.OnPointerDown
transform.DOScale(1.1f, 0.1f).SetEase(Ease.OutBack).SetUpdate(true);
```

### 2. Audio Pitch Variation (5 minutes)
```csharp
// In TileEffectManager.PlayClickSound
float pitch = Random.Range(0.95f, 1.05f);
AudioController.PlaySound(AudioClips.clickSound, pitch: pitch);
```

### 3. Drop Zone Highlighting (10 minutes)
```csharp
// In TileDragHandler.UpdateDrag
var targetSlot = FindTargetSlot(tile, eventData);
if (targetSlot != lastHighlightedSlot)
{
    lastHighlightedSlot?.SetHighlight(false);
    targetSlot?.SetHighlight(true);
    lastHighlightedSlot = targetSlot;
}
```

---

**Kết luận**: Input và gamefeel là foundation của player experience. Đầu tư thời gian polish những chi tiết nhỏ sẽ tạo ra sự khác biệt lớn về chất lượng game!











