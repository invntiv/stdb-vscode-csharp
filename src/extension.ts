import * as vscode from 'vscode';
import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

export function activate(context: vscode.ExtensionContext) {
    console.log('SpacetimeDB extension is now active!');

    // Register commands
    const createModuleCommand = vscode.commands.registerCommand('spacetimedb.createModule', createModuleClass);
    const createTableCommand = vscode.commands.registerCommand('spacetimedb.createTable', createTable);
    const createReducerCommand = vscode.commands.registerCommand('spacetimedb.createReducer', createReducer);
    const createClientConnectionCommand = vscode.commands.registerCommand('spacetimedb.createClientConnection', createClientConnection);
    const generateBindingsCommand = vscode.commands.registerCommand('spacetimedb.generateBindings', generateBindings);

    context.subscriptions.push(
        createModuleCommand,
        createTableCommand,
        createReducerCommand,
        createClientConnectionCommand,
        generateBindingsCommand
    );

    // Register completion provider for enhanced IntelliSense
    const completionProvider = vscode.languages.registerCompletionItemProvider('csharp', {
        provideCompletionItems(document, position) {
            return getSpacetimeDBCompletions(document, position);
        }
    }, '.', '[', '(');

    context.subscriptions.push(completionProvider);

    // Register hover provider for documentation
    const hoverProvider = vscode.languages.registerHoverProvider('csharp', {
        provideHover(document, position) {
            return getSpacetimeDBHover(document, position);
        }
    });

    context.subscriptions.push(hoverProvider);

    // Watch for file changes to auto-generate bindings
    if (vscode.workspace.getConfiguration('spacetimedb').get('autoGenerateBindings')) {
        const fileWatcher = vscode.workspace.createFileSystemWatcher('**/*.cs');
        fileWatcher.onDidChange((uri) => {
            if (isSpacetimeDBModule(uri.fsPath)) {
                autoGenerateBindings();
            }
        });
        context.subscriptions.push(fileWatcher);
    }
}

// Get the correct spacetime CLI command for the current platform
function getSpacetimeCLICommand(): string {
    const config = vscode.workspace.getConfiguration('spacetimedb');
    const userPath = config.get<string>('spacetimeCliPath');
    
    if (userPath && userPath !== 'spacetime') {
        return userPath;
    }
    
    // Default platform-specific paths
    const platform = os.platform();
    switch (platform) {
        case 'win32':
            return 'spacetime.exe';
        case 'darwin':  // macOS
        case 'linux':
        default:
            return 'spacetime';
    }
}

// Cross-platform path resolution
function resolvePath(inputPath: string, workspaceRoot: string): string {
    if (path.isAbsolute(inputPath)) {
        return inputPath;
    }
    return path.resolve(workspaceRoot, inputPath);
}

// Detect if this is a Unity project
function isUnityProject(workspacePath: string): boolean {
    return fs.existsSync(path.join(workspacePath, 'Assets')) &&
           fs.existsSync(path.join(workspacePath, 'ProjectSettings'));
}

// Check if a folder contains SpacetimeDB module files
function containsSpacetimeDBModule(folderPath: string): boolean {
    try {
        const files = fs.readdirSync(folderPath);
        
        // Look for .csproj files and .cs files with SpacetimeDB attributes
        for (const file of files) {
            if (file.endsWith('.csproj')) {
                const csprojPath = path.join(folderPath, file);
                const content = fs.readFileSync(csprojPath, 'utf8');
                if (content.includes('SpacetimeDB.Runtime')) {
                    return true;
                }
            }
            
            if (file.endsWith('.cs')) {
                const csPath = path.join(folderPath, file);
                const content = fs.readFileSync(csPath, 'utf8');
                if (content.includes('SpacetimeDB') && 
                    (content.includes('[SpacetimeDB.Table]') || 
                     content.includes('[SpacetimeDB.Reducer]'))) {
                    return true;
                }
            }
        }
    } catch {
        // Ignore errors (permission issues, etc.)
    }
    return false;
}

