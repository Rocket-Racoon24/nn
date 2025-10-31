// Pomodoro.js: Now designed to be used where you want the button and panel (not floating!)
// Usage (Recommended):
//   import Pomodoro, { PomodoroPanel } from './pomodoro';
//   // Place <PomodoroPanel isOpen={panelState} setIsOpen={setPanelState} ... /> near your PDF button, or use <Pomodoro /> for legacy floating behavior.

import React, { useEffect, useRef, useState, useLayoutEffect } from "react";
import ReactDOM from "react-dom";

/**
 * PomodoroPanel can be rendered anywhere.
 * @param isOpen (bool) Whether the panel is visible
 * @param setIsOpen (func) Function to control panel open/close
 */
export function PomodoroPanel({
  isOpen,
  setIsOpen,
  anchorRef,
}) {
  const [isRunning, setIsRunning] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [workMinutes, setWorkMinutes] = useState(25);
  const [breakMinutes, setBreakMinutes] = useState(5);
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const intervalRef = useRef(null);
  const panelRef = useRef(null);
  const [pos, setPos] = useState({ top: 0, left: 0, placement: "bottom" });
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Use portal for popup, always absolute to <body>
  useLayoutEffect(() => {
    if (!isOpen) return;
    if (anchorRef && anchorRef.current && panelRef.current) {
      const anchorRect = anchorRef.current.getBoundingClientRect();
      const panelRect = panelRef.current.getBoundingClientRect();
      const top = anchorRect.bottom + window.scrollY + 8;
      const left = anchorRect.right + window.scrollX - panelRect.width;
      setPos({ top, left, placement: "bottom-left" });
    }
  }, [isOpen, anchorRef]);

  useEffect(() => {
    function onResize() {
      if (isOpen && anchorRef && anchorRef.current && panelRef.current) {
        const anchorRect = anchorRef.current.getBoundingClientRect();
        const panelRect = panelRef.current.getBoundingClientRect();
        const top = anchorRect.bottom + window.scrollY + 8;
        const left = anchorRect.right + window.scrollX - panelRect.width;
        setPos({ top, left, placement: "bottom-left" });
      }
    }
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
    };
  }, [isOpen, anchorRef]);

  // Make seconds update when durations change (but only if STOPPED)
  useEffect(() => {
    if (!isRunning && !isBreak) setSecondsLeft(workMinutes * 60);
    if (!isRunning && isBreak) setSecondsLeft(breakMinutes * 60);
    // eslint-disable-next-line
  }, [workMinutes, breakMinutes]);

  const formatTime = (totalSeconds) => {
    const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
    const seconds = (totalSeconds % 60).toString().padStart(2, "0");
    return `${minutes}:${seconds}`;
  };

  const requestFullscreen = async () => {
    const el = document.documentElement;
    if (document.fullscreenElement) return;
    try {
      if (el.requestFullscreen) await el.requestFullscreen();
      setIsFullscreen(true);
    } catch (_) {}
  };

  const exitFullscreen = async () => {
    if (!document.fullscreenElement) return;
    try {
      if (document.exitFullscreen) await document.exitFullscreen();
      setIsFullscreen(false);
    } catch (_) {}
  };

  const startTimer = async () => {
    if (isRunning) return;
    setIsRunning(true);
    await requestFullscreen();
  };

  const stopTimer = async () => {
    setIsRunning(false);
    await exitFullscreen();
  };

  const resetTimer = () => {
    setIsRunning(false);
    setIsBreak(false);
    setWorkMinutes(25);
    setBreakMinutes(5);
    setSecondsLeft(25 * 60);
  };

  useEffect(() => {
    if (!isRunning) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }
    if (intervalRef.current) return;
    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev > 0) return prev - 1;
        const nextIsBreak = !isBreak;
        setIsBreak(nextIsBreak);
        // Set time for next round
        return nextIsBreak ? breakMinutes * 60 : workMinutes * 60;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning, isBreak, workMinutes, breakMinutes]);

  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
      if (!document.fullscreenElement && isRunning) setIsRunning(false);
    };
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, [isRunning]);

  // Don't reset timer or stop when hidden. Only when panel is MOUNTED and NOT
  // isOpen effect removed.

  if (!isOpen) return null;
  const panel = (
    <div
      ref={panelRef}
      style={{
        position: "absolute",
        top: pos.top,
        left: pos.left,
        width: 290,
        background: "#0f1220",
        color: "#e8eaf6",
        border: "1px solid #30345a",
        borderRadius: 12,
        padding: 14,
        boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
        zIndex: 3010,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
        <div style={{ fontWeight: 700, letterSpacing: 0.3 }}>Pomodoro</div>
        <div style={{ marginLeft: 8, opacity: 0.8 }}>{isBreak ? "Break" : "Focus"}</div>
        <button
          onClick={() => setIsOpen(false)}
          style={{
            marginLeft: "auto",
            border: "none",
            background: "transparent",
            color: "#9aa0c7",
            fontSize: 18,
            cursor: "pointer",
          }}
          title="Close"
        >
          ✖
        </button>
      </div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
        <div style={{ flex: '1' }}>
          <label style={{ fontSize: 12 }}>Focus</label>
          <input type="number" min={1} max={90} step={1} value={workMinutes} disabled={isRunning}
            onChange={e => setWorkMinutes(Math.max(1, Math.min(90, Number(e.target.value) || 1)))}
            style={{ width: 50, borderRadius: 6, border: '1px solid #2c3160', padding: 3, marginLeft: 4, background: '#181b30', color: '#f5f7ff'}}
          /> min
        </div>
        <div style={{ flex: '1' }}>
          <label style={{ fontSize: 12 }}>Break</label>
          <input type="number" min={1} max={30} step={1} value={breakMinutes} disabled={isRunning}
            onChange={e => setBreakMinutes(Math.max(1, Math.min(30, Number(e.target.value) || 1)))}
            style={{ width: 50, borderRadius: 6, border: '1px solid #2c3160', padding: 3, marginLeft: 4, background: '#181b30', color: '#f5f7ff'}}
          /> min
        </div>
      </div>
      <div
        style={{
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas",
          fontSize: 40,
          textAlign: "center",
          margin: "6px 0 12px",
        }}
      >
        {formatTime(secondsLeft)}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={isRunning ? stopTimer : startTimer}
          style={{
            flex: 1,
            border: "none",
            borderRadius: 8,
            padding: "10px 12px",
            background: isRunning ? "#e53935" : "#2e7d32",
            color: "#fff",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {isRunning ? "Stop" : "Start"}
        </button>
        <button
          onClick={resetTimer}
          disabled={isRunning}
          style={{
            flex: 1,
            border: "1px solid #3a3f6b",
            borderRadius: 8,
            padding: "10px 12px",
            background: "transparent",
            color: isRunning ? "#6e739d" : "#b8bee8",
            fontWeight: 600,
            cursor: isRunning ? "not-allowed" : "pointer",
          }}
        >
          Reset
        </button>
      </div>
      <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
        <button
          onClick={isFullscreen ? exitFullscreen : requestFullscreen}
          style={{
            flex: 1,
            border: "1px solid #3a3f6b",
            borderRadius: 8,
            padding: "8px 10px",
            background: "transparent",
            color: "#b8bee8",
            cursor: "pointer",
            fontWeight: 600,
          }}
          title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
        >
          {isFullscreen ? '⤡ Exit' : '⤢ Fullscreen'}
        </button>
      </div>
    </div>
  );
  return ReactDOM.createPortal(panel, document.body);
}

// Legacy Pomodoro: floating button, keeps all logic inside for backward compatibility
export default function Pomodoro() {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <button
        title="Pomodoro"
        onClick={() => setIsOpen((v) => !v)}
        style={{
          position: "fixed",
          right: 16,
          bottom: 84,
          width: 44,
          height: 44,
          borderRadius: 8,
          border: "none",
          background: "#222",
          color: "#fff",
          fontSize: 22,
          cursor: "pointer",
          boxShadow: "0 6px 18px rgba(0,0,0,0.25)",
          zIndex: 1000,
        }}
      >
        ⏱️
      </button>
      <PomodoroPanel isOpen={isOpen} setIsOpen={setIsOpen} />
    </>
  );
}

