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

export default function Terminal({ onCommand, gameState, onWriteRef }) {
  const containerRef = useRef(null);
  const termRef      = useRef(null);
  const inputRef     = useRef('');
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
        term.write(buildPrompt(modeRef.current, machineRef.current));

      } else if (code === 8) {
        if (inputRef.current.length > 0) {
          inputRef.current = inputRef.current.slice(0, -1);
          term.write('\b \b');
        }
      } else if (code === 38) {
        if (historyRef.current.length > 0) {
          histIdxRef.current = Math.min(histIdxRef.current + 1, historyRef.current.length - 1);
          const prev = historyRef.current[histIdxRef.current];
          term.write('\b \b'.repeat(inputRef.current.length));
          inputRef.current = prev;
          term.write(prev);
        }
      } else if (code === 40) {
        if (histIdxRef.current > 0) {
          histIdxRef.current--;
          const next = historyRef.current[histIdxRef.current];
          term.write('\b \b'.repeat(inputRef.current.length));
          inputRef.current = next;
          term.write(next);
        } else if (histIdxRef.current === 0) {
          histIdxRef.current = -1;
          term.write('\b \b'.repeat(inputRef.current.length));
          inputRef.current = '';
        }
      } else if (code === 9) {
        domEvent.preventDefault();
        const partial = inputRef.current;
        const cmds = modeRef.current === 'MACHINE' ? CMDS_MACHINE : CMDS_NETWORK;
        const matches = cmds.filter(c => c.startsWith(partial));
        if (matches.length === 1) {
          const completion = matches[0].slice(partial.length);
          inputRef.current += completion;
          term.write(completion);
        } else if (matches.length > 1) {
          term.writeln('');
          term.writeln('\x1b[33m' + matches.join('  ') + '\x1b[0m');
          term.write(buildPrompt(modeRef.current, machineRef.current));
          term.write(inputRef.current);
        }
      } else if (key.length === 1 && !domEvent.ctrlKey && !domEvent.altKey && !domEvent.metaKey) {
        inputRef.current += key;
        term.write(key);
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
