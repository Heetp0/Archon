# The Core

The Core is a local AI Operating System and Command Center. It features a beautiful Obsidian/Zinc aesthetic frontend built in CustomTkinter, powered by a high-performance FastAPI and WebSocket backend.

## Features
- **Standalone GUI**: Dark-mode native interface with custom aesthetic (Deep Obsidian & Zinc panels).
- **FastAPI Backend**: A background daemon that hosts the core routing, models, and agents.
- **Deep Research (Second Brain)**: Native integration with LanceDB (Vector Database) for persistent memory and knowledge graphing.
- **Multi-Agent Architecture**: Includes a Chat Agent, Council Debate system, and System Diagnostics agents.
- **Local WebSocket Integration**: Real-time token streaming and UI updates.

## Architecture
The repository is split into two main sections:
1. `Codes/gui/`: The CustomTkinter frontend interface.
2. `daemon/`: The Python backend, containing the agents, semantic cache, and FastAPI router.

## Setup & Installation

1. **Clone the repository**
2. **Setup the Virtual Environment**:
   It is recommended to run the system in a virtual environment to manage heavy AI dependencies.
   ```bash
   cd daemon
   python -m venv .venv
   .venv\Scripts\activate
   pip install -r requirements.txt
   ```
3. **Set your API Keys**:
   Create a `.env` file in the root directory with your model API keys (e.g., `GEMINI_API_KEY`, `GROQ_API_KEY`, `OPENROUTER_API_KEY`).

## Running Natively
To run the OS natively from the source code, execute the main application file from the project root using your virtual environment:

```powershell
daemon\.venv\Scripts\python.exe Codes\gui\app.py
```

## Compiling to an Executable
You can compile the entire application into a standalone Windows executable (`.exe`) using PyInstaller:

```powershell
daemon\.venv\Scripts\pyinstaller.exe --noconfirm --onedir --windowed --name Archon --paths "Codes\gui" --paths "daemon" "Codes\gui\app.py"
```
The compiled output will be generated in the `dist/Archon` folder.
