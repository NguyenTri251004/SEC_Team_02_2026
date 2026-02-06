# Unity Implementation Guide

Technical reference for implementing games in Unity based on GDD analysis.

## Project Setup

### Unity Version Selection
- **LTS Releases**: 2022.3 LTS or 2023.3 LTS (recommended)
- **Feature Releases**: Latest stable for cutting-edge features

### Template Selection
- **2D**: Side-scrollers, top-down, puzzle games
- **3D**: First-person, third-person, 3D platformers
- **Mobile**: Optimized for Android/iOS
- **Universal RP**: Modern rendering pipeline

## Essential Packages

### Core Packages
```
com.unity.inputsystem - New Input System
com.unity.textmeshpro - Better text rendering
com.unity.cinemachine - Advanced camera control
com.unity.addressables - Asset management
```

### Rendering
```
com.unity.render-pipelines.universal - URP
com.unity.postprocessing - Visual effects
```

### Mobile
```
com.unity.mobile.notifications - Push notifications
com.unity.purchasing - IAP
com.unity.ads - Monetization
```

## Common Game Types Implementation

### Match-3 Puzzle (like Match Squad)
**Components:**
- Grid system (ScriptableObject for level data)
- Tile controller (swap mechanics, matching logic)
- Match detector (group detection algorithms)
- Animation queue (sequential feedback)
- Power-ups system (special tiles, boosters)

**Key Scripts:**
- `GridManager.cs` - Grid state and operations
- `TileController.cs` - Individual tile behavior
- `MatchDetector.cs` - Pattern recognition
- `LevelController.cs` - Level loading/winning

### Platformer
**Components:**
- Character Controller 2D/3D
- Rigidbody for physics
- Animator for character states
- Tilemap (2D) or Terrain (3D)

**Key Scripts:**
- `PlayerController.cs` - Movement and input
- `GroundCheck.cs` - Jump validation
- `CameraFollow.cs` - Camera tracking

### Endless Runner
**Components:**
- Object pooling for obstacles
- Scrolling background
- Procedural generation
- Score tracking

**Key Scripts:**
- `GameManager.cs` - Game flow
- `ObstacleSpawner.cs` - Procedural content
- `ScoreManager.cs` - Points system

## Architecture Patterns

### Manager Pattern
```csharp
public class GameManager : MonoBehaviour
{
    public static GameManager Instance { get; private set; }

    void Awake()
    {
        if (Instance == null)
        {
            Instance = this;
            DontDestroyOnLoad(gameObject);
        }
        else
        {
            Destroy(gameObject);
        }
    }
}
```

### Object Pooling
```csharp
public class ObjectPool : MonoBehaviour
{
    public GameObject prefab;
    private Queue<GameObject> pool = new Queue<GameObject>();

    public GameObject Get()
    {
        if (pool.Count == 0)
        {
            return Instantiate(prefab);
        }
        var obj = pool.Dequeue();
        obj.SetActive(true);
        return obj;
    }

    public void Return(GameObject obj)
    {
        obj.SetActive(false);
        pool.Enqueue(obj);
    }
}
```

### Event System
```csharp
using UnityEngine.Events;

public class GameEvents
{
    public static UnityEvent OnGameStart = new UnityEvent();
    public static UnityEvent OnGameOver = new UnityEvent();
    public static UnityEvent<int> OnScoreChanged = new UnityEvent<int>();
}
```

## Physics Setup

### 2D Games
- Use `Rigidbody2D` for moving objects
- `BoxCollider2D`, `CircleCollider2D` for collision
- Physics2D settings: gravity, layers
- Collision matrix configuration

### 3D Games
- Use `Rigidbody` for physics objects
- `BoxCollider`, `SphereCollider`, `MeshCollider`
- Layer-based collision
- Physics materials for friction/bounce

## Input System

### New Input System
1. Create Input Actions asset
2. Define action maps (Player, UI, Menu)
3. Bind inputs (keyboard, gamepad, touch)
4. Generate C# class for easy access