// Find potential SpacetimeDB module folders in workspace
function findSpacetimeDBModuleFolders(workspaceRoot: string): string[] {
    const candidates: string[] = [];
    
    try {
        const entries = fs.readdirSync(workspaceRoot, { withFileTypes: true });
        
        for (const entry of entries) {
            if (entry.isDirectory() && !entry.name.startsWith('.')) {
                const folderPath = path.join(workspaceRoot, entry.name);
                if (containsSpacetimeDBModule(folderPath)) {
                    candidates.push(`./${entry.name}`);
                }
            }
        }
    } catch {
        // Ignore errors
    }
    
    return candidates;
}

// Find potential client binding output folders
function findPotentialClientFolders(workspaceRoot: string): string[] {
    const candidates: string[] = [];
    const isUnity = isUnityProject(workspaceRoot);
    
    if (isUnity) {
        // Unity-specific suggestions
        candidates.push(
            './Assets/Scripts/SpacetimeDB/module_bindings',
            './Assets/Scripts/Generated',
            './Assets/SpacetimeDB',
            './Assets/Scripts/Network'
        );
    } else {
        // General project suggestions
        candidates.push(
            './module_bindings',
            './client/bindings',
            './src/generated',
            './generated'
        );
    }
    
    return candidates;
}

// Get user preferences for paths
function getUserPreferences(): { modulePath?: string; outputPath?: string } {
    const config = vscode.workspace.getConfiguration('spacetimedb');
    return {
        modulePath: config.get<string>('lastUsedModulePath'),
        outputPath: config.get<string>('lastUsedOutputPath')
    };
}

// Save user preferences
function saveUserPreferences(modulePath: string, outputPath: string) {
    const config = vscode.workspace.getConfiguration('spacetimedb');
    config.update('lastUsedModulePath', modulePath, vscode.ConfigurationTarget.Workspace);
    config.update('lastUsedOutputPath', outputPath, vscode.ConfigurationTarget.Workspace);
}

// Get platform-appropriate default paths with user preferences
function getDefaultPaths(workspaceRoot: string) {
    const isUnity = isUnityProject(workspaceRoot);
    const preferences = getUserPreferences();
    
    return {
        modulePath: preferences.modulePath || './server',
        outputPath: preferences.outputPath || (isUnity 
            ? path.join('Assets', 'Scripts', 'SpacetimeDB', 'module_bindings')
            : 'module_bindings')
    };
}

// Enhanced path selection with multiple options
async function selectModulePath(workspaceRoot: string, defaultPath: string): Promise<string | undefined> {
    const detectedFolders = findSpacetimeDBModuleFolders(workspaceRoot);
    const preferences = getUserPreferences();
    
    // Build options list
    const options: vscode.QuickPickItem[] = [];
    
    // Add detected folders
    detectedFolders.forEach(folder => {
        options.push({
            label: folder,
            description: '🎯 Detected SpacetimeDB module',
            detail: 'Contains SpacetimeDB files'
        });
    });
    
    // Add user's last used path if different
    if (preferences.modulePath && !detectedFolders.includes(preferences.modulePath)) {
        options.push({
            label: preferences.modulePath,
            description: '🕐 Recently used',
            detail: 'Your last used module path'
        });
    }
    
    // Add default if different
    if (defaultPath && !detectedFolders.includes(defaultPath) && defaultPath !== preferences.modulePath) {
        options.push({
            label: defaultPath,
            description: '📁 Default suggestion',
            detail: 'Recommended folder structure'
        });
    }
    
    // Add browse option
    options.push({
        label: '📂 Browse for folder...',
        description: 'Select custom folder',
        detail: 'Choose any folder containing your SpacetimeDB module'
    });
    
    // Add manual entry option
    options.push({
        label: '✏️ Enter path manually...',
        description: 'Type custom path',
        detail: 'Enter relative or absolute path'
    });
    
    const selected = await vscode.window.showQuickPick(options, {
        placeHolder: 'Select SpacetimeDB module folder',
        matchOnDescription: true,
        matchOnDetail: true
    });
    
    if (!selected) return undefined;
    
    if (selected.label === '📂 Browse for folder...') {
        const result = await vscode.window.showOpenDialog({
            canSelectFiles: false,
            canSelectFolders: true,
            canSelectMany: false,
            openLabel: 'Select SpacetimeDB Module Folder',
            defaultUri: vscode.Uri.file(workspaceRoot)
        });
        
        if (result && result[0]) {
            const relativePath = path.relative(workspaceRoot, result[0].fsPath);
            return relativePath.startsWith('.') ? relativePath : `./${relativePath}`;
        }
        return undefined;
    }
    
    if (selected.label === '✏️ Enter path manually...') {
        return await vscode.window.showInputBox({
            prompt: 'Enter path to SpacetimeDB module',
            value: defaultPath,
            validateInput: (value) => {
                if (!value) return 'Path is required';
                return null;
            }
        });
    }
    
    return selected.label;
}

