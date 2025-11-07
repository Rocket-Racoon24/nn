// Pomodoro.js: Now designed to be used where you want the button and panel (not floating!)
// Usage (Recommended):
//   import Pomodoro, { PomodoroPanel } from './pomodoro';
//   // Place <PomodoroPanel isOpen={panelState} setIsOpen={setPanelState} ... /> near your PDF button, or use <Pomodoro /> for legacy floating behavior.

import React, { useEffect, useRef, useState, useLayoutEffect } from "react";
import ReactDOM from "react-dom";
import Toast from "./components/Toast";

const breakTips = [
  "Drink some water and stretch.",
  "Walk a short distance to reset your focus.",
  "Look away from the screen to rest your eyes.",
  "Take a deep breath and loosen your shoulders.",
  "Grab a healthy snack to recharge.",
];

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
  const [toast, setToast] = useState(null);
  const [pausedForFullscreen, setPausedForFullscreen] = useState(false);
  const intervalRef = useRef(null);
  const panelRef = useRef(null);
  const ignoreNextFullscreenExit = useRef(false);
  const previousIsBreak = useRef(isBreak);
  const [pos, setPos] = useState({ top: 0, left: 0, placement: "bottom" });
  const [isFullscreen, setIsFullscreen] = useState(false);

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

  useEffect(() => {
    if (!isRunning && !isBreak) setSecondsLeft(workMinutes * 60);
    if (!isRunning && isBreak) setSecondsLeft(breakMinutes * 60);
  }, [workMinutes, breakMinutes, isRunning, isBreak]);

  const formatTime = (totalSeconds) => {
    const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
    const seconds = (totalSeconds % 60).toString().padStart(2, "0");
    return `${minutes}:${seconds}`;
  };

  const requestFullscreen = async () => {
    const el = document.documentElement;
    if (document.fullscreenElement) {
      setIsFullscreen(true);
      return;
    }
    try {
      if (el.requestFullscreen) await el.requestFullscreen();
      setIsFullscreen(true);
    } catch (_) {}
  };

  const exitFullscreen = async () => {
    if (!document.fullscreenElement) {
      setIsFullscreen(false);
      return;
    }
    try {
      if (document.exitFullscreen) await document.exitFullscreen();
      setIsFullscreen(false);
    } catch (_) {}
  };

  const handlePhaseSwitch = (nextIsBreak, showNotification = true) => {
    if (nextIsBreak) {
      ignoreNextFullscreenExit.current = Boolean(document.fullscreenElement);
      exitFullscreen();
      if (showNotification) {
        const tip = breakTips[Math.floor(Math.random() * breakTips.length)];
        setToast({ message: `Break time! ${tip}`, type: "info", duration: 6000 });
      }
    } else {
      ignoreNextFullscreenExit.current = false;
      setPausedForFullscreen(false);
      if (!document.fullscreenElement) {
        requestFullscreen();
      }
      if (showNotification) {
        setToast({ message: "Study time! Lock in and stay focused.", type: "success", duration: 5000 });
      }
    }
  };

  const startTimer = () => {
    if (isRunning) return;
    handlePhaseSwitch(isBreak);
    setPausedForFullscreen(false);
    setIsRunning(true);
  };

  const stopTimer = () => {
    setIsRunning(false);
    setPausedForFullscreen(false);
    exitFullscreen();
  };

  const resetTimer = () => {
    setIsRunning(false);
    setPausedForFullscreen(false);
    setIsBreak(false);
    setWorkMinutes(25);
    setBreakMinutes(5);
    setSecondsLeft(25 * 60);
    exitFullscreen();
    setToast(null);
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
        handlePhaseSwitch(nextIsBreak);
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
      const active = Boolean(document.fullscreenElement);
      setIsFullscreen(active);
      if (!active) {
        if (ignoreNextFullscreenExit.current) {
          ignoreNextFullscreenExit.current = false;
          return;
        }
        if (isRunning && !isBreak) {
          setIsRunning(false);
          setPausedForFullscreen(true);
          setToast({ message: "Focus paused. Re-enter fullscreen to resume.", type: "warning", duration: 6000 });
        }
      } else {
        if (pausedForFullscreen && !isBreak) {
          setPausedForFullscreen(false);
          setIsRunning(true);
          setToast({ message: "Fullscreen restored. Resuming focus.", type: "success", duration: 4000 });
        }
      }
    };
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, [isRunning, isBreak, pausedForFullscreen]);

  useEffect(() => {
    if (!isRunning) return;
    if (isBreak) return;
    if (pausedForFullscreen) return;
    if (!document.fullscreenElement) {
      requestFullscreen();
    }
  }, [isRunning, isBreak, pausedForFullscreen]);

  useEffect(() => {
    let timeoutId = null;
    if (previousIsBreak.current && !isBreak && isRunning && !pausedForFullscreen) {
      timeoutId = setTimeout(() => {
        if (!document.fullscreenElement) {
          requestFullscreen();
        }
      }, 180);
    }
    previousIsBreak.current = isBreak;
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [isBreak, isRunning, pausedForFullscreen]);

  const panel = (
    <div
      ref={panelRef}
      data-pomodoro-panel
      style={{
        position: "absolute",
        top: pos.top,
        left: pos.left,
        width: 320,
        background: "linear-gradient(160deg, rgba(10, 15, 15, 0.95), rgba(15, 23, 42, 0.92))",
        color: "#d6d9d8",
        border: "1px solid rgba(0, 255, 156, 0.3)",
        borderRadius: 18,
        padding: 20,
        boxShadow: "0 24px 45px rgba(0, 255, 156, 0.18)",
        zIndex: 3010,
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", marginBottom: 18 }}>
        <div
          style={{
            fontWeight: 700,
            letterSpacing: "2px",
            textTransform: "uppercase",
            background: "linear-gradient(90deg, #00ff9c, #00e0ff)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
            fontSize: 14,
          }}
        >
          Pomodoro
        </div>
        <div
          style={{
            marginLeft: 12,
            padding: "4px 12px",
            borderRadius: 999,
            background: isBreak ? "rgba(56, 189, 248, 0.12)" : "rgba(0, 255, 156, 0.12)",
            border: isBreak ? "1px solid rgba(56, 189, 248, 0.45)" : "1px solid rgba(0, 255, 156, 0.45)",
            color: isBreak ? "#38bdf8" : "#00ff9c",
            fontSize: 12,
            fontWeight: 600,
            textTransform: "uppercase",
          }}
        >
          {isBreak ? "Break" : "Focus"}
        </div>
        <button
          onClick={() => setIsOpen(false)}
          style={{
            marginLeft: "auto",
            width: 32,
            height: 32,
            borderRadius: 10,
            border: "1px solid rgba(148, 163, 184, 0.35)",
            background: "rgba(15, 23, 42, 0.65)",
            color: "#94a3b8",
            fontSize: 16,
            cursor: "pointer",
            transition: "all 0.2s ease",
          }}
          title="Close"
        >
          ✖
        </button>
      </div>
      <div style={{ display: "flex", gap: 12, marginBottom: 18 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 6 }}>Focus</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="number"
              min={1}
              max={90}
              step={1}
              value={workMinutes}
              disabled={isRunning}
              onChange={(e) => setWorkMinutes(Math.max(1, Math.min(90, Number(e.target.value) || 1)))}
              style={{
                width: 70,
                borderRadius: 10,
                border: "1px solid rgba(0, 255, 156, 0.3)",
                padding: "8px 10px",
                background: "rgba(10, 15, 15, 0.75)",
                color: "#e2e8f0",
                fontWeight: 600,
                fontSize: 16,
                boxShadow: "0 0 12px rgba(0, 255, 156, 0.12)",
              }}
            />
            <span style={{ fontSize: 12, color: "#94a3b8" }}>min</span>
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 6 }}>Break</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="number"
              min={1}
              max={30}
              step={1}
              value={breakMinutes}
              disabled={isRunning}
              onChange={(e) => setBreakMinutes(Math.max(1, Math.min(30, Number(e.target.value) || 1)))}
              style={{
                width: 70,
                borderRadius: 10,
                border: "1px solid rgba(56, 189, 248, 0.3)",
                padding: "8px 10px",
                background: "rgba(10, 15, 15, 0.75)",
                color: "#e2e8f0",
                fontWeight: 600,
                fontSize: 16,
                boxShadow: "0 0 12px rgba(56, 189, 248, 0.12)",
              }}
            />
            <span style={{ fontSize: 12, color: "#94a3b8" }}>min</span>
          </div>
        </div>
      </div>
      <div
        style={{
          fontFamily: "Orbitron, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas",
          fontSize: 48,
          textAlign: "center",
          margin: "10px 0 22px",
          color: isBreak ? "#38bdf8" : "#00ff9c",
          textShadow: isBreak ? "0 0 16px rgba(56, 189, 248, 0.55)" : "0 0 16px rgba(0, 255, 156, 0.65)",
          letterSpacing: 4,
        }}
      >
        {formatTime(secondsLeft)}
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <button
          onClick={isRunning ? stopTimer : startTimer}
          style={{
            flex: 1,
            border: "none",
            borderRadius: 12,
            padding: "12px 0",
            background: isRunning ? "linear-gradient(135deg, #ef4444, #dc2626)" : "linear-gradient(135deg, #00ff9c, #00c89f)",
            color: isRunning ? "#ffffff" : "#00110a",
            fontWeight: 700,
            letterSpacing: 1,
            textTransform: "uppercase",
            cursor: "pointer",
            boxShadow: isRunning ? "0 0 22px rgba(239, 68, 68, 0.35)" : "0 0 26px rgba(0, 255, 156, 0.35)",
          }}
        >
          {isRunning ? "Stop" : "Start"}
        </button>
        <button
          onClick={resetTimer}
          disabled={isRunning}
          style={{
            flex: 1,
            borderRadius: 12,
            padding: "12px 0",
            background: "rgba(10, 15, 15, 0.6)",
            border: isRunning ? "1px solid rgba(148, 163, 184, 0.3)" : "1px solid rgba(0, 255, 156, 0.35)",
            color: isRunning ? "#6e739d" : "#d6d9d8",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: 1,
            cursor: isRunning ? "not-allowed" : "pointer",
            boxShadow: isRunning ? "none" : "0 0 18px rgba(0, 255, 156, 0.18)",
            opacity: isRunning ? 0.6 : 1,
          }}
        >
          Reset
        </button>
      </div>
      <div style={{ marginTop: 14, display: "flex", gap: 10 }}>
        <button
          onClick={isFullscreen ? exitFullscreen : requestFullscreen}
          style={{
            flex: 1,
            borderRadius: 12,
            padding: "10px 0",
            background: "rgba(10, 15, 15, 0.6)",
            border: isFullscreen ? "1px solid rgba(56, 189, 248, 0.5)" : "1px solid rgba(0, 255, 156, 0.45)",
            color: isFullscreen ? "#38bdf8" : "#00ff9c",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: 1,
            cursor: "pointer",
            boxShadow: isFullscreen ? "0 0 18px rgba(56, 189, 248, 0.25)" : "0 0 18px rgba(0, 255, 156, 0.2)",
          }}
          title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
        >
          {isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
        </button>
      </div>
      {pausedForFullscreen && !isBreak && (
        <div style={{ marginTop: 12, textAlign: "center", color: "#fbbf24", fontSize: 12, letterSpacing: 0.5 }}>
          Resume by re-entering fullscreen.
        </div>
      )}
    </div>
  );
  return ReactDOM.createPortal(
    <>
      {isOpen && panel}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          duration={toast.duration ?? 5000}
          onClose={() => setToast(null)}
        />
      )}
    </>,
    document.body
  );
}

export default function Pomodoro() {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <button
        title="Pomodoro"
        onClick={() => setIsOpen((v) => !v)}
        style={{
          position: "fixed",
          right: 20,
          bottom: 96,
          width: 52,
          height: 52,
          borderRadius: 14,
          border: "1px solid rgba(0, 255, 156, 0.4)",
          background: "linear-gradient(135deg, rgba(0, 255, 156, 0.25), rgba(0, 224, 255, 0.2))",
          color: "#00ff9c",
          fontSize: 24,
          cursor: "pointer",
          boxShadow: "0 0 24px rgba(0, 255, 156, 0.35)",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
          zIndex: 1000,
        }}
      >
        ⏱️
      </button>
      <PomodoroPanel isOpen={isOpen} setIsOpen={setIsOpen} />
    </>
  );
}
