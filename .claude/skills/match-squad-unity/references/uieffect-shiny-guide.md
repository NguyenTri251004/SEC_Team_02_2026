# UIEffect Shiny Guide

> **Mục đích**: Hướng dẫn sử dụng UIEffect Shiny (UIEffectReplica) từ package mob-sakai/UIEffect để tạo hiệu ứng shine/shimmer cho UI elements trong Match Squad

---

## 📋 Tổng quan

**UIEffect Shiny** là một transition filter từ package **Coffee.UIEffect** (mob-sakai) cho phép tạo hiệu ứng ánh sáng phản chiếu (shiny/shimmer) trên UI elements. Hiệu ứng này rất hữu ích cho:

- **Highlighting**: Làm nổi bật buttons, tiles, hoặc UI elements quan trọng
- **Reward Feedback**: Tạo cảm giác phần thưởng đặc biệt
- **Attention Drawing**: Thu hút sự chú ý đến các elements cần tương tác
- **Polish**: Nâng cao visual quality và gamefeel

### Package Information
- **Package Name**: `com.coffee.ui-effect`
- **GitHub**: https://github.com/mob-sakai/UIEffect
- **Namespace**: `Coffee.UIEffects`
- **Components**: `UIEffect`, `UIEffectReplica`, `UIEffectTweener`

---

## 🎯 Core Components

### 1. UIEffect (Base Component)
Component chính để áp dụng các effects lên UI element.

**Properties:**
- `Effect Mode`: Loại effect (Shiny, Blur, Grayscale, etc.)
- `Edge Mode`: Chế độ edge (Shiny, Plain, etc.)
- `Edge Shiny Width`: Độ rộng của hiệu ứng shiny (0-1)
- `Edge Shiny Rate`: Tỷ lệ shiny (0-1)
- `Edge Shiny Auto Play Speed`: Tốc độ animation tự động (0 = tắt)

### 2. UIEffectReplica (Replica Component)
Component để replicate effect từ một UIEffect khác. Hữu ích khi muốn nhiều UI elements share cùng một effect configuration.

**Use Cases:**
- Multiple buttons với cùng shiny effect
- Tile groups với cùng visual style
- Consistent effects across UI panels

### 3. UIEffectTweener (Animation Component)
Component để animate các properties của UIEffect bằng DOTween.

**Features:**
- Animate shiny rate từ 0 → 1
- Control animation duration và easing
- Trigger effects on events

---

## 🚀 Quick Start

### Setup trong Inspector

#### Bước 1: Add Component
1. Chọn UI element (Image, Button, Text, etc.)
2. Add Component → `UIEffect` hoặc `UIEffectReplica`
3. Configure properties trong Inspector

#### Bước 2: Configure Shiny Effect
```
UIEffect Component:
├── Effect Mode: Transition
├── Edge Mode: Shiny
├── Edge Shiny Width: 0.3-0.5 (recommended)
├── Edge Shiny Rate: 0.0-1.0 (0 = hidden, 1 = fully visible)
└── Edge Shiny Auto Play Speed: 1.0 (auto-animate)
```

#### Bước 3: Test trong Play Mode
- Shiny effect sẽ tự động animate nếu `Auto Play Speed > 0`
- Adjust `Edge Shiny Rate` để control visibility
- Adjust `Edge Shiny Width` để control effect size

---

## 💻 Code Implementation

### Basic Usage Pattern

