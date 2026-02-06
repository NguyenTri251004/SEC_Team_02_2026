#!/usr/bin/env node
/**
 * Local macOS Notification - Plays repeating sound until user confirms
 * Triggered when Claude Code completes a task (Stop event)
 *
 * Toggle: Use /notify on|off to enable/disable
 * Flag file: .claude/hooks/notifications/.notify-enabled
 *
 * Usage: echo '{"hook_event_name":"Stop"}' | node local-notify.cjs
 */
'use strict';

const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Flag file to check if notifications are enabled
const FLAG_FILE = path.join(__dirname, '.notify-enabled');

// Configuration
const CONFIG = {
  // macOS system sounds: Glass, Ping, Pop, Purr, Sosumi, Submarine, Tink
  soundFile: '/System/Library/Sounds/Glass.aiff',
  soundInterval: 2000, // ms between sound repeats
  alertTitle: 'Claude Code',
  alertMessage: 'Task completed!',
};

/**
 * Read JSON from stdin
 * @returns {Promise<Object>} Parsed JSON input
 */
async function readStdin() {
  return new Promise((resolve) => {
    let data = '';

    if (process.stdin.isTTY) {
      resolve({});
      return;
    }

    process.stdin.setEncoding('utf8');
    process.stdin.on('data', chunk => { data += chunk; });
    process.stdin.on('end', () => {
      if (!data.trim()) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(data));
      } catch {
        resolve({});
      }
    });
    process.stdin.on('error', () => resolve({}));

    setTimeout(() => resolve({}), 3000);
  });
}

/**
 * Run the notification with repeating sound in a detached process
 * This allows the hook to return immediately while notification continues
 */
function runDetachedNotification() {
  // AppleScript that:
  // 1. Plays sound in loop (background)
  // 2. Shows alert dialog
  // 3. Stops sound when user clicks OK
  const appleScript = `
    -- Start repeating sound in background
    set soundFile to "${CONFIG.soundFile}"
    set shouldPlay to true

    -- Play sound once immediately
    do shell script "afplay " & quoted form of soundFile & " &"

    -- Show alert (this blocks until user clicks)
    display alert "${CONFIG.alertTitle}" message "${CONFIG.alertMessage}" buttons {"OK"} default button "OK" giving up after 300

    -- User clicked or alert timed out - stop any playing sounds
    do shell script "killall afplay 2>/dev/null || true"
  `;

  // Run AppleScript in detached mode so hook returns immediately
  const child = spawn('osascript', ['-e', appleScript], {
    detached: true,
    stdio: 'ignore',
  });

  child.unref();

  // Also start a background sound loop that runs until alert is dismissed
  const soundLoopScript = `
    while true; do
      sleep ${CONFIG.soundInterval / 1000}
      afplay "${CONFIG.soundFile}" 2>/dev/null || exit 0
    done
  `;

  const soundChild = spawn('bash', ['-c', soundLoopScript], {
    detached: true,
    stdio: 'ignore',
  });

  soundChild.unref();
}

/**
 * Check if notifications are enabled
 * @returns {boolean}
 */
function isEnabled() {
  return fs.existsSync(FLAG_FILE);
}

/**
 * Main entry point
 */
async function main() {
  try {
    // Check if notifications are enabled
    if (!isEnabled()) {
      process.exit(0);
      return;
    }

    const input = await readStdin();

    // Only trigger on Stop event (Claude finished responding)
    if (input.hook_event_name !== 'Stop') {
      process.exit(0);
      return;
    }

    // Run notification with repeating sound
    runDetachedNotification();

    console.error('[local-notify] Alert triggered (sound will repeat until confirmed)');
  } catch (err) {
    console.error(`[local-notify] Error: ${err.message}`);
  }

  process.exit(0);
}

main();
