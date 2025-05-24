# SpacetimeDB C# Extension for VS Code

A comprehensive Visual Studio Code extension that provides rich language support, snippets, and tooling for SpacetimeDB C# development - both server-side modules and client-side applications.

## Features

### 🚀 **Rich Code Snippets**
- **Server-side (Modules)**: Quick templates for tables, reducers, indexes, and more
- **Client-side (SDK)**: Connection setup, subscriptions, callbacks, and Unity integration
- **Game Templates**: Complete starter templates for multiplayer games

### 🧠 **IntelliSense & Auto-completion**
- Smart completions for SpacetimeDB attributes and APIs
- Context-aware suggestions for database operations
- Hover documentation for SpacetimeDB types and methods

### 🔧 **Code Generation Tools**
- Generate complete module classes with lifecycle reducers
- Create tables with proper attributes and constraints
- Build client connections with subscription management
- Auto-generate client bindings from modules

### ⚡ **Developer Productivity**
- File watching for automatic binding generation
- Command palette integration
- Unity MonoBehaviour templates
- Error prevention with validation

## Quick Start

### Server-Side Development

1. **Create a Module Class**: `Ctrl+Shift+P` → "Create SpacetimeDB Module Class"
   ```csharp
   // Creates a complete module with lifecycle reducers
   public static partial class Module { ... }
   ```

2. **Add Tables**: Use snippet `stdb-table`
   ```csharp
   [SpacetimeDB.Table(Name = "player", Public = true)]
   public partial struct Player
   {
       [SpacetimeDB.PrimaryKey]
       [SpacetimeDB.AutoInc]
       public uint Id;
       
       [SpacetimeDB.Unique]
       public string Name;
   }
   ```

3. **Create Reducers**: Use snippet `stdb-reducer`
   ```csharp
   [SpacetimeDB.Reducer]
   public static void CreatePlayer(ReducerContext ctx, string name)
   {
       ctx.Db.player.Insert(new Player { Name = name });
   }
   ```

### Client-Side Development

1. **Setup Connection**: Use snippet `stdb-connection`
   ```csharp
   var connection = DbConnection.Builder()
       .WithUri(new Uri("ws://localhost:3000"))
       .WithModuleName("your_game")
       .OnConnect((conn, identity, token) => { ... })
       .Build();
   ```

2. **Subscribe to Data**: Use snippet `stdb-subscribe-all`
   ```csharp
   connection.SubscriptionBuilder()
       .OnApplied(ctx => Console.WriteLine("Connected!"))
       .SubscribeToAllTables();
   ```

3. **Handle Events**: Use snippet `stdb-callbacks`
   ```csharp
   connection.Db.Player.OnInsert += (ctx, player) =>
   {
       Console.WriteLine($"Player joined: {player.Name}");
   };
   ```

## Snippet Reference

### Server-Side Snippets

| Snippet | Trigger | Description |
|---------|---------|-------------|
| `stdb-module` | Module class | Creates basic SpacetimeDB module |
| `stdb-table` | Table definition | Creates table with primary key |
| `stdb-reducer` | Reducer function | Creates basic reducer |
| `stdb-init` | Init reducer | Creates module initialization reducer |
| `stdb-client-connected` | Connection handler | Handles client connections |
| `stdb-scheduled-table` | Scheduled table | Creates table for scheduled reducers |
| `stdb-index` | BTree index | Adds index to field |
| `stdb-unique` | Unique constraint | Adds unique constraint |
| `stdb-tagged-enum` | Tagged enum | Creates union type |
| `stdb-insert` | Insert row | Inserts data into table |
| `stdb-find` | Find row | Finds row by unique field |
| `stdb-filter` | Filter rows | Filters by index |
| `stdb-game-template` | Complete game | Full multiplayer game template |

### Client-Side Snippets

| Snippet | Trigger | Description |
|---------|---------|-------------|
| `stdb-connection` | DB connection | Creates SpacetimeDB connection |
| `stdb-subscribe-all` | Subscribe all | Subscribes to all tables |
| `stdb-subscribe` | Custom subscription | Subscribes to specific queries |
| `stdb-callbacks` | Row callbacks | Sets up table event handlers |
| `stdb-reducer-callback` | Reducer events | Handles reducer completion |
| `stdb-call-reducer` | Call reducer | Invokes server reducer |
| `stdb-unity-mono` | Unity component | MonoBehaviour with SpacetimeDB |
| `stdb-unity-update` | Unity update | Update method with FrameTick |
| `stdb-game-client` | Game client | Complete client template |
| `stdb-connection-token` | Auth connection | Connection with authentication |