```csharp
using Coffee.UIEffects;
using UnityEngine;
using UnityEngine.UI;

public class ShinyButtonController : MonoBehaviour
{
    [Header("Shiny Effect")]
    [SerializeField] private UIEffect shinyEffect;
    [SerializeField] private Button targetButton;
    
    [Header("Animation Settings")]
    [SerializeField] private float shinyDuration = 1.5f;
    [SerializeField] private float shinyWidth = 0.4f;
    
    private void Start()
    {
        // Get or add UIEffect component
        if (shinyEffect == null)
        {
            shinyEffect = targetButton.GetComponent<UIEffect>();
            if (shinyEffect == null)
            {
                shinyEffect = targetButton.gameObject.AddComponent<UIEffect>();
            }
        }
        
        // Configure shiny effect
        ConfigureShinyEffect();
    }
    
    private void ConfigureShinyEffect()
    {
        // Set effect mode to Transition
        shinyEffect.effectMode = EffectMode.Transition;
        
        // Set edge mode to Shiny
        shinyEffect.edgeMode = EdgeMode.Shiny;
        
        // Configure shiny properties
        shinyEffect.shinyWidth = shinyWidth;
        shinyEffect.shinyRate = 0f; // Start hidden
        
        // Enable auto-play for continuous animation
        shinyEffect.shinyAutoPlaySpeed = 1f;
    }
    
    /// <summary>
    /// Manually trigger shiny effect animation
    /// </summary>
    public void PlayShinyAnimation()
    {
        if (shinyEffect == null) return;
        
        // Disable auto-play for manual control
        shinyEffect.shinyAutoPlaySpeed = 0f;
        
        // Animate shiny rate from 0 to 1
        DOTween.To(
            () => shinyEffect.shinyRate,
            x => shinyEffect.shinyRate = x,
            1f,
            shinyDuration
        )
        .SetEase(Ease.OutQuad)
        .OnComplete(() =>
        {
            // Reset to 0 after animation
            DOTween.To(
                () => shinyEffect.shinyRate,
                x => shinyEffect.shinyRate = x,
                0f,
                shinyDuration
            )
            .SetEase(Ease.InQuad);
        });
    }
    
    /// <summary>
    /// Enable/disable shiny effect
    /// </summary>
    public void SetShinyEnabled(bool enabled)
    {
        if (shinyEffect == null) return;
        
        shinyEffect.shinyAutoPlaySpeed = enabled ? 1f : 0f;
        shinyEffect.shinyRate = enabled ? 1f : 0f;
    }
}
```

### Using UIEffectReplica Pattern

```csharp
using Coffee.UIEffects;
using UnityEngine;

public class ShinyGroupController : MonoBehaviour
{
    [Header("Master Effect")]
    [SerializeField] private UIEffect masterShinyEffect;
    
    [Header("Replica Targets")]
    [SerializeField] private UIEffectReplica[] replicaEffects;
    
    private void Start()
    {
        // Setup master effect
        ConfigureMasterEffect();
        
        // Setup replicas to follow master
        SetupReplicas();
    }
    
    private void ConfigureMasterEffect()
    {
        masterShinyEffect.effectMode = EffectMode.Transition;
        masterShinyEffect.edgeMode = EdgeMode.Shiny;
        masterShinyEffect.shinyWidth = 0.4f;
        masterShinyEffect.shinyAutoPlaySpeed = 1f;
    }
    
    private void SetupReplicas()
    {
        foreach (var replica in replicaEffects)
        {
            if (replica != null)
            {
                // Replica automatically follows master
                replica.targetEffect = masterShinyEffect;
            }
        }
    }
    
    /// <summary>
    /// Control all shiny effects at once via master
    /// </summary>
    public void SetGroupShinyEnabled(bool enabled)
    {
        masterShinyEffect.shinyAutoPlaySpeed = enabled ? 1f : 0f;
        masterShinyEffect.shinyRate = enabled ? 1f : 0f;
    }
}
```

### Using UIEffectTweener for Advanced Control

```csharp
using Coffee.UIEffects;
using DG.Tweening;
using UnityEngine;

public class ShinyTweenerController : MonoBehaviour
{
    [Header("Effect Components")]
    [SerializeField] private UIEffect shinyEffect;
    [SerializeField] private UIEffectTweener effectTweener;
    
    [Header("Animation Settings")]
    [SerializeField] private float pulseDuration = 2f;
    [SerializeField] private float pauseDuration = 1f;
    
    private Sequence pulseSequence;
    
    private void Start()
    {
        SetupTweener();
        StartPulseAnimation();
    }
    
    private void SetupTweener()
    {
        // Get or add UIEffectTweener
        if (effectTweener == null)
        {
            effectTweener = GetComponent<UIEffectTweener>();
            if (effectTweener == null)
            {
                effectTweener = gameObject.AddComponent<UIEffectTweener>();
            }
        }
        
        // Configure tweener target
        effectTweener.targetEffect = shinyEffect;
    }
    
    private void StartPulseAnimation()
    {
        // Create pulse sequence: 0 → 1 → 0 → pause → repeat
        pulseSequence = DOTween.Sequence();
        
        // Fade in shiny
        pulseSequence.Append(
            DOTween.To(
                () => shinyEffect.shinyRate,
                x => shinyEffect.shinyRate = x,
                1f,
                pulseDuration * 0.5f
            )
            .SetEase(Ease.OutQuad)
        );
        
        // Fade out shiny
        pulseSequence.Append(
            DOTween.To(
                () => shinyEffect.shinyRate,
                x => shinyEffect.shinyRate = x,
                0f,
                pulseDuration * 0.5f
            )
            .SetEase(Ease.InQuad)
        );
        
        // Pause before repeat
        pulseSequence.AppendInterval(pauseDuration);
        
        // Loop forever
        pulseSequence.SetLoops(-1);
    }
    
    private void OnDestroy()
    {
        // Kill sequence on destroy
        if (pulseSequence != null && pulseSequence.IsActive())
        {
            pulseSequence.Kill();
        }
    }
}
```