// Enhanced output path selection
async function selectOutputPath(workspaceRoot: string, defaultPath: string): Promise<string | undefined> {
    const potentialFolders = findPotentialClientFolders(workspaceRoot);
    const preferences = getUserPreferences();
    
    // Build options list
    const options: vscode.QuickPickItem[] = [];
    
    // Add user's last used path first
    if (preferences.outputPath) {
        options.push({
            label: preferences.outputPath,
            description: '🕐 Recently used',
            detail: 'Your last used output path'
        });
    }
    
    // Add potential folders
    potentialFolders.forEach(folder => {
        if (folder !== preferences.outputPath) {
            const isUnity = folder.includes('Assets');
            options.push({
                label: folder,
                description: isUnity ? '🎮 Unity suggestion' : '📁 Suggested path',
                detail: isUnity ? 'Unity Assets folder structure' : 'Common client bindings location'
            });
        }
    });
    
    // Add browse option
    options.push({
        label: '📂 Browse for folder...',
        description: 'Select custom folder',
        detail: 'Choose where to generate client bindings'
    });
    
    // Add manual entry option
    options.push({
        label: '✏️ Enter path manually...',
        description: 'Type custom path',
        detail: 'Enter relative or absolute path'
    });
    
    const selected = await vscode.window.showQuickPick(options, {
        placeHolder: 'Select output directory for client bindings',
        matchOnDescription: true,
        matchOnDetail: true
    });
    
    if (!selected) return undefined;
    
    if (selected.label === '📂 Browse for folder...') {
        const result = await vscode.window.showOpenDialog({
            canSelectFiles: false,
            canSelectFolders: true,
            canSelectMany: false,
            openLabel: 'Select Output Folder for Client Bindings',
            defaultUri: vscode.Uri.file(workspaceRoot)
        });
        
        if (result && result[0]) {
            const relativePath = path.relative(workspaceRoot, result[0].fsPath);
            return relativePath.startsWith('.') ? relativePath : `./${relativePath}`;
        }
        return undefined;
    }
    
    if (selected.label === '✏️ Enter path manually...') {
        return await vscode.window.showInputBox({
            prompt: 'Enter output directory for bindings',
            value: defaultPath,
            validateInput: (value) => {
                if (!value) return 'Path is required';
                return null;
            }
        });
    }
    
    return selected.label;
}

async function createModuleClass() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage('No active editor found');
        return;
    }

    const moduleTemplate = `using SpacetimeDB;

public static partial class Module
{
    [SpacetimeDB.Reducer(ReducerKind.Init)]
    public static void Init(ReducerContext ctx)
    {
        Log.Info("Module initialized");
    }

    [SpacetimeDB.Reducer(ReducerKind.ClientConnected)]
    public static void ClientConnected(ReducerContext ctx)
    {
        Log.Info($"Client connected: {ctx.Sender}");
    }

    [SpacetimeDB.Reducer(ReducerKind.ClientDisconnected)]
    public static void ClientDisconnected(ReducerContext ctx)
    {
        Log.Info($"Client disconnected: {ctx.Sender}");
    }
}`;

    await editor.edit(editBuilder => {
        editBuilder.insert(editor.selection.start, moduleTemplate);
    });
}

async function createTable() {
    const tableName = await vscode.window.showInputBox({
        prompt: 'Enter table name (e.g., Player)',
        validateInput: (value) => {
            if (!value) {
                return 'Table name is required';
            }
            if (!/^[A-Z][a-zA-Z0-9]*$/.test(value)) {
                return 'Table name must be PascalCase and start with a capital letter';
            }
            return null;
        }
    });

    if (!tableName) return;

    const isPublic = await vscode.window.showQuickPick(['Yes', 'No'], {
        placeHolder: 'Should this table be public (readable by clients)?'
    });

    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage('No active editor found');
        return;
    }

    const publicAttribute = isPublic === 'Yes' ? ', Public = true' : '';
    const tableTemplate = `[SpacetimeDB.Table(Name = "${tableName.toLowerCase()}"${publicAttribute})]
public partial struct ${tableName}
{
    [SpacetimeDB.PrimaryKey]
    [SpacetimeDB.AutoInc]
    public uint Id;
    
    // Add your fields here
}`;

    await editor.edit(editBuilder => {
        editBuilder.insert(editor.selection.start, tableTemplate);
    });
}

