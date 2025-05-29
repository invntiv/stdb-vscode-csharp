# Change Log

All notable changes to the SpacetimeDB C# extension will be documented in this file.

## [1.1.0] - 2024-12-29
### Added

- 🎯 **Smart Folder Detection & Suggestions**
  - Auto-detects SpacetimeDB modules by scanning for .csproj files with SpacetimeDB.Runtime
  - Finds C# files containing [SpacetimeDB.Table] or [SpacetimeDB.Reducer] attributes
  - Intelligent suggestions prioritize detected modules over generic defaults


- 📂 **Visual Folder Browser Integration**
  - Click "Browse for folder..." to open native OS folder picker dialogs
  - Visual folder selection instead of manual path typing
  - Automatic conversion to workspace-relative paths


 - 🧠 **User Preferences Memory System**
  - Automatically saves your last used module and output paths per workspace
  - Smart defaults prioritize your recent choices over generic defaults
  - Workspace-specific settings prevent conflicts between different projects


- 🎮 **Enhanced Unity Project Support**
  - Improved Unity project detection algorithm
  - Unity-specific path suggestions when Unity project detected
  - Smart defaults for Unity Assets folder structure


- 🌍 **Cross-Platform Compatibility Improvements**
  - Enhanced command execution for Windows, macOS, and Linux
  - Platform-specific CLI command detection (spacetime.exe vs spacetime)
  - Robust path handling across different operating systems
  - Better error messages with platform-specific troubleshooting



### Enhanced

- **Generate Bindings Command** - Now features intuitive multi-option picker with:
  - 🕐 Recently used paths (from your preferences)
  - 🎯 Auto-detected SpacetimeDB module folders
  - 🎮 Unity-specific suggestions (when applicable)
  - 📁 Common folder structure suggestions
  - 📂 Visual folder browser option
  - ✏️ Manual path entry fallback


- **User Experience Flow** - Streamlined workflow reduces repetitive path entry
- **Error Handling** - Better validation and user-friendly error messages
- **Configuration Options** - Added settings for storing user preferences

### Technical Improvements

- **Process Management** - Switched from exec() to spawn() for better cross-platform CLI execution
- **Path Resolution** - Enhanced cross-platform path handling with Node.js path module
- **File System Operations** - More robust directory creation and validation
- **Code Organization** - Cleaned up duplicate functions and improved maintainability





## [1.0.0] - 2024-05-25

### Added
- 🚀 Initial release of SpacetimeDB C# Support extension
- 📝 **55+ Code Snippets**
  - 30+ server-side snippets for modules, tables, reducers, and database operations
  - 25+ client-side snippets for connections, subscriptions, Unity integration
- 🧠 **IntelliSense Features**
  - Smart auto-completion for SpacetimeDB attributes and APIs
  - Hover documentation for SpacetimeDB types and methods
  - Context-aware suggestions for database operations
- 🔧 **Code Generation Tools**
  - Interactive commands for creating modules, tables, and reducers
  - Auto-generation of client bindings from modules
  - File watching for automatic binding updates
- 🎮 **Unity Integration**
  - Specialized MonoBehaviour templates
  - Unity-specific patterns (Debug.Log, PlayerPrefs, etc.)
  - Game loop integration with FrameTick()
- 🏗️ **Game Systems Starters**
  - Multiplayer game templates
  - Real-time chat system
  - Leaderboard management
  - Inventory system
  - Team/Guild management
  - Notification system
  - Error handling patterns
- ⚙️ **Configuration Options**
  - Configurable SpacetimeDB CLI path
  - Auto-binding generation settings
  - Default module and client paths

### Features
- **Server-Side Development**: Complete templates for SpacetimeDB modules
- **Client-Side Development**: Full client integration patterns
- **Unity Support**: First-class Unity game development support
- **Production Ready**: Error handling, reconnection, and state management
- **Developer Experience**: Comprehensive snippets and intelligent code completion