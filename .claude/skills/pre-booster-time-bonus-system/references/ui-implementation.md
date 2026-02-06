# UI Implementation Guide

## Overview

UIPreBooster is the main panel displayed when player presses Play button. It allows booster selection before entering a level.

## Prefab Structure

```
UIPreBooster (Canvas/Panel)
├── Background (Image - semi-transparent black)
├── Panel (Image - cream/beige background)
│   ├── Header
│   │   ├── CloseButton (Button - red X)
│   │   └── LevelText (TextMeshProUGUI - "LEVEL 9")
│   │
│   ├── WinStreakSection
│   │   ├── IconContainer
│   │   │   ├── HourglassIcon (Image)
│   │   │   └── BonusText (TextMeshProUGUI - "+20s")
│   │   ├── TitleText (TextMeshProUGUI - "Win Streak Gift")
│   │   └── LockBadge
│   │       ├── LockIcon (Image)
│   │       └── LockText (TextMeshProUGUI - "Unlocks at Level 20")
│   │
│   ├── BoosterSection
│   │   ├── TitleText (TextMeshProUGUI - "Select Boosters:")
│   │   └── BoosterContainer (HorizontalLayoutGroup)
│   │       ├── BoosterSlot1 (PreBoosterSlot prefab)
│   │       └── BoosterSlot2 (PreBoosterSlot prefab)
│   │
│   └── PlaySection
│       ├── DifficultyBadge
│       │   ├── SkullIconLeft (Image)
│       │   ├── DifficultyText (TextMeshProUGUI - "Hard")
│       │   └── SkullIconRight (Image)
│       └── PlayButton (Button - green)
│           └── PlayText (TextMeshProUGUI - "Play")
```

## PreBoosterSlot Prefab

```
PreBoosterSlot (Button)
├── Background (Image - changes based on state)
├── IconContainer
│   ├── BoosterIcon (Image - lightbulb/clock)
│   └── CheckmarkIcon (Image - shown when selected)
├── LockOverlay (GameObject - shown when locked)
│   ├── LockIcon (Image)
│   └── LockText (TextMeshProUGUI - "Level X")
└── SelectionBorder (Image - shown when selected)
```

## UIPreBooster.cs Implementation

