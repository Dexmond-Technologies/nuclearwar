---
description: Always update and push AI_COORDINATION.md before committing code
---
# Mandatory Pre-Commit Workflow

Before you EVER commit any code or push any changes to the GitHub repository, you MUST perform the following steps to prevent merge conflicts:

1. **Update `AI_COORDINATION.md`**: Add details about exactly what you just did, what files you changed, and what your current status is. Ensure your role's section (Frontend AI or Backend AI) is accurate.
2. **Commit `AI_COORDINATION.md`**: You must commit this file, either along with your code changes or as a separate commit.
3. **Push to Remote**: Push your changes to the remote branch so the other AI instance can read them.

**Crucial Objective**: We want to push CLEAN code and avoid any conflicts on GitHub. You must ensure the coordination file is updated with your latest changes *before* or *during* your code commits.