---

## 🎨 Common Use Cases

### 1. Highlight Important Buttons

```csharp
/// <summary>
/// Highlight button when it becomes available
/// </summary>
public class HighlightableButton : MonoBehaviour
{
    [SerializeField] private UIEffect shinyEffect;
    [SerializeField] private Button button;
    
    public void Highlight()
    {
        shinyEffect.shinyAutoPlaySpeed = 1f;
        shinyEffect.shinyWidth = 0.4f;
    }
    
    public void StopHighlight()
    {
        shinyEffect.shinyAutoPlaySpeed = 0f;
        shinyEffect.shinyRate = 0f;
    }
}
```

### 2. Reward Feedback Animation

```csharp
/// <summary>
/// Play shiny animation when reward is received
/// </summary>
public class RewardShinyFeedback : MonoBehaviour
{
    [SerializeField] private UIEffect shinyEffect;
    [SerializeField] private float rewardAnimationDuration = 1.5f;
    
    public void PlayRewardAnimation()
    {
        // Disable auto-play
        shinyEffect.shinyAutoPlaySpeed = 0f;
        
        // Animate shiny rate
        DOTween.To(
            () => shinyEffect.shinyRate,
            x => shinyEffect.shinyRate = x,
            1f,
            rewardAnimationDuration * 0.3f
        )
        .SetEase(Ease.OutQuad)
        .OnComplete(() =>
        {
            // Hold at peak
            DOTween.To(
                () => shinyEffect.shinyRate,
                x => shinyEffect.shinyRate = x,
                0f,
                rewardAnimationDuration * 0.7f
            )
            .SetEase(Ease.InQuad);
        });
    }
}
```

### 3. Tile Group Highlighting

```csharp
/// <summary>
/// Highlight matched tile groups with shiny effect
/// </summary>
public class TileGroupShiny : MonoBehaviour
{
    [SerializeField] private UIEffectReplica shinyReplica;
    [SerializeField] private UIEffect masterShinyEffect;
    
    public void HighlightGroup(float duration)
    {
        // Configure master effect
        masterShinyEffect.shinyWidth = 0.5f;
        masterShinyEffect.shinyAutoPlaySpeed = 0f;
        
        // Animate group highlight
        DOTween.To(
            () => masterShinyEffect.shinyRate,
            x => masterShinyEffect.shinyRate = x,
            1f,
            duration * 0.5f
        )
        .SetEase(Ease.OutQuad)
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
}
```

### 4. Attention Drawing (Pulse Effect)

```csharp
/// <summary>
/// Pulse shiny effect to draw attention
/// </summary>
public class AttentionShiny : MonoBehaviour
{
    [SerializeField] private UIEffect shinyEffect;
    [SerializeField] private int pulseCount = 3;
    [SerializeField] private float pulseSpeed = 2f;
    
    private Sequence pulseSequence;
    
    public void PlayAttentionPulse()
    {
        // Kill existing sequence
        if (pulseSequence != null && pulseSequence.IsActive())
        {
            pulseSequence.Kill();
        }
        
        // Disable auto-play
        shinyEffect.shinyAutoPlaySpeed = 0f;
        
        // Create pulse sequence
        pulseSequence = DOTween.Sequence();
        
        for (int i = 0; i < pulseCount; i++)
        {
            // Fade in
            pulseSequence.Append(
                DOTween.To(
                    () => shinyEffect.shinyRate,
                    x => shinyEffect.shinyRate = x,
                    1f,
                    1f / pulseSpeed
                )
                .SetEase(Ease.OutQuad)
            );
            
            // Fade out
            pulseSequence.Append(
                DOTween.To(
                    () => shinyEffect.shinyRate,
                    x => shinyEffect.shinyRate = x,
                    0f,
                    1f / pulseSpeed
                )
                .SetEase(Ease.InQuad)
            );
        }
        
        pulseSequence.SetAutoKill(true);
    }
    
    private void OnDestroy()
    {
        if (pulseSequence != null && pulseSequence.IsActive())
        {
            pulseSequence.Kill();
        }
    }
}
```