## Commands

Access these via `Ctrl+Shift+P`:

- **Create SpacetimeDB Module Class**: Generate a complete module template
- **Create SpacetimeDB Table**: Interactive table creation
- **Create SpacetimeDB Reducer**: Interactive reducer creation  
- **Create SpacetimeDB Client Connection**: Generate client connection code
- **Generate SpacetimeDB Client Bindings**: Auto-generate client bindings

## Configuration

Configure the extension in VS Code settings:

```json
{
    "spacetimedb.spacetimeCliPath": "spacetime",
    "spacetimedb.autoGenerateBindings": true,
    "spacetimedb.defaultModulePath": "./server",
    "spacetimedb.defaultClientPath": "./client"
}
```

## Unity Integration

The extension provides special support for Unity development:

### Unity MonoBehaviour Template
Use `stdb-unity-mono` to create a complete Unity component:

```csharp
public class GameManager : MonoBehaviour
{
    private DbConnection connection;
    
    void Start()
    {
        // Connection setup with Unity-specific callbacks
    }
    
    void Update()
    {
        connection?.FrameTick(); // Process SpacetimeDB messages
    }
}
```

### Unity-Specific Features
- PlayerPrefs integration for token storage
- Debug.Log instead of Console.WriteLine
- Proper Unity lifecycle management
- MonoBehaviour-ready templates

## Best Practices

### Server-Side
- Always use `partial` keyword for tables and module classes
- Mark tables as `Public = true` only when clients need direct access
- Use meaningful names for tables and reducers
- Implement proper error handling in reducers
- Use lifecycle reducers for initialization and cleanup

### Client-Side
- Always call `FrameTick()` regularly to process messages
- Set up subscriptions before expecting data
- Handle connection errors gracefully
- Use row callbacks for real-time updates
- Store authentication tokens for reconnection
- Unsubscribe when no longer needed to save bandwidth

### Performance Tips
- Use indexes for frequently queried fields
- Filter subscriptions to only needed data
- Batch reducer calls when possible
- Use scheduled reducers for background tasks
- Monitor connection status and reconnect as needed

## Example: Complete Multiplayer Game

Here's a complete example showing both server and client code for a simple multiplayer game:

### Server Module (`Module.cs`)
```csharp
using SpacetimeDB;

public static partial class Module
{
    [SpacetimeDB.Table(Name = "player", Public = true)]
    public partial struct Player
    {
        [SpacetimeDB.PrimaryKey]
        public Identity UserId;
        
        [SpacetimeDB.Unique]
        public string Name;
        
        public float X;
        public float Y;
        public int Score;
    }

    [SpacetimeDB.Reducer(ReducerKind.Init)]
    public static void Init(ReducerContext ctx)
    {
        Log.Info("Game server initialized");
    }

    [SpacetimeDB.Reducer]
    public static void JoinGame(ReducerContext ctx, string playerName)
    {
        var existingPlayer = ctx.Db.player.UserId.Find(ctx.Sender);
        if (existingPlayer == null)
        {
            ctx.Db.player.Insert(new Player
            {
                UserId = ctx.Sender,
                Name = playerName,
                X = 0,
                Y = 0,
                Score = 0
            });
            Log.Info($"Player {playerName} joined the game");
        }
    }

    [SpacetimeDB.Reducer]
    public static void MovePlayer(ReducerContext ctx, float x, float y)
    {
        var player = ctx.Db.player.UserId.Find(ctx.Sender);
        if (player != null)
        {
            var updated = player.Value;
            updated.X = x;
            updated.Y = y;
            ctx.Db.player.UserId.Update(updated);
        }
    }
}
```

