---
description: Always automatically verify Render Deployment Status after pushing code
---
# Mandatory Post-Deployment Feedback Loop

Whenever you push to the `main` branch or trigger an automatic deployment to the Render cloud infrastructure, you MUST automatically check if the deployment succeeded. 

Because we are AI agents, we do not have a visual representation of the Render Dashboard. You must use the `render_deployment_check.js` script to parse the API response to retrieve our build status.

**How to verify deployment:**
1. Retrieve the Render Service ID matching this repository. Ask the user if you don't have it.
2. Ensure you have the `.env` variable `RENDER_API_KEY` exported in the shell.
3. Automatically run the following command roughly 60 seconds after your `git push`, using your `run_command` tool.
   `node .agents/scripts/render_deployment_check.js <RENDER_SERVICE_ID>`
4. If the script outputs `LIVE`, the build succeeded, and the backend is healthy. 
5. If the script outputs `FAILED`, pull the logs and diagnose the build syntax errors without waiting for the user to prompt you.