async function createReducer() {
    const reducerName = await vscode.window.showInputBox({
        prompt: 'Enter reducer name (e.g., CreatePlayer)',
        validateInput: (value) => {
            if (!value) {
                return 'Reducer name is required';
            }
            if (!/^[A-Z][a-zA-Z0-9]*$/.test(value)) {
                return 'Reducer name must be PascalCase and start with a capital letter';
            }
            return null;
        }
    });

    if (!reducerName) return;

    const reducerType = await vscode.window.showQuickPick([
        'Regular Reducer',
        'Init Reducer',
        'ClientConnected Reducer',
        'ClientDisconnected Reducer',
        'Scheduled Reducer'
    ], {
        placeHolder: 'Select reducer type'
    });

    if (!reducerType) return;

    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage('No active editor found');
        return;
    }

    let template = '';
    switch (reducerType) {
        case 'Init Reducer':
            template = `[SpacetimeDB.Reducer(ReducerKind.Init)]
public static void ${reducerName}(ReducerContext ctx)
{
    // Initialize your module here
}`;
            break;
        case 'ClientConnected Reducer':
            template = `[SpacetimeDB.Reducer(ReducerKind.ClientConnected)]
public static void ${reducerName}(ReducerContext ctx)
{
    // Handle client connection
    // Client identity: ctx.Sender
}`;
            break;
        case 'ClientDisconnected Reducer':
            template = `[SpacetimeDB.Reducer(ReducerKind.ClientDisconnected)]
public static void ${reducerName}(ReducerContext ctx)
{
    // Handle client disconnection
    // Client identity: ctx.Sender
}`;
            break;
        case 'Scheduled Reducer':
            template = `[SpacetimeDB.Reducer]
public static void ${reducerName}(ReducerContext ctx, YourScheduleType schedule)
{
    // Restrict to scheduler only (optional)
    if (ctx.Sender != ctx.Identity)
    {
        throw new Exception("This reducer may only be invoked via scheduling.");
    }
    
    // Your scheduled logic here
}`;
            break;
        default:
            template = `[SpacetimeDB.Reducer]
public static void ${reducerName}(ReducerContext ctx)
{
    // Your reducer logic here
}`;
    }

    await editor.edit(editBuilder => {
        editBuilder.insert(editor.selection.start, template);
    });
}

async function createClientConnection() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage('No active editor found');
        return;
    }

    const uri = await vscode.window.showInputBox({
        prompt: 'Enter SpacetimeDB URI',
        value: 'ws://localhost:3000'
    });

    const moduleName = await vscode.window.showInputBox({
        prompt: 'Enter database/module name'
    });

    if (!uri || !moduleName) return;

    const connectionTemplate = `var connection = DbConnection.Builder()
    .WithUri(new Uri("${uri}"))
    .WithModuleName("${moduleName}")
    .OnConnect((conn, identity, token) =>
    {
        Console.WriteLine($"Connected with identity: {identity}");
        // Setup subscriptions and callbacks here
    })
    .OnConnectError((ctx, error) =>
    {
        Console.WriteLine($"Connection error: {error}");
    })
    .OnDisconnect((ctx, error) =>
    {
        Console.WriteLine($"Disconnected: {error}");
    })
    .Build();

// Subscribe to all tables
connection.SubscriptionBuilder()
    .OnApplied((ctx) =>
    {
        Console.WriteLine("Subscription applied");
        // Setup row callbacks here
    })
    .SubscribeToAllTables();`;

    await editor.edit(editBuilder => {
        editBuilder.insert(editor.selection.start, connectionTemplate);
    });
}