---

## ⚙️ Configuration Best Practices

### Shiny Width Values
- **Subtle**: `0.2 - 0.3` - Nhẹ nhàng, không quá nổi bật
- **Standard**: `0.3 - 0.5` - Cân bằng, phù hợp cho hầu hết cases
- **Bold**: `0.5 - 0.7` - Nổi bật, thu hút sự chú ý mạnh
- **Extreme**: `0.7 - 1.0` - Rất nổi bật, chỉ dùng cho special cases

### Auto Play Speed Values
- **Slow**: `0.5 - 0.8` - Chậm, elegant
- **Normal**: `1.0 - 1.5` - Tốc độ chuẩn
- **Fast**: `1.5 - 2.5` - Nhanh, dynamic
- **Very Fast**: `2.5+` - Rất nhanh, chỉ dùng cho special effects

### Performance Considerations
- **UIEffectReplica**: Sử dụng khi có nhiều elements cần cùng effect → giảm draw calls
- **Auto Play**: Tắt khi không cần thiết để tiết kiệm performance
- **Manual Control**: Sử dụng DOTween cho animation phức tạp thay vì auto-play

---

## 🔧 Integration với Match Squad Systems

### Integration với Tile System

```csharp
/// <summary>
/// Add shiny effect to special tiles
/// </summary>
public class SpecialTileShiny : NormalTile
{
    [SerializeField] private UIEffect shinyEffect;
    [SerializeField] private bool isSpecialTile = false;
    
    public override void Initialize(ElementData elementData)
    {
        base.Initialize(elementData);
        
        // Check if tile is special
        isSpecialTile = elementData.IsSpecial;
        
        if (isSpecialTile && shinyEffect != null)
        {
            ConfigureShinyEffect();
        }
    }
    
    private void ConfigureShinyEffect()
    {
        shinyEffect.effectMode = EffectMode.Transition;
        shinyEffect.edgeMode = EdgeMode.Shiny;
        shinyEffect.shinyWidth = 0.4f;
        shinyEffect.shinyAutoPlaySpeed = 1f;
    }
    
    /// <summary>
    /// Play shiny animation when tile is matched
    /// </summary>
    public void PlayMatchShiny()
    {
        if (shinyEffect == null) return;
        
        shinyEffect.shinyAutoPlaySpeed = 0f;
        
        DOTween.To(
            () => shinyEffect.shinyRate,
            x => shinyEffect.shinyRate = x,
            1f,
            0.3f
        )
        .SetEase(Ease.OutQuad)
        .OnComplete(() =>
        {
            DOTween.To(
                () => shinyEffect.shinyRate,
                x => shinyEffect.shinyRate = x,
                0f,
                0.5f
            )
            .SetEase(Ease.InQuad);
        });
    }
}
```

### Integration với Power-Up System

```csharp
/// <summary>
/// Highlight power-up buttons with shiny effect
/// </summary
public class PowerUpShinyHighlight : MonoBehaviour
{
    [SerializeField] private UIEffect shinyEffect;
    [SerializeField] private PowerUpHelper powerUpHelper;
    
    private void Start()
    {
        // Subscribe to power-up events
        if (powerUpHelper != null)
        {
            // Example: Highlight when power-up is available
            // powerUpHelper.OnPowerUpAvailable += HighlightPowerUp;
        }
    }
    
    public void HighlightPowerUp()
    {
        if (shinyEffect == null) return;
        
        shinyEffect.shinyWidth = 0.5f;
        shinyEffect.shinyAutoPlaySpeed = 1.5f;
    }
    
    public void StopHighlight()
    {
        if (shinyEffect == null) return;
        
        shinyEffect.shinyAutoPlaySpeed = 0f;
        shinyEffect.shinyRate = 0f;
    }
}
```

