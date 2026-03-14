# Antigravity AI Coordination Handshake

This file is used to explicitly synchronize work between different AI instances (e.g., Frontend AI vs Backend AI) operating in the same repository.

**How to use this file:**
If the human user instructs us to coordinate:

1. **PULL** the latest changes.
2. **READ** this file to understand what the other AI instance is currently working on or has recently completed.
3. **UPDATE** the corresponding section below with your planned changes before beginning work.
4. **COMMIT & PUSH** your updates so the other AI instance can read them.

---

## 🌳 GIT BRANCH STRATEGY

**CRITICAL:** We are now operating on a **single-branch strategy**:

- All work must be committed directly to the `main` branch.
- Feature branches (e.g., `graphics-features`, `backend-feature`) have been unified and deleted from both local and remote repositories.
- Do NOT create new branches or merge requests. Ensure you always pull the latest `main` before starting any work to prevent conflicts.

---

## 🖥️ FRONTEND AI Status

_(Machine constraint: `AMBIENT=FRONTEND`. Only modifies HTML, CSS, JS frontend logic.)_

- **Current Objective**: **CRITICAL RULE**: The Frontend AI (Graphics Office) MUST **EXCLUSIVELY** work inside the `GRAPHIC_FILES/` directory. The live server dynamically serves `game.html` and all textures directly from this folder. **UNDER NO CIRCUMSTANCES** should you edit, move, or place files in the root directory. If you touch the root directory, you break the backend.
- **Active Files/Folders**: `/GRAPHIC_FILES/*` (specifically `game.html` and the texture folders).
- **Recent Changes**: Applied 20px `margin-bottom` spacing to the internal flex/grid wrappers of the Staking, World Bank, Master Node, and Treasury modals. Fixed the overflow so the lowest UI boundaries do not bleed into the monitor's edge.
- **Next Sync Needed?**: Yes, changes have been pushed to git for the Backend AI to monitor.

## ⚙️ BACKEND AI Status

_(Machine constraint: modifies server logic, DB schemas, API endpoints.)_

- **Current Objective**: Successfully refactored the root repository. Organized stray CSV/TXT/JS files into `DATA`, `DOCS`, and `SCRIPTS`. Created the `GRAPHIC_FILES` directory for the graphics team and updated `server.js` static routing to make it the live source of truth for the frontend codebase. Implemented continuous drone battles and fixed the `createGlowCanvas` animation crash.
- **Active Files/Folders**: `server.js` and all root subdirectories except `GRAPHIC_FILES`.
- **Next Sync Needed?**: No. The architecture is stable. Waiting for the Frontend AI to push graphics updates from inside the `GRAPHIC_FILES` folder.

---

_Note: Since AI instances are stateless, this log is strictly asynchronous. We do not receive real-time notifications when this file is changed. The user must prompt us to read or update this file._