```csharp
using UnityEngine.InputSystem;

public class PlayerInput : MonoBehaviour
{
    private PlayerControls controls;

    void Awake()
    {
        controls = new PlayerControls();
    }

    void OnEnable()
    {
        controls.Player.Enable();
        controls.Player.Jump.performed += OnJump;
    }

    void OnJump(InputAction.CallbackContext context)
    {
        // Jump logic
    }
}
```

## Animation

### Animator Setup
- Create Animator Controller
- Define states (Idle, Walk, Jump, Attack)
- Set up transitions with parameters
- Use blend trees for smooth movement

### DOTween (Asset Store)
```csharp
using DG.Tweening;

transform.DOMove(targetPos, 1f).SetEase(Ease.OutQuad);
transform.DOScale(Vector3.one * 1.5f, 0.5f).SetLoops(2, LoopType.Yoyo);
```

## UI Implementation

### Canvas Setup
- Screen Space - Overlay (simple UI)
- Screen Space - Camera (3D effects)
- World Space (in-game UI)

### UI Components
- TextMeshPro for text
- Button with events
- Slider for settings
- ScrollView for lists

### UI Manager Pattern
```csharp
public class UIManager : MonoBehaviour
{
    public GameObject mainMenu;
    public GameObject gameplayHUD;
    public GameObject pauseMenu;

    public void ShowMainMenu()
    {
        mainMenu.SetActive(true);
        gameplayHUD.SetActive(false);
    }

    public void StartGame()
    {
        mainMenu.SetActive(false);
        gameplayHUD.SetActive(true);
    }
}
```

## Save System

### PlayerPrefs (Simple)
```csharp
PlayerPrefs.SetInt("HighScore", score);
int highScore = PlayerPrefs.GetInt("HighScore", 0);
PlayerPrefs.Save();
```

### JSON Serialization (Complex)
```csharp
public class SaveData
{
    public int level;
    public int score;
    public List<string> unlockedItems;
}

public class SaveSystem
{
    public static void SaveGame(SaveData data)
    {
        string json = JsonUtility.ToJson(data);
        File.WriteAllText(Application.persistentDataPath + "/save.json", json);
    }

    public static SaveData LoadGame()
    {
        string path = Application.persistentDataPath + "/save.json";
        if (File.Exists(path))
        {
            string json = File.ReadAllText(path);
            return JsonUtility.FromJson<SaveData>(json);
        }
        return new SaveData();
    }
}
```

## Performance Optimization

### Mobile Optimization
- Object pooling for frequent spawns
- Texture atlases to reduce draw calls
- LOD (Level of Detail) for 3D
- Occlusion culling
- Baked lighting
- Optimize fill rate (UI overdraw)

### Memory Management
- Unload unused assets
- Use Addressables for large games
- Profile with Memory Profiler
- Avoid memory leaks (unsubscribe events)

## Build Settings

### Android
- IL2CPP scripting backend
- ARM64 architecture
- Compression: LZ4 (faster) or LZ4HC (smaller)
- Keystore for signing

### iOS
- Target SDK: Latest
- Architecture: ARM64
- Compression: LZ4
- Automatic signing

## Testing Workflow

1. Play Mode testing in editor
2. Device testing (Android/iOS)
3. Profiler analysis
4. Memory testing
5. Build size check
6. Performance benchmarks

## Common Unity Assets (Asset Store)

### Essential
- DOTween (animation)
- Odin Inspector (better editor)
- TextMesh Pro (included)

### Game-Specific
- Puzzle: Grid framework, match-3 toolkit
- Platformer: Corgi Engine, Character Controller 2D
- Mobile: Easy Mobile, Mobile Optimization

## Recommended Project Structure

```
Assets/
├── _Project/
│   ├── Scenes/
│   ├── Scripts/
│   │   ├── Managers/
│   │   ├── Player/
│   │   ├── Enemies/
│   │   ├── UI/
│   │   └── Utilities/
│   ├── Prefabs/
│   ├── Materials/
│   ├── Audio/
│   ├── Data/ (ScriptableObjects)
│   └── UI/
├── Plugins/
└── Third Party/
```
