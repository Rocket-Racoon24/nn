import React, { useState } from 'react';

// Mock replacements for UI components and icons
const mockStyle = {
  card: { padding: '24px', backgroundColor: '#f8f8f8', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', color: '#0f172a' },
  button: { padding: '10px 15px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' },
  outlineButton: { backgroundColor: 'white', color: 'black', border: '1px solid #ccc' },
  greenButton: { backgroundColor: '#34d399', color: 'white', border: 'none' },
  destructiveButton: { backgroundColor: '#ef4444', color: 'white', border: 'none' },
  progressContainer: { height: '8px', backgroundColor: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#3b82f6', borderRadius: '4px' },
  iconWrapper: (color) => ({ padding: '8px', backgroundColor: `${color}10`, borderRadius: '8px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }),
};

function Icon({ name, color, size = 20 }) {
  // Simple text placeholder for icons
  const iconMap = {
    Clock: '⏰',
    Calendar: '🗓️',
    Target: '🎯',
    TrendingUp: '📈',
    Play: '▶️',
    Pause: '⏸️',
    BarChart3: '📊',
  };
  return <span style={{ fontSize: `${size}px`, color: color }}>{iconMap[name] || '?'}</span>;
}

// Renamed from ProgressTracker to Profile and added 'user' prop
export function Profile({ onBack, topics, user }) {
  // REMOVED <StudySession[]>
  const [studySessions, setStudySessions] = useState([
    {
      id: '1',
      topic: 'Introduction to Machine Learning',
      duration: 45,
      date: new Date(Date.now() - 86400000 * 2),
      completed: true,
    },
    {
      id: '2',
      topic: 'Core Concepts of Web Dev',
      duration: 60,
      date: new Date(Date.now() - 86400000),
      completed: true,
    },
    {
      id: '3',
      topic: 'Introduction to Machine Learning',
      duration: 30,
      date: new Date(),
      completed: true,
    },
  ]);

  // activeTimer is now a simple null or object state
  const [activeTimer, setActiveTimer] = useState(null);
  const [timerMinutes, setTimerMinutes] = useState(0);
  const [selectedTopic, setSelectedTopic] = useState('');

  // Calculate statistics (used for both Profile Card and Stats)
  const derivedTotalStudyTime = studySessions.reduce((acc, session) => acc + session.duration, 0);
  const derivedTotalSessions = studySessions.length;
  const [totalStudyTime, setTotalStudyTime] = useState(derivedTotalStudyTime);
  const [totalSessions, setTotalSessions] = useState(derivedTotalSessions);
  const averageSessionTime = totalSessions > 0 ? Math.round(totalStudyTime / totalSessions) : 0;

  // Fetch topic count from backend (overrides derived count when available)
  React.useEffect(() => {
    const fetchTopicCount = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;
        const res = await fetch("http://localhost:5000/get_topic_count", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        if (typeof data.topic_count === 'number') {
          setTotalSessions(data.topic_count);
        }
      } catch (_) { /* silent */ }
    };
    fetchTopicCount();
  }, []);

  // Fetch total time spent from backend (overrides derived time when available)
  React.useEffect(() => {
    const fetchTotalTime = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;
        const res = await fetch("http://localhost:5000/get_total_time", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        if (typeof data.total_time_spent === 'number') {
          setTotalStudyTime(Math.round(data.total_time_spent));
        }
      } catch (_) { /* silent */ }
    };
    fetchTotalTime();
  }, []);

  // Calculate today's study time
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStudyTime = studySessions
    .filter((session) => {
      const sessionDate = new Date(session.date);
      sessionDate.setHours(0, 0, 0, 0);
      return sessionDate.getTime() === today.getTime();
    })
    .reduce((acc, session) => acc + session.duration, 0);

  // Calculate streak (consecutive days with study sessions)
  const calculateStreak = () => {
    const DAY_MS = 86400000;
    const sortedDates = studySessions
      .map((s) => {
        const d = new Date(s.date);
        d.setHours(0, 0, 0, 0);
        return d.getTime();
      })
      .filter((v, i, a) => a.indexOf(v) === i)
      .sort((a, b) => b - a);

    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);
    let targetDateMs = currentDate.getTime();
    let currentStreak = 0;
    let uniqueDates = new Set(sortedDates);

    // Check if session happened today
    if (uniqueDates.has(targetDateMs)) {
      currentStreak++;
      targetDateMs -= DAY_MS;
    } else if (uniqueDates.has(targetDateMs - DAY_MS)) {
      // Check if streak started yesterday (so today was missed, but still 1 day streak)
      targetDateMs -= DAY_MS;
    } else {
      return 0; // No session today or yesterday, streak is 0
    }

    // Continue checking backwards
    while (uniqueDates.has(targetDateMs)) {
      currentStreak++;
      targetDateMs -= DAY_MS;
    }

    return currentStreak;
  };


  // Topic progress based on quizzes (MCQ + Descriptive); fetched from backend
  const [topicProgress, setTopicProgress] = useState([]);
  React.useEffect(() => {
    const fetchTopicProgress = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;
        const res = await fetch("http://localhost:5000/get_topic_progress", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data.topic_progress)) {
          setTopicProgress(data.topic_progress);
        }
      } catch (_) { /* silent */ }
    };
    fetchTopicProgress();
  }, []);

  const formatTime = (minutes) => {
    if (minutes < 0) return '0m';
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const startTimer = () => {
    if (!selectedTopic) return;
    setActiveTimer({
      topic: selectedTopic,
      startTime: new Date(),
      isRunning: true,
    });
    setTimerMinutes(0); // Reset timer minutes on start
  };

  const stopTimer = () => {
    if (!activeTimer) return;

    const endTime = new Date();
    // Calculate duration based on start time, rounded to the nearest minute
    const durationMs = endTime.getTime() - activeTimer.startTime.getTime();
    const durationMinutes = Math.round(durationMs / 60000);

    const newSession = {
      id: Date.now().toString(),
      topic: activeTimer.topic,
      duration: durationMinutes,
      date: endTime,
      completed: true,
    };

    setStudySessions((prevSessions) => [...prevSessions, newSession]);
    setActiveTimer(null);
    setTimerMinutes(0);
  };
    
  // Update timer display every second while running
  React.useEffect(() => {
    if (activeTimer && activeTimer.isRunning) {
      const intervalId = setInterval(() => {
        const elapsedMs = new Date().getTime() - activeTimer.startTime.getTime();
        setTimerMinutes(Math.floor(elapsedMs / 60000));
      }, 1000); // Update every second for smooth display

      return () => clearInterval(intervalId);
    }
  }, [activeTimer]);


  // Merge the user-provided topics with the default session topics for the select dropdown
  const uniqueTopics = Array.from(new Set([
    ...topics,
    ...studySessions.map(s => s.topic)
  ]));


  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '24px', color: '#e5fff3', backgroundColor: '#0b1213' }}>
      <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ color: '#00ff9c', textShadow: '0 0 8px rgba(0,255,156,0.3)' }}>Profile & Progress</h2>
        <button onClick={onBack} style={{ ...mockStyle.button, backgroundColor: 'transparent', color: '#00ff9c', border: '1px solid rgba(0,255,156,0.4)' }}>
          ← Back to Dashboard
        </button>
      </div>

      {/* --- Profile Summary (Dark Neon) --- */}
      <div style={{ 
        backgroundColor: 'rgba(14,25,27,0.6)', 
        padding: '24px', 
        borderRadius: '12px', 
        marginBottom: '32px', 
        border: '1px solid rgba(0,255,156,0.2)',
        boxShadow: '0 0 15px rgba(0, 255, 156, 0.1)'
      }}>
          <h3 style={{ color: '#00ff9c', margin: '0 0 16px 0', fontSize: '22px', textShadow: '0 0 8px rgba(0,255,156,0.35)' }}>{user?.name || 'User Profile'}</h3>
          <div style={{ display: 'flex', gap: '40px', fontSize: '16px' }}>
              <p style={{ color: '#a9ffdf', margin: 0 }}>
                  Email: <span style={{ color: '#e5fff3', fontWeight: 'bold' }}>{user?.email || 'N/A'}</span>
              </p>
              <p style={{ color: '#a9ffdf', margin: 0 }}>
                  Total Projects: <span style={{ color: '#00ff9c', fontWeight: 'bold' }}>{totalSessions}</span>
              </p>
              <p style={{ color: '#a9ffdf', margin: 0 }}>
                  Total Time Logged: <span style={{ color: '#7cf9ff', fontWeight: 'bold' }}>{formatTime(totalStudyTime)}</span>
              </p>
          </div>
      </div>
      {/* --------------------------------------------------- */}

      {/* Statistics Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' }}>
        <div style={{...mockStyle.card, backgroundColor: 'rgba(14,25,27,0.6)', border: '1px solid rgba(0,255,156,0.2)'}}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <div style={mockStyle.iconWrapper('#00ff9c')}><Icon name="Clock" color="#00ff9c" /></div>
            <span style={{ fontSize: '14px', color: '#a9ffdf' }}>Total Study Time</span>
          </div>
          <p style={{ color: '#e5fff3', marginTop: '8px' }}>{formatTime(totalStudyTime)}</p>
        </div>

        <div style={{...mockStyle.card, backgroundColor: 'rgba(14,25,27,0.6)', border: '1px solid rgba(0,255,156,0.2)'}}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <div style={mockStyle.iconWrapper('#00ff9c')}><Icon name="Calendar" color="#00ff9c" /></div>
            <span style={{ fontSize: '14px', color: '#a9ffdf' }}>Study Streak</span>
          </div>
          <p style={{ color: '#e5fff3', marginTop: '8px' }}>    0 days</p>
        </div>

        <div style={{...mockStyle.card, backgroundColor: 'rgba(14,25,27,0.6)', border: '1px solid rgba(0,255,156,0.2)'}}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <div style={mockStyle.iconWrapper('#00ff9c')}><Icon name="Target" color="#00ff9c" /></div>
            <span style={{ fontSize: '14px', color: '#a9ffdf' }}>Total Sessions</span>
          </div>
          <p style={{ color: '#e5fff3', marginTop: '8px' }}>{totalSessions}</p>
        </div>

        <div style={{...mockStyle.card, backgroundColor: 'rgba(14,25,27,0.6)', border: '1px solid rgba(0,255,156,0.2)'}}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <div style={mockStyle.iconWrapper('#00ff9c')}><Icon name="TrendingUp" color="#00ff9c" /></div>
            <span style={{ fontSize: '14px', color: '#a9ffdf' }}>Avg Session</span>
          </div>
          <p style={{ color: '#e5fff3', marginTop: '8px' }}>{formatTime(averageSessionTime)}</p>
        </div>
      </div>

      {/* Sections removed: Study Timer and Today's Progress */}

      {/* Topic Progress (based on mandatory quizzes passed) */}
      <div style={{ ...mockStyle.card, marginTop: '24px', backgroundColor: 'rgba(14,25,27,0.6)', border: '1px solid rgba(0,255,156,0.2)' }}>
        <h3 style={{ color: '#e5fff3', marginBottom: '16px' }}>Progress by Topic</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {(topicProgress.length ? topicProgress : topics.map(t => ({ topic: t, progressPercent: 0, quizzesPassed: 0, quizzesRequired: 0 })) ).map((tp) => {
            const percent = Math.max(0, Math.min(100, Math.round(tp.progressPercent || 0)));
            return (
              <div key={tp.topic} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#e5fff3' }}>{tp.topic}</span>
                  <span style={{ fontSize: '14px', color: '#a9ffdf' }}>{percent}%</span>
                </div>
                <div style={{ ...mockStyle.progressContainer, backgroundColor: 'rgba(0,255,156,0.15)' }}>
                  <div style={{ ...mockStyle.progressFill, backgroundColor: '#00ff9c', width: `${percent}%`, boxShadow: '0 0 8px rgba(0,255,156,0.5)' }}></div>
                </div>
                {typeof tp.quizzesPassed === 'number' && typeof tp.quizzesRequired === 'number' && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#a9ffdf' }}>
                    <span>{tp.quizzesPassed}/{tp.quizzesRequired} quizzes</span>
                    <span>{percent}% complete</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      {/* Section removed: Recent Sessions */}
    </div>
  );
}