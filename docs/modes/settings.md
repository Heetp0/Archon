# Settings Mode

## 1. Overview
The Settings Mode provides global configuration and security sandbox management. It allows users to connect AI providers (Gemini, Groq, OpenRouter), add custom proxy providers, configure Daemon WebSocket network settings, manage MCP (Model Context Protocol) servers, and assign default models for specific system roles (Chat, Council Proposer, Critic, Expert). It also houses the Project context file manager.

## 2. Architecture & Data Flow

```mermaid
graph TD
    A[SettingsModal React] -->|Read/Write| B[LocalStorage]
    A -->|Push Keys| C[POST /settings/api-keys]
    C --> D[Archon Daemon .env file]
    A -->|Test Keys| E[POST /settings/api-keys/test]
    
    F[SettingsScreen Android] -->|Save URL| G[BackendConfigStore / DataStore]
    F -->|Test Ping| H[ArchonApiClient.health()]
```

## 3. Key API Endpoints & WebSocket Messages
- **`POST /settings/api-keys/test`**: Validates an API key against a provider's endpoint before saving.
- **`POST /settings/api-keys`**: Pushes local storage keys to the backend Daemon to update the `.env` configuration securely.
- **`ArchonApiClient.health()` (Android)**: Pings the configured backend URL to update connection status visually.

## 4. Data Models / Database Schema
**Frontend Types:**
- `Provider`: `value`, `label`, `desc`, `tag`, `color`, `letter` (Built-in integrations)
- `CustomProvider`: `id`, `name`, `baseUrl`, `apiKey`
- `McpServer`: `id`, `name`, `url`, `description`, `enabled`, `connected`
- `Project`: `id`, `name`, `kind` (light vs agent), `folderPath`, `contextFiles`, `agentSettings`
- `ContextFile`: `id`, `name`, `kind` (image, pdf, text, other)

**Android Types:**
- `SettingsCategory`: Enum for BACKEND, MODEL, AGENTS, SYNC, ABOUT.
- `AgentStub`: `name`, `description`, `roles`, `enabled`

## 5. UI Component Tree
- `SettingsModal` (Framer Motion AnimatePresence Dialog)
  - `Sidebar Navigation` (Tabs: Providers, Models, Parameters, Network, MCP, Projects)
  - `ProvidersTab`
    - `ConnectedRow`
    - `AvailableRow` (Includes Inline Key Input & Test Button)
    - `AddCustomProviderForm`
  - `McpTab` (Server listing and Preset injector)
  - `ProjectsTab` -> `ProjectDetailView` (Manage folders, Context Files, Agent Sandbox permissions)

## 6. Android Implementation
Implemented in `SettingsScreen.kt` using a customized Dialog with a Master-Detail layout for larger screens:
- **Backend Section**: Input for the Backend URL with a `BackendConfigStore` and a "Test Connection" ping.
- **Model Configuration**: Dropdown selection for models, token limits, and a Slider for Temperature configuration.
- **Agents Directory**: List view of `AgentStub` cards detailing system agents and their roles (e.g., OCR Trainer, Council Moderator).
- **Sync & Storage**: Syncthing status indicator and local SQLite Database page count stats.

## 7. Known Issues / Open TODOs
- **Security Storage**: Frontend currently saves API keys in `localStorage`. Should transition to encrypted local storage or exclusively daemon-side credential management.
- **MCP Auto-Discovery**: Currently, MCP servers must be manually added via URL. Needs auto-discovery protocols.
- **Android Settings Parity**: Android settings screen is mostly a UI shell; needs deep integration with the backend preferences API.