### Integration với Win Condition

```csharp
/// <summary>
/// Play shiny celebration when level is completed
/// </summary>
public class WinShinyCelebration : MonoBehaviour
{
    [SerializeField] private UIEffect[] celebrationShinyEffects;
    [SerializeField] private float celebrationDuration = 2f;
    
    public void PlayWinCelebration()
    {
        foreach (var effect in celebrationShinyEffects)
        {
            if (effect != null)
            {
                PlayCelebrationAnimation(effect);
            }
        }
    }
    
    private void PlayCelebrationAnimation(UIEffect effect)
    {
        effect.shinyAutoPlaySpeed = 0f;
        effect.shinyWidth = 0.6f;
        
        // Random delay for staggered effect
        float delay = Random.Range(0f, 0.3f);
        
        DOTween.Sequence()
            .AppendInterval(delay)
            .Append(
                DOTween.To(
                    () => effect.shinyRate,
                    x => effect.shinyRate = x,
                    1f,
                    celebrationDuration * 0.3f
                )
                .SetEase(Ease.OutQuad)
            )
            .Append(
                DOTween.To(
                    () => effect.shinyRate,
                    x => effect.shinyRate = x,
                    0f,
                    celebrationDuration * 0.7f
                )
                .SetEase(Ease.InQuad)
            );
    }
}
```

---

## ⚠️ Common Issues & Solutions

### Issue 1: Shiny Effect Not Visible
**Symptoms**: Effect được add nhưng không thấy

**Solutions**:
1. Check `Effect Mode` = `Transition`
2. Check `Edge Mode` = `Shiny`
3. Check `Edge Shiny Rate` > 0 hoặc `Auto Play Speed` > 0
4. Verify UI element có Graphic component (Image, Text, etc.)

### Issue 2: Performance Issues với Multiple Effects
**Symptoms**: Frame rate drop khi có nhiều shiny effects

**Solutions**:
1. Sử dụng `UIEffectReplica` thay vì nhiều `UIEffect` riêng lẻ
2. Tắt `Auto Play Speed` khi không cần thiết
3. Limit số lượng effects active cùng lúc
4. Sử dụng object pooling cho effects

### Issue 3: Animation Conflicts với DOTween
**Symptoms**: Shiny animation bị conflict với DOTween sequences

**Solutions**:
1. Tắt `Auto Play Speed` khi dùng manual DOTween control
2. Kill DOTween sequences trong `OnDestroy`
3. Check for multiple tweens trên cùng property

### Issue 4: Effect Không Sync giữa Replicas
**Symptoms**: Replicas không follow master effect

**Solutions**:
1. Verify `targetEffect` được assign đúng
2. Check master effect có `enabled = true`
3. Ensure replicas được setup sau khi master được configure

---

## 📚 Additional Resources

### Official Documentation
- **GitHub Repository**: https://github.com/mob-sakai/UIEffect
- **Transition Filter Docs**: https://github.com/mob-sakai/UIEffect?tab=readme-ov-file#transition-filter
- **API Reference**: Check package documentation trong Unity

### Related Match Squad Systems
- **Animation Queue System**: `references/animation-queue-system.md`
- **Input & Gamefeel Guide**: `references/input-gamefeel-guide.md`
- **Code Patterns**: `references/code-patterns.md`

### Templates
- **UIEffectShinyTemplate.cs**: Complete template với best practices
- **DOTweenSequenceExamples.cs**: Animation patterns

---

## ✅ Checklist khi Implement

- [ ] UIEffect component được add vào UI element
- [ ] Effect Mode = Transition
- [ ] Edge Mode = Shiny
- [ ] Shiny Width được set phù hợp (0.3-0.5 recommended)
- [ ] Auto Play Speed được configure (hoặc manual control)
- [ ] DOTween sequences được kill trong OnDestroy
- [ ] Performance được test với multiple effects
- [ ] Effect được test trên mobile device
- [ ] Integration với existing systems (Tile, PowerUp, etc.)

---

**Last Updated**: December 2025  
**Maintained by**: Claude AI + Development Team  
**Version**: 1.0.0