### Unity Client (`GameClient.cs`)
```csharp
using UnityEngine;
using SpacetimeDB;
using System.Collections.Generic;

public class GameClient : MonoBehaviour
{
    [SerializeField] private string serverUri = "ws://localhost:3000";
    [SerializeField] private string databaseName = "multiplayer_game";
    
    private DbConnection connection;
    private Dictionary<Identity, GameObject> playerObjects = new();
    
    void Start()
    {
        ConnectToServer();
    }
    
    void ConnectToServer()
    {
        connection = DbConnection.Builder()
            .WithUri(new System.Uri(serverUri))
            .WithModuleName(databaseName)
            .OnConnect((conn, identity, token) =>
            {
                Debug.Log($"Connected with identity: {identity}");
                PlayerPrefs.SetString("SpacetimeToken", token);
                SetupSubscriptions();
            })
            .OnConnectError((ctx, error) =>
            {
                Debug.LogError($"Connection failed: {error}");
            })
            .OnDisconnect((ctx, error) =>
            {
                Debug.Log($"Disconnected: {error}");
            })
            .Build();
    }
    
    void SetupSubscriptions()
    {
        connection.SubscriptionBuilder()
            .OnApplied(ctx =>
            {
                Debug.Log("Subscribed to game data");
                SetupPlayerCallbacks();
            })
            .SubscribeToAllTables();
    }
    
    void SetupPlayerCallbacks()
    {
        connection.Db.Player.OnInsert += (ctx, player) =>
        {
            Debug.Log($"Player joined: {player.Name}");
            CreatePlayerObject(player);
        };
        
        connection.Db.Player.OnUpdate += (ctx, player) =>
        {
            UpdatePlayerObject(player);
        };
        
        connection.Db.Player.OnDelete += (ctx, player) =>
        {
            Debug.Log($"Player left: {player.Name}");
            RemovePlayerObject(player.UserId);
        };
    }
    
    void CreatePlayerObject(Player player)
    {
        if (!playerObjects.ContainsKey(player.UserId))
        {
            GameObject playerObj = GameObject.CreatePrimitive(PrimitiveType.Cube);
            playerObj.name = player.Name;
            playerObj.transform.position = new Vector3(player.X, 0, player.Y);
            playerObjects[player.UserId] = playerObj;
        }
    }
    
    void UpdatePlayerObject(Player player)
    {
        if (playerObjects.TryGetValue(player.UserId, out GameObject playerObj))
        {
            playerObj.transform.position = new Vector3(player.X, 0, player.Y);
        }
    }
    
    void RemovePlayerObject(Identity userId)
    {
        if (playerObjects.TryGetValue(userId, out GameObject playerObj))
        {
            Destroy(playerObj);
            playerObjects.Remove(userId);
        }
    }
    
    void Update()
    {
        connection?.FrameTick();
        
        // Handle input
        if (Input.GetKey(KeyCode.W)) MovePlayer(0, 1);
        if (Input.GetKey(KeyCode.S)) MovePlayer(0, -1);
        if (Input.GetKey(KeyCode.A)) MovePlayer(-1, 0);
        if (Input.GetKey(KeyCode.D)) MovePlayer(1, 0);
    }
    
    void MovePlayer(float deltaX, float deltaY)
    {
        connection?.Reducers.MovePlayer(deltaX * Time.deltaTime * 5f, deltaY * Time.deltaTime * 5f);
    }
    
    public void JoinGame(string playerName)
    {
        connection?.Reducers.JoinGame(playerName);
    }
    
    void OnDestroy()
    {
        connection?.Disconnect();
    }
}
```

## Troubleshooting

### Common Issues

**1. "spacetime command not found"**
- Install the SpacetimeDB CLI: Follow the [SpacetimeDB installation guide](https://spacetimedb.com/install)
- Update the `spacetimedb.spacetimeCliPath` setting to the correct path

**2. Bindings generation fails**
- Ensure your module compiles successfully first
- Check that the module path is correct
- Verify the spacetime CLI is accessible

**3. Connection issues**
- Verify the SpacetimeDB server is running
- Check the URI format (should start with `ws://` or `wss://`)
- Ensure the database name matches your published module

**4. IntelliSense not working**
- Restart VS Code after installing the extension
- Ensure you're working in a C# file (.cs extension)
- Check that the C# extension is also installed

### Getting Help

- [SpacetimeDB Documentation](https://spacetimedb.com/docs)
- [SpacetimeDB Discord Community](https://discord.gg/spacetimedb)
- [GitHub Issues](https://github.com/clockworklabs/SpacetimeDB/issues)

## Contributing

This extension is open source! Contributions are welcome:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

### Development Setup

```bash
git clone <repository-url>
cd spacetimedb-vscode-extension
npm install
code .
```

Press `F5` to launch a new Extension Development Host window for testing.

## Changelog

### 1.0.0
- Initial release
- Complete snippet library for server and client
- IntelliSense and hover documentation
- Code generation commands
- Unity integration support
- Auto-binding generation

## License

This project is licensed under the MIT License - see the LICENSE file for details.

---

**Happy coding with SpacetimeDB! 🚀**

*Transform your multiplayer game development with the power of database-as-a-server architecture.*