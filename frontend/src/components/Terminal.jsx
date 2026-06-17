import { useEffect, useRef } from 'react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { sounds } from '../sounds.js';
import 'xterm/css/xterm.css';

const HISTORY_MAX = 50;

const CMDS_NETWORK = ['ls','nmap','cd','whoami','hint','help','clear','scores'];
const CMDS_MACHINE = ['recon','nmap','nikto','dirb','searchsploit','sqlmap','hydra','curl','nc','whoami','sudo','find','cat','hint','help','exit','clear','scores'];

function buildPrompt(mode, machine) {
  if (mode === 'MACHINE' && machine) {
    const host = machine.ip.replace(/\./g, '-');
    return `\x1b[31mroot@${host}\x1b[0m:\x1b[34m~\x1b[0m# `;
  }
  return `\x1b[36mattacker@kali\x1b[0m:\x1b[34m~/pentest\x1b[0m$ `;
}

export default function Terminal({ onCommand, gameState, onWriteRef, onRunRef }) {
  const containerRef = useRef(null);
  const termRef      = useRef(null);
  const inputRef     = useRef('');
  const cursorPosRef = useRef(0);   // cursor position within inputRef
  const historyRef   = useRef([]);
  const histIdxRef   = useRef(-1);
  const modeRef      = useRef('NETWORK');
  const machineRef   = useRef(null);

  useEffect(() => {
    modeRef.current    = gameState?.mode    || 'NETWORK';
    machineRef.current = gameState?.currentMachine || null;
  }, [gameState?.mode, gameState?.currentMachine]);

  useEffect(() => {
    if (!containerRef.current) return;

    const term = new XTerm({
      theme: {
        background: '#0d0d0d',
        foreground: '#00ff41',
        cursor: '#00ff41',
        cursorAccent: '#0d0d0d',
        selectionBackground: '#1a4a1a',
        black: '#0d0d0d',
        green: '#00ff41',
        brightGreen: '#39ff14',
        yellow: '#ffff00',
        brightYellow: '#ffee00',
        red: '#ff4444',
        brightRed: '#ff6666',
        cyan: '#00ffff',
        white: '#cccccc',
        brightWhite: '#ffffff',
      },
      fontFamily: '"Fira Code", "Cascadia Code", "Courier New", monospace',
      fontSize: 13,
      lineHeight: 1.45,
      cursorBlink: true,
      cursorStyle: 'block',
      convertEol: true,
      scrollback: 2000,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(containerRef.current);

    // Let xterm handle all keys normally.
    // Arrow keys for map movement are handled in App.jsx, which
    // already ignores them when a TEXTAREA (xterm) has focus.

    const doFit = () => { try { fitAddon.fit(); } catch (_) {} };
    doFit();
    const ro = new ResizeObserver(doFit);
    ro.observe(containerRef.current);

    termRef.current = term;

    // Expose write function for ORACLE messages
    if (onWriteRef) {
      onWriteRef.current = (text) => {
        if (!termRef.current) return;
        text.split('\n').forEach(line => termRef.current.writeln(line));
        termRef.current.write(buildPrompt(modeRef.current, machineRef.current));
      };
    }

    // Expose run function to inject a command programmatically (e.g. from a button)
    if (onRunRef) {
      onRunRef.current = async (cmdText) => {
        const t = termRef.current;
        if (!t) return;
        t.writeln('');
        t.writeln(`\x1b[33m${cmdText}\x1b[0m`);
        try {
          const output = await onCommand(cmdText);
          if (output === '\x1b[2J\x1b[H') { t.clear(); }
          else if (output) { output.split('\n').forEach(line => t.writeln(line)); }
        } catch (_) {
          t.writeln('\x1b[31m[ERROR] Backend non disponible.\x1b[0m');
        }
        t.write(buildPrompt(modeRef.current, machineRef.current));
      };
    }

    term.write(buildPrompt('NETWORK', null));

    term.onKey(async ({ key, domEvent }) => {
      const code = domEvent.keyCode;
      const dk = domEvent.key.toLowerCase();

      if (domEvent.ctrlKey && dk === 'c') {
        const sel = term.getSelection();
        if (sel) { navigator.clipboard.writeText(sel).catch(() => {}); return; }
        term.writeln('^C');
        inputRef.current = '';
        histIdxRef.current = -1;
        term.write(buildPrompt(modeRef.current, machineRef.current));
        return;
      }

      if (domEvent.ctrlKey && dk === 'v') {
        try {
          const text = await navigator.clipboard.readText();
          const line = text.split('\n')[0];
          inputRef.current += line;
          term.write(line);
        } catch (_) {}
        return;
      }

      if (domEvent.ctrlKey && dk === 'l') {
        term.clear();
        term.write(buildPrompt(modeRef.current, machineRef.current));
        return;
      }

      sounds.keyPress();

      // Helper: redraw the current input line with cursor at cursorPosRef
      const redrawLine = (text) => {
        // Move cursor to start of input, clear to end of line
        const oldLen = inputRef.current.length;
        const moveBack = cursorPosRef.current;
        if (moveBack > 0) term.write(`\x1b[${moveBack}D`); // move to start of input
        term.write('\x1b[K'); // clear from cursor to end of line
        term.write(text);
        inputRef.current = text;
        cursorPosRef.current = text.length;
      };

      if (code === 13) {
        const cmd = inputRef.current.trim();
        term.writeln('');

        if (cmd) {
          historyRef.current.unshift(cmd);
          if (historyRef.current.length > HISTORY_MAX) historyRef.current.pop();
          histIdxRef.current = -1;

          try {
            const output = await onCommand(cmd);
            if (output === '\x1b[2J\x1b[H') {
              term.clear();
            } else if (output) {
              output.split('\n').forEach(line => term.writeln(line));
            }
            sounds.commandOk();
          } catch (err) {
            term.writeln('\x1b[31m[ERROR] Backend non disponible.\x1b[0m');
            sounds.commandError();
          }
        }

        inputRef.current = '';
        cursorPosRef.current = 0;
        term.write(buildPrompt(modeRef.current, machineRef.current));

      } else if (code === 8) {
        // Backspace: delete character before cursor
        if (cursorPosRef.current > 0) {
          const pos = cursorPosRef.current;
          const before = inputRef.current.slice(0, pos - 1);
          const after  = inputRef.current.slice(pos);
          inputRef.current = before + after;
          cursorPosRef.current = pos - 1;
          // Move back one, rewrite rest of line, clear trailing char, reposition cursor
          term.write('\b');               // move back one
          term.write(after + ' ');         // rewrite rest + blank over old last char
          const moveBack = after.length + 1;
          if (moveBack > 0) term.write(`\x1b[${moveBack}D`); // move cursor back
        }

      } else if (domEvent.key === 'ArrowLeft') {
        domEvent.preventDefault();
        if (cursorPosRef.current > 0) {
          cursorPosRef.current--;
          term.write('\x1b[D'); // move cursor left
        }

      } else if (domEvent.key === 'ArrowRight') {
        domEvent.preventDefault();
        if (cursorPosRef.current < inputRef.current.length) {
          cursorPosRef.current++;
          term.write('\x1b[C'); // move cursor right
        }

      } else if (domEvent.key === 'ArrowUp') {
        domEvent.preventDefault();
        if (historyRef.current.length > 0) {
          histIdxRef.current = Math.min(histIdxRef.current + 1, historyRef.current.length - 1);
          redrawLine(historyRef.current[histIdxRef.current]);
        }

      } else if (domEvent.key === 'ArrowDown') {
        domEvent.preventDefault();
        if (histIdxRef.current > 0) {
          histIdxRef.current--;
          redrawLine(historyRef.current[histIdxRef.current]);
        } else if (histIdxRef.current === 0) {
          histIdxRef.current = -1;
          redrawLine('');
        }

      } else if (code === 9) {
        domEvent.preventDefault();
        const partial = inputRef.current;
        const cmds = modeRef.current === 'MACHINE' ? CMDS_MACHINE : CMDS_NETWORK;
        const matches = cmds.filter(c => c.startsWith(partial));
        if (matches.length === 1) {
          const completion = matches[0].slice(partial.length);
          inputRef.current += completion;
          cursorPosRef.current = inputRef.current.length;
          term.write(completion);
        } else if (matches.length > 1) {
          term.writeln('');
          term.writeln('\x1b[33m' + matches.join('  ') + '\x1b[0m');
          term.write(buildPrompt(modeRef.current, machineRef.current));
          term.write(inputRef.current);
          cursorPosRef.current = inputRef.current.length;
        }

      } else if (key.length === 1 && !domEvent.ctrlKey && !domEvent.altKey && !domEvent.metaKey) {
        // Insert character at cursor position
        const pos = cursorPosRef.current;
        const before = inputRef.current.slice(0, pos);
        const after  = inputRef.current.slice(pos);
        inputRef.current = before + key + after;
        cursorPosRef.current = pos + 1;
        term.write(key + after);
        if (after.length > 0) term.write(`\x1b[${after.length}D`); // move cursor back
      }
    });

    return () => { ro.disconnect(); term.dispose(); termRef.current = null; };
  }, []);

  return (
    <div ref={containerRef} style={{
      height: '100%', width: '100%',
      background: '#0d0d0d',
      borderTop: '2px solid #00ff41',
      padding: '4px 8px',
      overflow: 'hidden',
    }} />
  );
}
