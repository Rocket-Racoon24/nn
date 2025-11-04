// TextSelection.js - Hook for handling text selection and "Ask Xiao" button
import { useState, useEffect, useRef } from 'react';

const useTextSelection = (onAskXiao, enabled = true) => {
  const [selectedText, setSelectedText] = useState('');
  const [selectionPosition, setSelectionPosition] = useState({ top: 0, left: 0 });
  const [showAskButton, setShowAskButton] = useState(false);
  const containerRef = useRef(null);
  const buttonRef = useRef(null);

  useEffect(() => {
    if (!enabled) return;

    const handleSelection = () => {
      const selection = window.getSelection();
      
      // Check if there's a valid selection
      if (!selection || selection.rangeCount === 0) {
        setShowAskButton(false);
        return;
      }

      const range = selection.getRangeAt(0);
      const text = selection.toString().trim();

      // Check if selection is within a text node (not selecting entire elements)
      const commonAncestor = range.commonAncestorContainer;
      
      // Prevent selection if clicking on buttons or interactive elements
      if (commonAncestor.nodeType === Node.ELEMENT_NODE) {
        const element = commonAncestor;
        if (element.tagName === 'BUTTON' || 
            element.tagName === 'A' || 
            element.closest('button') || 
            element.closest('a')) {
          setShowAskButton(false);
          return;
        }
      }

      // Check if selection is reasonable (not too large, not too small)
      if (text.length > 3 && text.length < 1000) { // Min 3 chars, max 1000 to prevent full page selection
        const rect = range.getBoundingClientRect();
        
        setSelectedText(text);
        setSelectionPosition({
          top: rect.top + window.scrollY - 60, // Position above the selection
          left: rect.left + window.scrollX + rect.width / 2
        });
        setShowAskButton(true);
      } else {
        setShowAskButton(false);
      }
    };

    const handleMouseUp = (e) => {
      // Only process if selection is within content areas
      const target = e.target;
      // Check if target is an Element (has closest method)
      if (target && typeof target.closest === 'function') {
        const isContentArea = target.closest('.markdown-content') || 
                             target.closest('.study-item-detail-display') ||
                             target.closest('[data-selectable]');
        
        if (isContentArea) {
          setTimeout(handleSelection, 10);
        } else {
          setShowAskButton(false);
        }
      } else {
        // If target is not an Element, check parent
        const parent = target?.parentElement;
        if (parent && typeof parent.closest === 'function') {
          const isContentArea = parent.closest('.markdown-content') || 
                               parent.closest('.study-item-detail-display') ||
                               parent.closest('[data-selectable]');
          if (isContentArea) {
            setTimeout(handleSelection, 10);
          } else {
            setShowAskButton(false);
          }
        } else {
          setShowAskButton(false);
        }
      }
    };

    const handleClick = (e) => {
      // Close button if clicking outside
      if (buttonRef.current && !buttonRef.current.contains(e.target)) {
        const selection = window.getSelection();
        if (selection.toString().trim().length === 0) {
          setShowAskButton(false);
        }
      }
    };

    // Prevent text selection on buttons and interactive elements
    const preventSelection = (e) => {
      const target = e.target;
      // Check if target is an Element node
      if (target && target.nodeType === Node.ELEMENT_NODE) {
        if (target.tagName === 'BUTTON' || 
            target.tagName === 'A' || 
            (typeof target.closest === 'function' && (
              target.closest('button') || 
              target.closest('a') ||
              target.closest('.tab') ||
              target.closest('.menu-button')
            ))) {
          window.getSelection().removeAllRanges();
        }
      }
    };

    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('click', handleClick, true);
    document.addEventListener('selectstart', preventSelection);

    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('click', handleClick, true);
      document.removeEventListener('selectstart', preventSelection);
    };
  }, [enabled]);

  const handleAskXiao = (e) => {
    e.stopPropagation();
    if (selectedText && onAskXiao) {
      onAskXiao(selectedText);
      setShowAskButton(false);
      window.getSelection().removeAllRanges(); // Clear selection
    }
  };

  const AskButton = showAskButton ? (
    <div
      ref={buttonRef}
      style={{
        position: 'absolute',
        top: `${selectionPosition.top}px`,
        left: `${selectionPosition.left}px`,
        transform: 'translateX(-50%)',
        zIndex: 10000,
        background: 'rgba(14, 25, 27, 0.8)',
        color: '#00ff9c',
        border: '1px solid rgba(0, 255, 156, 0.3)',
        padding: '8px 16px',
        borderRadius: '8px',
        cursor: 'pointer',
        boxShadow: '0 4px 12px rgba(0, 255, 156, 0.2)',
        fontWeight: 'bold',
        fontSize: '14px',
        whiteSpace: 'nowrap',
        pointerEvents: 'auto',
        backdropFilter: 'blur(5px)',
        WebkitBackdropFilter: 'blur(5px)',
        transition: 'all 0.3s ease'
      }}
      onClick={handleAskXiao}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'rgba(0, 255, 156, 0.1)';
        e.currentTarget.style.borderColor = 'rgba(0, 255, 156, 0.7)';
        e.currentTarget.style.boxShadow = '0 0 15px rgba(0, 255, 156, 0.3)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'rgba(14, 25, 27, 0.8)';
        e.currentTarget.style.borderColor = 'rgba(0, 255, 156, 0.3)';
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 255, 156, 0.2)';
      }}
    >
      Ask Xiao
    </div>
  ) : null;

  return { AskButton, selectedText };
};

export default useTextSelection;

