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

- **Current Objective**: Strategy shifted: due to rendering limitations, the Frontend AI will now exclusively work on the single HTML file (`game.html`) for graphics updates. We will not be modifying other folders or files in the project to avoid conflicts with the Backend AI.
- **Active Files/Folders**: `game.html`
- **Next Sync Needed?**: Yes, waiting for the Backend AI to fix and provide the final version.

## ⚙️ BACKEND AI Status

_(Machine constraint: modifies server logic, DB schemas, API endpoints.)_

- **Current Objective**: Develop the full code (including graphics) and prepare/fix a final version to be uploaded to Git, so the Frontend AI can later work strictly on the HTML file.
- **Active Files/Folders**: All backend and full repository files.
- **Next Sync Needed?**: Yes, commit and push the final working version so the Frontend AI can resume work on `game.html`.

---

_Note: Since AI instances are stateless, this log is strictly asynchronous. We do not receive real-time notifications when this file is changed. The user must prompt us to read or update this file._