```csharp
using UnityEngine;
using UnityEngine.UI;
using TMPro;
using System;
using DG.Tweening;

public class UIPreBooster : MonoBehaviour
{
    public static UIPreBooster Instance { get; private set; }

    [Header("References")]
    [SerializeField] private GameObject panel;
    [SerializeField] private Image background;
    [SerializeField] private Button closeButton;
    [SerializeField] private TextMeshProUGUI levelText;

    [Header("Win Streak Section")]
    [SerializeField] private GameObject winStreakSection;
    [SerializeField] private Image hourglassIcon;
    [SerializeField] private TextMeshProUGUI bonusTimeText;
    [SerializeField] private GameObject lockBadge;
    [SerializeField] private TextMeshProUGUI lockText;

    [Header("Booster Slots")]
    [SerializeField] private PreBoosterSlot hintPlusSlot;
    [SerializeField] private PreBoosterSlot extraTimeSlot;

    [Header("Play Section")]
    [SerializeField] private GameObject difficultyBadge;
    [SerializeField] private TextMeshProUGUI difficultyText;
    [SerializeField] private Button playButton;

    [Header("Unlock Levels")]
    [SerializeField] private int hintPlusUnlockLevel = 9;
    [SerializeField] private int extraTimeUnlockLevel = 13;
    [SerializeField] private int winStreakGiftUnlockLevel = 20;

    [Header("Colors")]
    [SerializeField] private Color lockedColor = new Color(0.5f, 0.5f, 0.5f, 1f);
    [SerializeField] private Color unlockedColor = Color.white;
    [SerializeField] private Color activeColor = new Color(0.2f, 0.8f, 1f, 1f);

    private int currentLevel;
    private Action onPlayCallback;
    private bool hintPlusSelected;
    private bool extraTimeSelected;

    private void Awake()
    {
        if (Instance == null)
        {
            Instance = this;
        }
        else
        {
            Destroy(gameObject);
            return;
        }

        closeButton.onClick.AddListener(Hide);
        playButton.onClick.AddListener(OnPlayButtonClicked);

        hintPlusSlot.OnSlotClicked += OnHintPlusSlotClicked;
        extraTimeSlot.OnSlotClicked += OnExtraTimeSlotClicked;

        panel.SetActive(false);
    }

    private void OnDestroy()
    {
        if (hintPlusSlot != null)
            hintPlusSlot.OnSlotClicked -= OnHintPlusSlotClicked;
        if (extraTimeSlot != null)
            extraTimeSlot.OnSlotClicked -= OnExtraTimeSlotClicked;
    }

    public void Show(int level, Action onPlay)
    {
        currentLevel = level;
        onPlayCallback = onPlay;

        SetupUI();

        panel.SetActive(true);
        AnimateShow();
    }

    public void Hide()
    {
        AnimateHide(() => {
            panel.SetActive(false);
        });
    }

    private void SetupUI()
    {
        // Level text
        levelText.text = $"LEVEL {currentLevel}";

        // Win Streak Section
        SetupWinStreakSection();

        // Booster Slots
        SetupBoosterSlots();

        // Difficulty Badge (optional - based on level data)
        SetupDifficultyBadge();
    }

    private void SetupWinStreakSection()
    {
        bool isUnlocked = currentLevel >= winStreakGiftUnlockLevel;
        bool isActive = WinStreakSave.Instance.IsGiftActive && isUnlocked;

        hourglassIcon.color = isUnlocked ? unlockedColor : lockedColor;
        bonusTimeText.color = isActive ? activeColor : (isUnlocked ? unlockedColor : lockedColor);

        lockBadge.SetActive(!isUnlocked);
        lockText.text = $"Unlocks at Level {winStreakGiftUnlockLevel}";

        // Add glow effect if active
        if (isActive)
        {
            // Apply glow/pulse animation
            hourglassIcon.transform.DOScale(1.1f, 0.5f)
                .SetLoops(-1, LoopType.Yoyo)
                .SetUpdate(true);
        }
    }

    private void SetupBoosterSlots()
    {
        // Hint Plus Slot
        bool hintPlusUnlocked = currentLevel >= hintPlusUnlockLevel;
        bool hintPlusOwned = PreBoosterSave.Instance.HintPlusCount > 0;

        hintPlusSlot.Setup(
            isLocked: !hintPlusUnlocked,
            isOwned: hintPlusOwned,
            lockLevel: hintPlusUnlockLevel,
            boosterType: PreBoosterType.HintPlus
        );

        // Auto-select if owned
        if (hintPlusUnlocked && hintPlusOwned)
        {
            hintPlusSelected = true;
            hintPlusSlot.SetSelected(true);
        }

        // Extra Time Slot
        bool extraTimeUnlocked = currentLevel >= extraTimeUnlockLevel;
        bool extraTimeOwned = PreBoosterSave.Instance.ExtraTimeCount > 0;

        extraTimeSlot.Setup(
            isLocked: !extraTimeUnlocked,
            isOwned: extraTimeOwned,
            lockLevel: extraTimeUnlockLevel,
            boosterType: PreBoosterType.ExtraTime
        );

        // Auto-select if owned
        if (extraTimeUnlocked && extraTimeOwned)
        {
            extraTimeSelected = true;
            extraTimeSlot.SetSelected(true);
        }
    }

    private void SetupDifficultyBadge()
    {
        // Get level difficulty from LevelData if available
        var levelData = LevelDatabase.Instance.GetLevel(currentLevel);
        if (levelData != null && levelData.LevelDuration > 0)
        {
            difficultyBadge.SetActive(true);
            // Determine difficulty based on level duration or other factors
            difficultyText.text = GetDifficultyText(levelData);
        }
        else
        {
            difficultyBadge.SetActive(false);
        }
    }

    private string GetDifficultyText(LevelData levelData)
    {
        // Example logic - adjust based on actual game rules
        if (levelData.LevelDuration <= 60) return "Hard";
        if (levelData.LevelDuration <= 90) return "Medium";
        return "Easy";
    }

    private void OnHintPlusSlotClicked()
    {
        if (!hintPlusSlot.IsUnlocked) return;
        if (!hintPlusSlot.IsOwned)
        {
            // Show purchase flow
            ShowPurchaseUI(PreBoosterType.HintPlus);
            return;
        }

        hintPlusSelected = !hintPlusSelected;
        hintPlusSlot.SetSelected(hintPlusSelected);
    }

    private void OnExtraTimeSlotClicked()
    {
        if (!extraTimeSlot.IsUnlocked) return;
        if (!extraTimeSlot.IsOwned)
        {
            // Show purchase flow
            ShowPurchaseUI(PreBoosterType.ExtraTime);
            return;
        }

        extraTimeSelected = !extraTimeSelected;
        extraTimeSlot.SetSelected(extraTimeSelected);
    }

    private void ShowPurchaseUI(PreBoosterType type)
    {
        // TODO: Implement purchase flow
        Debug.Log($"Show purchase UI for {type}");
    }

    private void OnPlayButtonClicked()
    {
        // Save selected boosters for execution
        PreBoosterManager.Instance.SetSelectedBoosters(hintPlusSelected, extraTimeSelected);

        // Consume boosters if selected
        if (hintPlusSelected && PreBoosterSave.Instance.HintPlusCount > 0)
        {
            PreBoosterSave.Instance.ConsumeHintPlus();
        }
        if (extraTimeSelected && PreBoosterSave.Instance.ExtraTimeCount > 0)
        {
            PreBoosterSave.Instance.ConsumeExtraTime();
        }

        Hide();
        onPlayCallback?.Invoke();
    }

    private void AnimateShow()
    {
        background.DOFade(0.7f, 0.2f).From(0f).SetUpdate(true);
        panel.transform.DOScale(1f, 0.3f)
            .From(0.8f)
            .SetEase(Ease.OutBack)
            .SetUpdate(true);
    }

    private void AnimateHide(Action onComplete)
    {
        background.DOFade(0f, 0.2f).SetUpdate(true);
        panel.transform.DOScale(0.8f, 0.2f)
            .SetEase(Ease.InBack)
            .SetUpdate(true)
            .OnComplete(() => onComplete?.Invoke());
    }
}
```

