import React, { useState, useEffect, useRef } from 'react';

/**
 * A hook to detect text selection inside a container and show a floating button.
 * It relies entirely on the browser’s native text selection, no interference.
 *
 * @param {function} onAsk - Callback when the Ask button is clicked with selected text.
 * @returns {[React.RefObject, JSX.Element]} containerRef and floating button JSX.
 */
function useTextSelection(onAsk) {
  const containerRef = useRef(null);
  const [selection, setSelection] = useState(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleSelectionChange = () => {
      const sel = window.getSelection();

      // No active selection or user cleared it
      if (!sel || sel.isCollapsed || !sel.toString().trim()) {
        setSelection(null);
        return;
      }

      // Ensure selection is inside our container
      if (
        !container.contains(sel.anchorNode) ||
        !container.contains(sel.focusNode)
      ) {
        setSelection(null);
        return;
      }

      // Get position of the selected text
      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();

      // Calculate position relative to the container
      const top =
        rect.top - containerRect.top + container.scrollTop - 40; // 40px above selection
      const left =
        rect.left - containerRect.left + container.scrollLeft + rect.width / 2;

      setSelection({
        text: sel.toString().trim(),
        top,
        left,
      });
    };

    // Attach selection change listener
    document.addEventListener('selectionchange', handleSelectionChange);

    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, [onAsk]);

  const handleAskClick = () => {
    if (selection) {
      onAsk(selection.text);
      setSelection(null);
      window.getSelection()?.removeAllRanges(); // optional: clear browser highlight
    }
  };

  // Floating "Ask" button
  const AskButton = selection ? (
    <button
      data-ask-button
      onMouseDown={(e) => e.preventDefault()} // prevent losing selection
      onClick={handleAskClick}
      style={{
        position: 'absolute',
        top: `${selection.top}px`,
        left: `${selection.left}px`,
        transform: 'translate(-50%, -100%)',
        background: '#00ff9c',
        color: '#000',
        border: 'none',
        borderRadius: '6px',
        padding: '6px 10px',
        cursor: 'pointer',
        fontWeight: 'bold',
        boxShadow: '0 2px 10px rgba(0, 255, 156, 0.5)',
        zIndex: 100,
        userSelect: 'none',
      }}
    >
      Ask Xiao 💬
    </button>
  ) : null;

  return [containerRef, AskButton];
}

export default useTextSelection;
