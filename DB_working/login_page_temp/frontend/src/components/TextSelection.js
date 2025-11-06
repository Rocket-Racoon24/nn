// src/components/TextSelection.js (REPLACE with this code)
import { useState, useEffect, useRef, useCallback } from 'react';

// Style for the button, moved here to be self-contained
const buttonStyle = `
  position: absolute;
  background: #00ff9c;
  color: #000;
  border: none;
  border-radius: 6px;
  padding: 6px 10px;
  cursor: pointer;
  font-weight: bold;
  box-shadow: 0 2px 10px rgba(0, 255, 156, 0.5);
  z-index: 100;
  user-select: none;
  transform: translate(-50%, -100%);
  display: none; /* Start hidden */
`;

/**
 * A hook to detect text selection inside a container and show a floating button.
 * This version uses direct DOM manipulation to avoid React re-renders.
 *
 * @param {function} onAsk - Callback when the Ask button is clicked with selected text.
 * @returns {function} containerRef - A *callback ref* to attach to the scrollable container.
 */
function useTextSelection(onAsk) {
  const buttonRef = useRef(null);
  const [containerNode, setContainerNode] = useState(null);

  // This useCallback ref is the key fix.
  // It guarantees that `containerNode` is set only *after* React has
  // rendered the div and passed it to this function.
  const containerRef = useCallback(node => {
    if (node !== null) {
      setContainerNode(node);
    }
  }, []); // Empty dependency is correct

  // Store the onAsk callback in a ref so it's always up-to-date
  const onAskRef = useRef(onAsk);
  useEffect(() => {
    onAskRef.current = onAsk;
  }, [onAsk]);

  // This effect now runs *only* when `containerNode` is successfully set
  useEffect(() => {
    // If the container doesn't exist yet, do nothing.
    if (containerNode === null) {
      return;
    }
    
    // --- 1. Create and Inject the Button ---
    // Ensure button is created only once
    let button;
    if (buttonRef.current) {
        button = buttonRef.current;
    } else {
        button = document.createElement('button');
        button.innerHTML = 'Ask Xiao 💬';
        button.style.cssText = buttonStyle;

        // Prevent button click from clearing selection
        button.addEventListener('mousedown', (e) => e.preventDefault());

        // Handle the "Ask" click
        button.addEventListener('click', () => {
          const selectedText = button.dataset.selectedText;
          if (selectedText && onAskRef.current) {
            onAskRef.current(selectedText);
          }
          // Hide button and clear selection
          button.style.display = 'none';
          window.getSelection()?.removeAllRanges();
        });

        // Add the button to the container
        containerNode.appendChild(button);
        buttonRef.current = button;
    }

    // --- 2. Handle Selection Changes ---
    const handleSelectionChange = () => {
      const sel = window.getSelection();

      // Case 1: No selection
      if (!sel || sel.isCollapsed || !sel.toString().trim()) {
        button.style.display = 'none';
        return;
      }

      // Case 2: Selection is not inside our container
      if (
        !containerNode.contains(sel.anchorNode) ||
        !containerNode.contains(sel.focusNode)
      ) {
        button.style.display = 'none';
        return;
      }

      // Case 3: Valid selection
      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const containerRect = containerNode.getBoundingClientRect();

      // Calculate position relative to the container
      const top = rect.top - containerRect.top + containerNode.scrollTop - 40; // 40px above
      const left = rect.left - containerRect.left + containerNode.scrollLeft + (rect.width / 2);

      // Store the text and show the button
      button.dataset.selectedText = sel.toString().trim();
      button.style.top = `${top}px`;
      button.style.left = `${left}px`;
      button.style.display = 'block';
    };

    document.addEventListener('selectionchange', handleSelectionChange);

    // --- 3. Cleanup ---
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
      // We can leave the button in the DOM; it's hidden
    };

  }, [containerNode]); // This effect depends on the container node being ready

  // Return the callback ref for React to use
  return containerRef;
}

export default useTextSelection;