## PreBoosterSlot.cs Implementation

```csharp
using UnityEngine;
using UnityEngine.UI;
using TMPro;
using System;

public enum PreBoosterType
{
    HintPlus,
    ExtraTime
}

public class PreBoosterSlot : MonoBehaviour
{
    public event Action OnSlotClicked;

    [Header("References")]
    [SerializeField] private Button button;
    [SerializeField] private Image background;
    [SerializeField] private Image boosterIcon;
    [SerializeField] private Image checkmarkIcon;
    [SerializeField] private GameObject lockOverlay;
    [SerializeField] private Image lockIcon;
    [SerializeField] private TextMeshProUGUI lockText;
    [SerializeField] private Image selectionBorder;

    [Header("Booster Icons")]
    [SerializeField] private Sprite hintPlusIcon;
    [SerializeField] private Sprite extraTimeIcon;

    [Header("Colors")]
    [SerializeField] private Color normalColor = Color.white;
    [SerializeField] private Color lockedColor = new Color(0.5f, 0.5f, 0.5f);
    [SerializeField] private Color selectedColor = new Color(0.2f, 1f, 0.4f);

    public bool IsLocked { get; private set; }
    public bool IsOwned { get; private set; }
    public bool IsSelected { get; private set; }
    public PreBoosterType BoosterType { get; private set; }

    private void Awake()
    {
        button.onClick.AddListener(() => OnSlotClicked?.Invoke());
    }

    public void Setup(bool isLocked, bool isOwned, int lockLevel, PreBoosterType boosterType)
    {
        IsLocked = isLocked;
        IsOwned = isOwned;
        BoosterType = boosterType;

        // Set icon based on booster type
        boosterIcon.sprite = boosterType == PreBoosterType.HintPlus ? hintPlusIcon : extraTimeIcon;

        // Setup lock state
        lockOverlay.SetActive(isLocked);
        lockText.text = $"Level\n{lockLevel}";

        // Setup visual state
        if (isLocked)
        {
            background.color = lockedColor;
            boosterIcon.color = lockedColor;
        }
        else
        {
            background.color = normalColor;
            boosterIcon.color = normalColor;
        }

        // Hide selection by default
        checkmarkIcon.gameObject.SetActive(false);
        selectionBorder.gameObject.SetActive(false);
    }

    public void SetSelected(bool selected)
    {
        IsSelected = selected;
        checkmarkIcon.gameObject.SetActive(selected);
        selectionBorder.gameObject.SetActive(selected);
        selectionBorder.color = selectedColor;
    }
}
```

## Integration with Existing Code

### UIHome.cs Modification

```csharp
// Find the Play button click handler and modify:

// BEFORE:
public void OnPlayButtonClicked()
{
    LevelController.Instance.LoadLevel();
}

// AFTER:
public void OnPlayButtonClicked()
{
    int currentLevel = LevelSave.Instance.DisplayLevelNumber;

    // Show pre-booster UI if any booster is unlocked
    if (currentLevel >= 9) // First booster unlock level
    {
        UIPreBooster.Instance.Show(currentLevel, () => {
            LevelController.Instance.LoadLevel();
        });
    }
    else
    {
        // Direct level loading for early levels
        LevelController.Instance.LoadLevel();
    }
}
```

## Visual Reference

### Color Palette

| Element | Color (Hex) | Usage |
|---------|-------------|-------|
| Header Background | `#E74C3C` | Red banner |
| Panel Background | `#F5E6D3` | Cream/beige |
| Play Button | `#2ECC71` | Green |
| Lock Icon/Text | `#7F8C8D` | Gray |
| Selected Border | `#27AE60` | Green |
| Bonus Text Active | `#00D9FF` | Cyan |
| Close Button | `#C0392B` | Dark red |

### Animation Timings

| Animation | Duration | Easing |
|-----------|----------|--------|
| Panel Show | 0.3s | OutBack |
| Panel Hide | 0.2s | InBack |
| Background Fade | 0.2s | Linear |
| Selection Toggle | 0.15s | OutQuad |
| Win Streak Glow | 0.5s | Yoyo Loop |