async function generateBindings() {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        vscode.window.showErrorMessage('No workspace folder found');
        return;
    }

    const workspaceRoot = workspaceFolder.uri.fsPath;
    const defaults = getDefaultPaths(workspaceRoot);
    
    // Enhanced path selection with smart suggestions
    const modulePath = await selectModulePath(workspaceRoot, defaults.modulePath);
    if (!modulePath) return; // User cancelled
    
    const outputPath = await selectOutputPath(workspaceRoot, defaults.outputPath);
    if (!outputPath) return; // User cancelled

    // Save user preferences for next time
    saveUserPreferences(modulePath, outputPath);

    const fullModulePath = resolvePath(modulePath, workspaceRoot);
    const fullOutputPath = resolvePath(outputPath, workspaceRoot);

    // Validate module path exists
    if (!fs.existsSync(fullModulePath)) {
        const create = await vscode.window.showWarningMessage(
            `Module path "${modulePath}" doesn't exist. Create it?`,
            'Yes', 'No'
        );
        if (create === 'Yes') {
            fs.mkdirSync(fullModulePath, { recursive: true });
        } else {
            return;
        }
    }

    // Create output directory if it doesn't exist
    if (!fs.existsSync(fullOutputPath)) {
        fs.mkdirSync(fullOutputPath, { recursive: true });
    }

    const spacetimeCmd = getSpacetimeCLICommand();
    const args = [
        'generate',
        '--lang', 'cs',
        '--out-dir', fullOutputPath,
        '--project-path', fullModulePath
    ];

    vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'Generating SpacetimeDB bindings...',
        cancellable: false
    }, async () => {
        return new Promise<void>((resolve, reject) => {
            // Use spawn instead of exec for better cross-platform support
            const process = spawn(spacetimeCmd, args, { 
                cwd: workspaceRoot,
                shell: true,  // Important for Windows
                stdio: ['pipe', 'pipe', 'pipe']
            });

            let stdout = '';
            let stderr = '';

            process.stdout?.on('data', (data) => {
                stdout += data.toString();
            });

            process.stderr?.on('data', (data) => {
                stderr += data.toString();
            });

            process.on('close', (code) => {
                if (code === 0) {
                    vscode.window.showInformationMessage(
                        `SpacetimeDB bindings generated successfully!\nModule: ${modulePath}\nOutput: ${outputPath}`
                    );
                    console.log('stdout:', stdout);
                    resolve();
                } else {
                    const errorMsg = `Failed to generate bindings (exit code ${code}): ${stderr || stdout}`;
                    vscode.window.showErrorMessage(errorMsg);
                    console.error('Error:', errorMsg);
                    reject(new Error(errorMsg));
                }
            });

            process.on('error', (error) => {
                const errorMsg = `Failed to execute spacetime command: ${error.message}`;
                vscode.window.showErrorMessage(errorMsg);
                console.error('Process error:', error);
                reject(error);
            });
        });
    });
}

