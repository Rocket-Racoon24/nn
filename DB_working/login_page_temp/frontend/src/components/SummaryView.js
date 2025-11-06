// src/components/SummaryView.js
import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import useTextSelection from './TextSelection'; // UPDATED import
import FlashcardView from './FlashcardView';
import ConfirmDialog from './ConfirmDialog';
import Toast from './Toast';
import styles from './SummaryView.module.css';

// OLD TextSelectionWrapper component has been REMOVED

const SummaryView = ({ summaryContent, onBack }) => {
  const [pdfSummaries, setPdfSummaries] = useState([]);
  const [summaryCache, setSummaryCache] = useState({}); // Cache summaries by PDF name
  const [activeTab, setActiveTab] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingSummaries, setLoadingSummaries] = useState({});
  const [error, setError] = useState(null);
  const [openMenu, setOpenMenu] = useState(null); // Track which tab's menu is open
  const [showFlashcards, setShowFlashcards] = useState(false);
  const [flashcards, setFlashcards] = useState([]);
  const [loadingFlashcards, setLoadingFlashcards] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [toast, setToast] = useState(null);
  const menuRefs = useRef({});

  const handleAskXiao = (selectedText) => {
    window.dispatchEvent(new CustomEvent('askXiao', { detail: selectedText }));
  };
  const summaryContainerRef = useTextSelection(handleAskXiao);


  // Fetch list of PDF summaries when component loads
  useEffect(() => {
    const fetchPdfSummaries = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;

      try {
        setLoading(true);
        const res = await fetch("http://localhost:5000/get_pdf_summaries", {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        });

        if (res.ok) {
          const data = await res.json();
          const summaries = data.pdf_summaries || [];
          setPdfSummaries(summaries);
          
          // If we have summaries and no active tab, set the first one as active
          if (summaries.length > 0 && !activeTab) {
            setActiveTab(summaries[0].pdf_name);
          }
        } else {
          setError("Failed to fetch PDF summaries");
        }
      } catch (err) {
        console.error("Error fetching PDF summaries:", err);
        setError("Error loading PDF summaries");
      } finally {
        setLoading(false);
      }
    };

    fetchPdfSummaries();
  }, []);

  // Refresh summaries when a new one is generated (when summaryContent changes)
  useEffect(() => {
    if (summaryContent) {
      // Refresh the list to include the new summary
      const fetchPdfSummaries = async () => {
        const token = localStorage.getItem("token");
        if (!token) return;

        try {
          const res = await fetch("http://localhost:5000/get_pdf_summaries", {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json"
            }
          });

          if (res.ok) {
            const data = await res.json();
            const summaries = data.pdf_summaries || [];
            setPdfSummaries(summaries);
            
            // Set the most recent summary as active tab
            if (summaries.length > 0) {
              const latestSummary = summaries[0]; // Most recent is first
              setActiveTab(latestSummary.pdf_name);
              if (latestSummary.summary_content) {
                setSummaryCache(prev => ({
                  ...prev,
                  [latestSummary.pdf_name]: latestSummary.summary_content
                }));
              }
            }
          }
        } catch (err) {
          console.error("Error refreshing PDF summaries:", err);
        }
      };

      fetchPdfSummaries();
    }
  }, [summaryContent]);

  // Fetch summary when a tab is clicked (if not cached)
  useEffect(() => {
    if (activeTab && !summaryCache[activeTab] && pdfSummaries.length > 0) {
      const fetchSummary = async () => {
        const token = localStorage.getItem("token");
        if (!token) return;

        // Check if summary is already in the list
        const pdfSummary = pdfSummaries.find(pdf => pdf.pdf_name === activeTab);
        if (pdfSummary && pdfSummary.summary_content) {
          setSummaryCache(prev => ({
            ...prev,
            [activeTab]: pdfSummary.summary_content
          }));
          return;
        }

        // Otherwise fetch it
        try {
          setLoadingSummaries(prev => ({ ...prev, [activeTab]: true }));
          const encodedPdfName = encodeURIComponent(activeTab);
          const res = await fetch(`http://localhost:5000/get_pdf_summary/${encodedPdfName}`, {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json"
            }
          });

          if (res.ok) {
            const data = await res.json();
            setSummaryCache(prev => ({
              ...prev,
              [activeTab]: data.pdf_summary.summary_content
            }));
          } else {
            setError(`Failed to fetch summary for ${activeTab}`);
          }
        } catch (err) {
          console.error("Error fetching PDF summary:", err);
          setError(`Error loading summary for ${activeTab}`);
        } finally {
          setLoadingSummaries(prev => ({ ...prev, [activeTab]: false }));
        }
      };

      fetchSummary();
    }
  }, [activeTab, pdfSummaries]);

  // Handle tab click
  const handleTabClick = (pdfName, e) => {
    // Don't switch tab if clicking on menu button or menu
    if (e && (e.target.closest(`[data-menu-button]`) || e.target.closest(`[data-tab-menu]`))) {
      return;
    }
    setActiveTab(pdfName);
    setError(null);
    setOpenMenu(null); // Close any open menus
  };

  // Handle menu toggle
  const handleMenuToggle = (pdfName, e) => {
    e.stopPropagation();
    setOpenMenu(openMenu === pdfName ? null : pdfName);
  };

  // Handle flashcard generation
  const handleGenerateFlashcards = async (pdfName, e) => {
    e.stopPropagation();
    const token = localStorage.getItem("token");
    if (!token) return;

    setLoadingFlashcards(true);
    setError(null);

    try {
      // First check if flashcards already exist
      const encodedPdfName = encodeURIComponent(pdfName);
      const checkRes = await fetch(`http://localhost:5000/get_flashcards/${encodedPdfName}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      if (checkRes.ok) {
        const checkData = await checkRes.json();
        if (checkData.flashcards && checkData.flashcards.length > 0) {
          setFlashcards(checkData.flashcards);
          setShowFlashcards(true);
          setOpenMenu(null);
          setLoadingFlashcards(false);
          return;
        }
      }

      // Generate new flashcards
      const res = await fetch(`http://localhost:5000/generate_flashcards/${encodedPdfName}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      if (res.ok) {
        const data = await res.json();
        setFlashcards(data.flashcards || []);
        setShowFlashcards(true);
        setOpenMenu(null);
      } else {
        const errorData = await res.json();
        if (res.status === 503) {
          setError("AI is offline. Please start the LLM server on port 8080 and try again.");
        } else {
          setError(errorData.error || "Failed to generate flashcards");
        }
      }
    } catch (err) {
      console.error("Error generating flashcards:", err);
      setError("Error generating flashcards");
    } finally {
      setLoadingFlashcards(false);
    }
  };

  // Handle delete
  const handleDelete = (pdfName, e) => {
    e.stopPropagation();
    setOpenMenu(null);

    setConfirmDialog({
      title: 'Delete Summary',
      message: `Are you sure you want to delete the summary for "${pdfName}"? This action cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      isDangerous: true,
      onConfirm: async () => {
        const token = localStorage.getItem("token");
        if (!token) {
          setConfirmDialog(null);
          return;
        }

        try {
          const encodedPdfName = encodeURIComponent(pdfName);
          const res = await fetch(`http://localhost:5000/delete_pdf_summary/${encodedPdfName}`, {
            method: 'DELETE',
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json"
            }
          });

          if (res.ok) {
            const remaining = pdfSummaries.filter(pdf => pdf.pdf_name !== pdfName);
            if (activeTab === pdfName) {
              setActiveTab(remaining.length > 0 ? remaining[0].pdf_name : null);
            }

            setPdfSummaries(prev => prev.filter(pdf => pdf.pdf_name !== pdfName));
            setSummaryCache(prev => {
              const newCache = { ...prev };
              delete newCache[pdfName];
              return newCache;
            });
            setToast({ message: `Summary "${pdfName}" deleted successfully.`, type: 'success' });
          } else {
            setError("Failed to delete PDF summary");
            setToast({ message: "Failed to delete summary.", type: 'error' });
          }
        } catch (err) {
          console.error("Error deleting PDF summary:", err);
          setError("Error deleting PDF summary");
          setToast({ message: err.message || "Error deleting summary.", type: 'error' });
        } finally {
          setConfirmDialog(null);
        }
      },
      onCancel: () => setConfirmDialog(null)
    });
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (openMenu && menuRefs.current[openMenu]) {
        if (!menuRefs.current[openMenu].contains(event.target)) {
          setOpenMenu(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openMenu]);

  // Get current summary content
  const getCurrentSummary = () => {
    if (!activeTab) return null;
    
    // If we have cached summary, use it
    if (summaryCache[activeTab]) {
      return summaryCache[activeTab];
    }
    
    // If we have summaryContent and it's for this tab, use it
    if (summaryContent && pdfSummaries.length > 0) {
      const latestSummary = pdfSummaries.find(pdf => pdf.pdf_name === activeTab);
      if (latestSummary && latestSummary.summary_content) {
        return latestSummary.summary_content;
      }
    }
    
    return null;
  };

  // Show flashcards view if active
  if (showFlashcards) {
    return (
      <>
        <FlashcardView 
          flashcards={flashcards} 
          onBack={() => setShowFlashcards(false)} 
        />
        {confirmDialog && (
          <ConfirmDialog
            title={confirmDialog.title}
            message={confirmDialog.message}
            confirmText={confirmDialog.confirmText}
            cancelText={confirmDialog.cancelText}
            isDangerous={confirmDialog.isDangerous}
            onConfirm={confirmDialog.onConfirm}
            onCancel={confirmDialog.onCancel}
          />
        )}
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </>
    );
  }

  // Show tabs interface
  return (
    <>
      <div className={styles['summary-view']}>
        <button className={styles['back-btn']} onClick={onBack}>
          &larr; Back to Projects
        </button>
        
        {loadingFlashcards && (
          <div className={styles['loading-overlay']}>
            <p className={styles['loading']}>Generating flashcards...</p>
          </div>
        )}
        
        {loading && pdfSummaries.length === 0 ? (
          <p className={styles['loading']}>Loading PDF summaries...</p>
        ) : pdfSummaries.length === 0 ? (
          <div className={styles['no-summary-view']}>
            <div className={styles['no-summary-card']}>
              <h1>No PDF summaries yet. Upload a PDF to generate a summary!</h1>
            </div>
          </div>
        ) : (
          <>
            <h2 className={styles['neon']}>PDF Summaries</h2>
            
            {/* Tabs Container */}
            <div className={styles['tabs-container']}>
              {pdfSummaries.map((pdf, index) => (
                <div
                  key={index}
                  className={`${styles['tab-wrapper']} ${activeTab === pdf.pdf_name ? styles['tab-active'] : ''}`}
                >
                  <button
                    className={`${styles['tab']} ${activeTab === pdf.pdf_name ? styles['tab-active'] : ''}`}
                    onClick={(e) => handleTabClick(pdf.pdf_name, e)}
                  >
                    📄 {pdf.pdf_name}
                  </button>
                  <div className={styles['tab-menu-container']}>
                    <button
                      className={styles['menu-button']}
                      data-menu-button
                      onClick={(e) => handleMenuToggle(pdf.pdf_name, e)}
                      title="More options"
                    >
                      ⋯
                    </button>
                    {openMenu === pdf.pdf_name && (
                      <div
                        ref={el => menuRefs.current[pdf.pdf_name] = el}
                        className={styles['tab-menu']}
                        data-tab-menu
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          className={styles['flashcard-button']}
                          onClick={(e) => handleGenerateFlashcards(pdf.pdf_name, e)}
                        >
                          📚 Flashcards
                        </button>
                        <button
                          className={styles['delete-button']}
                          onClick={(e) => handleDelete(pdf.pdf_name, e)}
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Tab Content */}
            {error && <p className={styles['error']}>{error}</p>}
            
            {loadingSummaries[activeTab] ? (
              <div className={styles['summary-content-box']}>
                <p className={styles['loading']}>Loading summary...</p>
              </div>
            ) : (
              <div className={styles['summary-content-box']} style={{ position: 'relative' }}>
                {getCurrentSummary() ? (
                  <div 
                    ref={summaryContainerRef} 
                    className={styles['markdown-content']}
                  >
                    <ReactMarkdown>{getCurrentSummary()}</ReactMarkdown>
                  </div>
                ) : (
                  <p className={styles['loading']}>No summary available for this PDF.</p>
                )}
              </div>
            )}
          </>
        )}
      </div>
      {confirmDialog && (
        <ConfirmDialog
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmText={confirmDialog.confirmText}
          cancelText={confirmDialog.cancelText}
          isDangerous={confirmDialog.isDangerous}
          onConfirm={confirmDialog.onConfirm}
          onCancel={confirmDialog.onCancel}
        />
      )}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </>
  );
};

export default SummaryView;