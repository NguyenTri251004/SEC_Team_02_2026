---
description: Toggle task completion notifications (sound + alert)
argument-hint: [on|off|status]
---

## Notification Toggle

Control task completion notifications that play sound and show alert when Claude finishes responding.

**Action requested:** `$ARGUMENTS`

## Instructions

Based on the argument provided, perform ONE of these actions:

### If argument is "on" or empty:
1. Create the flag file to enable notifications:
```bash
touch ".claude/hooks/notifications/.notify-enabled"
```
2. Respond: "Notifications enabled. You'll hear sound + see alert when tasks complete."

### If argument is "off":
1. Remove the flag file to disable notifications:
```bash
rm -f ".claude/hooks/notifications/.notify-enabled"
```
2. Respond: "Notifications disabled."

### If argument is "status":
1. Check if flag file exists:
```bash
test -f ".claude/hooks/notifications/.notify-enabled" && echo "enabled" || echo "disabled"
```
2. Report the current status.

## Notes
- Notifications play repeating sound until you click "OK" on the alert dialog
- Flag file location: `.claude/hooks/notifications/.notify-enabled`
- This only affects the current project (Mind Match)