function getSpacetimeDBCompletions(document: vscode.TextDocument, position: vscode.Position): vscode.CompletionItem[] {
    const line = document.lineAt(position);
    const lineText = line.text;

    const completions: vscode.CompletionItem[] = [];

    // Suggest SpacetimeDB attributes
    if (lineText.includes('[')) {
        const attributes = [
            {
                label: 'SpacetimeDB.Table',
                insertText: new vscode.SnippetString('SpacetimeDB.Table(Name = "${1:table_name}", Public = ${2|true,false|})'),
                documentation: 'Marks a struct as a SpacetimeDB table'
            },
            {
                label: 'SpacetimeDB.Reducer',
                insertText: new vscode.SnippetString('SpacetimeDB.Reducer'),
                documentation: 'Marks a function as a SpacetimeDB reducer'
            },
            {
                label: 'SpacetimeDB.PrimaryKey',
                insertText: new vscode.SnippetString('SpacetimeDB.PrimaryKey'),
                documentation: 'Marks a field as the primary key'
            },
            {
                label: 'SpacetimeDB.Unique',
                insertText: new vscode.SnippetString('SpacetimeDB.Unique'),
                documentation: 'Marks a field as unique'
            },
            {
                label: 'SpacetimeDB.AutoInc',
                insertText: new vscode.SnippetString('SpacetimeDB.AutoInc'),
                documentation: 'Marks a field as auto-incrementing'
            },
            {
                label: 'SpacetimeDB.Index.BTree',
                insertText: new vscode.SnippetString('SpacetimeDB.Index.BTree${1:(Name = "${2:IndexName}")}'),
                documentation: 'Creates a B-Tree index on the field'
            },
            {
                label: 'SpacetimeDB.Type',
                insertText: new vscode.SnippetString('SpacetimeDB.Type'),
                documentation: 'Marks a type as usable in SpacetimeDB'
            }
        ];

        attributes.forEach(attr => {
            const item = new vscode.CompletionItem(attr.label, vscode.CompletionItemKind.Class);
            item.insertText = attr.insertText;
            item.documentation = new vscode.MarkdownString(attr.documentation);
            completions.push(item);
        });
    }

    // Suggest ctx.Db completions
    if (lineText.includes('ctx.Db.')) {
        const dbMethods = [
            {
                label: 'Insert',
                insertText: new vscode.SnippetString('Insert(new ${1:TableType} { ${2:Field} = ${3:value} })'),
                documentation: 'Insert a new row into the table'
            },
            {
                label: 'Find',
                insertText: new vscode.SnippetString('Find(${1:key})'),
                documentation: 'Find a row by unique field value'
            },
            {
                label: 'Update',
                insertText: new vscode.SnippetString('Update(${1:row})'),
                documentation: 'Update an existing row'
            },
            {
                label: 'Delete',
                insertText: new vscode.SnippetString('Delete(${1:key})'),
                documentation: 'Delete a row by unique field value'
            },
            {
                label: 'Iter',
                insertText: new vscode.SnippetString('Iter()'),
                documentation: 'Iterate over all rows in the table'
            },
            {
                label: 'Filter',
                insertText: new vscode.SnippetString('Filter(${1:value})'),
                documentation: 'Filter rows by index value'
            }
        ];

        dbMethods.forEach(method => {
            const item = new vscode.CompletionItem(method.label, vscode.CompletionItemKind.Method);
            item.insertText = method.insertText;
            item.documentation = new vscode.MarkdownString(method.documentation);
            completions.push(item);
        });
    }

    // Suggest Log methods
    if (lineText.includes('Log.')) {
        const logMethods = ['Info', 'Error', 'Debug', 'Warn', 'Trace'].map(level => {
            const item = new vscode.CompletionItem(`${level}`, vscode.CompletionItemKind.Method);
            item.insertText = new vscode.SnippetString(`${level}($\{1:"${level.toLowerCase()} message"})`);
            item.documentation = new vscode.MarkdownString(`Log a ${level.toLowerCase()} message`);
            return item;
        });
        
        completions.push(...logMethods);
    }

    return completions;
}

function getSpacetimeDBHover(document: vscode.TextDocument, position: vscode.Position): vscode.Hover | undefined {
    const range = document.getWordRangeAtPosition(position);
    if (!range) return undefined;

    const word = document.getText(range);
    
    const hoverInfo: { [key: string]: string } = {
        'ReducerContext': 'Context object provided to all reducers, containing database access and caller information',
        'SpacetimeDB': 'Core namespace for SpacetimeDB attributes and types',
        'Identity': 'Unique identifier for a user across all connections',
        'ConnectionId': 'Unique identifier for a specific client connection',
        'Timestamp': 'Point in time measured in microseconds since Unix epoch',
        'TimeDuration': 'Duration between two timestamps',
        'ScheduleAt': 'Specifies when a scheduled reducer should execute',
        'TaggedEnum': 'Union type that can hold one of several different types',
        'Log': 'Utility class for logging messages from reducers'
    };

    if (hoverInfo[word]) {
        return new vscode.Hover(new vscode.MarkdownString(hoverInfo[word]));
    }

    return undefined;
}

function isSpacetimeDBModule(filePath: string): boolean {
    // Simple heuristic: check if file contains SpacetimeDB imports or attributes
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        return content.includes('SpacetimeDB') && 
               (content.includes('[SpacetimeDB.Table]') || 
                content.includes('[SpacetimeDB.Reducer]'));
    } catch {
        return false;
    }
}

function autoGenerateBindings() {
    const config = vscode.workspace.getConfiguration('spacetimedb');
    if (!config.get('autoGenerateBindings')) return;

    // Debounce auto-generation to avoid excessive calls
    setTimeout(() => {
        generateBindings();
    }, 2000);
}

export function deactivate() {
    console.log('SpacetimeDB extension deactivated');
}