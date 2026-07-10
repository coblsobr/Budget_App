# Budget App — Claude Code Guide

## Git: always commit and push (standing instruction)

After completing any change to this app (feature, fix, config), **commit and push to GitHub without being asked**:

```
git add -A
git commit -m "<short description of the change>"
git push
```

- Remote: `https://github.com/coblsobr/Budget_APP.git` — credentials are saved on this machine; no login prompt will appear.
- This applies to **all sessions, including dispatch/remote agents**.
- Commit at natural checkpoints (a working feature or fix) — never mid-broken-state, because…

## ⚠️ Pushing publishes to the user's phone

A push to this repo triggers a GitHub Actions workflow that ships an over-the-air update to the user's phone app (~2–3 min). Only push code that runs. If a change is experimental or half-done, hold the commit until it works.

(`push.cmd` in this folder is the old manual double-click push — it still works, but sessions should push directly instead.)

## Project notes

See `budget-app-notes.md` and `README.md` for app details.
