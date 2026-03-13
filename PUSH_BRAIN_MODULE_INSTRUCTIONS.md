To push **only** the changes made inside the `BRAIN_MODULE` folder to the remote repository without staging or committing any other modified files in the root `nuclearwar` directory, execute the following Git commands from the root of the repository (`nuclearwar` folder):

```bash
# 1. Stage ONLY the contents of the BRAIN_MODULE directory
git add BRAIN_MODULE/

# 2. Commit exactly what you just staged
git commit -m "Update BRAIN_MODULE telemetry and configuration"

# 3. Push the commit to the remote repository
git push origin main
```

By explicitly specifying the directory path `BRAIN_MODULE/` in the `git add` command, you isolate the scope of your update. Git will ignore any other modified files (like `server.js` or frontend files in the root folder) and only bundle the changes located inside the `BRAIN_MODULE` folder into that specific commit.
