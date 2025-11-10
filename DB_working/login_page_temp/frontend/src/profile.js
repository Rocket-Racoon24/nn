import React, { useState } from 'react';

// Neon themed styles
const neonStyle = {
  card: {
    padding: '24px',
    background: 'rgba(14, 25, 27, 0.7)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    borderRadius: '16px',
    border: '1px solid rgba(0, 255, 156, 0.2)',
    boxShadow: '0 8px 32px rgba(0, 255, 156, 0.1)',
    color: '#e5fff3',
    transition: 'all 0.3s ease',
  },
  cardHover: {
    transform: 'translateY(-4px)',
    boxShadow: '0 12px 48px rgba(0, 255, 156, 0.2)',
    borderColor: 'rgba(0, 255, 156, 0.4)',
  },
  button: {
    padding: '12px 15px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '14px',
    transition: 'all 0.3s ease',
    border: 'none',
  },
  iconWrapper: (color) => ({
    padding: '12px',
    background: `linear-gradient(135deg, ${color}15, ${color}05)`,
    borderRadius: '12px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: `1px solid ${color}30`,
    boxShadow: `0 4px 12px ${color}20`,
  }),
};

function Icon({ name, color, size = 24 }) {
  const iconMap = {
    Clock: '⏰',
    Calendar: '🗓️',
    Target: '🎯',
    TrendingUp: '📈',
    Play: '▶️',
    Pause: '⏸️',
    BarChart3: '📊',
  };
  return <span style={{ fontSize: `${size}px`, color: color, filter: `drop-shadow(0 0 4px ${color}80)` }}>{iconMap[name] || '?'}</span>;
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

  // XP state
  const [xp, setXp] = useState(0);
  const [level, setLevel] = useState(1);
  const [badge, setBadge] = useState('Rookie');
  const [nextCap, setNextCap] = useState(100);
  const [xpProgress, setXpProgress] = useState(0);

  React.useEffect(() => {
    const fetchXP = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;
        const res = await fetch("http://localhost:5000/get_xp", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        if (typeof data.xp === 'number') setXp(data.xp);
        if (typeof data.level === 'number') setLevel(data.level);
        if (typeof data.next_level_cap === 'number') setNextCap(data.next_level_cap);
        if (typeof data.progress_percent === 'number') setXpProgress(Math.max(0, Math.min(100, data.progress_percent)));
        if (typeof data.badge === 'string') setBadge(data.badge);
      } catch (_) {}
    };
    fetchXP();
  }, []);

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

  const [hoveredCard, setHoveredCard] = useState(null);

  return (
    <div style={{
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '32px',
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #0a0e0f 0%, #0f1a1c 100%)',
    }}>
      {/* Header */}
      <div style={{
        marginBottom: '40px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        animation: 'fadeIn 0.5s ease-out',
      }}>
        <h1 style={{
          fontSize: '2rem',
          fontWeight: '700',
          background: 'linear-gradient(90deg, #00ff9c, #00d68a)',
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          color: 'transparent',
          filter: 'drop-shadow(0 0 12px rgba(0, 255, 156, 0.5)) drop-shadow(0 0 24px rgba(0, 255, 156, 0.2))',
          margin: 0,
        }}>
          🚀 Profile & Progress  
        </h1>
        <button
          onClick={onBack}
          style={{
            ...neonStyle.button,
            background: 'linear-gradient(90deg, #00ff9c, #00d68a)',
            color: '#000',
            boxShadow: '0 0 20px rgba(0, 255, 156, 0.3)',
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = 'scale(1.05)';
            e.target.style.boxShadow = '0 0 30px rgba(0, 255, 156, 0.5)';
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'scale(1)';
            e.target.style.boxShadow = '0 0 20px rgba(0, 255, 156, 0.3)';
          }}
        >
          ← Back to Dashboard
        </button>
      </div>

      {/* Profile Card with Glassmorphism */}
      <div
        style={{
          ...neonStyle.card,
          padding: '32px',
          marginBottom: '40px',
          background: 'linear-gradient(135deg, rgba(14, 25, 27, 0.9), rgba(14, 25, 27, 0.7))',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Animated background glow */}
        <div style={{
          position: 'absolute',
          top: '-50%',
          right: '-50%',
          width: '100%',
          height: '100%',
          background: 'radial-gradient(circle, rgba(0, 255, 156, 0.1) 0%, transparent 70%)',
          animation: 'pulse 4s ease-in-out infinite',
        }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #00ff9c, #00d68a)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2rem',
              boxShadow: '0 0 30px rgba(0, 255, 156, 0.4)',
            }}>
              👤
            </div>
            <div>
              <h2 style={{
                color: '#00ff9c',
                margin: '0 0 8px 0',
                fontSize: '28px',
                fontWeight: '700',
                textShadow: '0 0 12px rgba(0, 255, 156, 0.5)',
              }}>
                {user?.name || 'User Profile'}
              </h2>
              <p style={{ color: '#a9ffdf', margin: 0, fontSize: '16px' }}>
                ✉️ {user?.email || 'N/A'}
              </p>
            </div>
          </div>

          {/* XP Progress Bar */}
          <div style={{
            padding: '24px',
            background: 'rgba(0, 255, 156, 0.05)',
            borderRadius: '12px',
            border: '1px solid rgba(0, 255, 156, 0.2)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ color: '#00ff9c', fontSize: '18px', fontWeight: 'bold' }}>
                ⚡ {xp} XP
              </span>
              <span style={{ color: '#00ff9c', fontSize: '18px', fontWeight: 'bold' }}>
                🏆 Level {level} • {badge}
              </span>
            </div>
            <div style={{
              height: '16px',
              background: 'rgba(0, 0, 0, 0.4)',
              borderRadius: '8px',
              overflow: 'hidden',
              border: '1px solid rgba(0, 255, 156, 0.3)',
              position: 'relative',
            }}>
              <div style={{
                width: `${xpProgress}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #00ff9c, #00d68a)',
                boxShadow: '0 0 20px rgba(0, 255, 156, 0.6), inset 0 2px 4px rgba(255, 255, 255, 0.2)',
                transition: 'width 1s ease-out',
                position: 'relative',
              }}>
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent)',
                  animation: 'shimmer 2s infinite',
                }} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
              <span style={{ color: '#7cf9ff', fontSize: '13px' }}>0 XP</span>
              <span style={{ color: '#7cf9ff', fontSize: '13px' }}>{nextCap} XP</span>
            </div>
          </div>
        </div>

        {/* Add CSS animations */}
        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 0.3; transform: scale(1); }
            50% { opacity: 0.6; transform: scale(1.1); }
          }
          @keyframes shimmer {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-20px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </div>

      {/* Statistics Cards with Hover Effects */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '40px' }}>
        {[
          { icon: 'Clock', label: 'Total Study Time', value: formatTime(totalStudyTime), color: '#00ff9c' },
          { icon: 'Calendar', label: 'Study Streak', value: '0 days', color: '#00d68a' },
          { icon: 'Target', label: 'Total Sessions', value: totalSessions, color: '#00ff9c' },
          { icon: 'TrendingUp', label: 'Avg Session', value: formatTime(averageSessionTime), color: '#00d68a' },
        ].map((stat, idx) => (
          <div
            key={idx}
            style={{
              ...neonStyle.card,
              padding: '24px',
              cursor: 'pointer',
              ...(hoveredCard === idx ? neonStyle.cardHover : {}),
            }}
            onMouseEnter={() => setHoveredCard(idx)}
            onMouseLeave={() => setHoveredCard(null)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
              <div style={neonStyle.iconWrapper(stat.color)}>
                <Icon name={stat.icon} color={stat.color} size={28} />
              </div>
              <span style={{
                fontSize: '14px',
                color: '#a9ffdf',
                fontWeight: '500',
                letterSpacing: '0.5px',
              }}>
                {stat.label}
              </span>
            </div>
            <p style={{
              color: '#e5fff3',
              fontSize: '32px',
              fontWeight: 'bold',
              margin: 0,
              textShadow: '0 0 10px rgba(0, 255, 156, 0.3)',
            }}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Sections removed: Study Timer and Today's Progress */}

      {/* Topic Progress Section */}
      <div style={{
        ...neonStyle.card,
        padding: '32px',
        marginTop: '24px',
      }}>
        <h3 style={{
          color: '#00ff9c',
          marginBottom: '24px',
          fontSize: '24px',
          fontWeight: 'bold',
          textShadow: '0 0 12px rgba(0, 255, 156, 0.5)',
        }}>
          📚 Progress by Topic
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {(topicProgress.length ? topicProgress : topics.map(t => ({ topic: t, progressPercent: 0, quizzesPassed: 0, quizzesRequired: 0 })) ).map((tp, idx) => {
            const percent = Math.max(0, Math.min(100, Math.round(tp.progressPercent || 0)));
            return (
              <div
                key={tp.topic}
                style={{
                  padding: '20px',
                  background: 'rgba(0, 255, 156, 0.05)',
                  borderRadius: '12px',
                  border: '1px solid rgba(0, 255, 156, 0.15)',
                  transition: 'all 0.3s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(0, 255, 156, 0.1)';
                  e.currentTarget.style.borderColor = 'rgba(0, 255, 156, 0.3)';
                  e.currentTarget.style.transform = 'translateX(8px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(0, 255, 156, 0.05)';
                  e.currentTarget.style.borderColor = 'rgba(0, 255, 156, 0.15)';
                  e.currentTarget.style.transform = 'translateX(0)';
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{
                    color: '#e5fff3',
                    fontSize: '16px',
                    fontWeight: '600',
                  }}>
                    {tp.topic}
                  </span>
                  <span style={{
                    fontSize: '18px',
                    fontWeight: 'bold',
                    color: percent === 100 ? '#00ff9c' : '#a9ffdf',
                    textShadow: percent === 100 ? '0 0 8px rgba(0, 255, 156, 0.5)' : 'none',
                  }}>
                    {percent}%
                  </span>
                </div>
                <div style={{
                  height: '12px',
                  background: 'rgba(0, 0, 0, 0.4)',
                  borderRadius: '6px',
                  overflow: 'hidden',
                  border: '1px solid rgba(0, 255, 156, 0.25)',
                  position: 'relative',
                }}>
                  <div style={{
                    width: `${percent}%`,
                    height: '100%',
                    background: `linear-gradient(90deg, #00ff9c, #00d68a)`,
                    boxShadow: '0 0 12px rgba(0, 255, 156, 0.6)',
                    transition: 'width 0.8s ease-out',
                    position: 'relative',
                  }}>
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent)',
                      animation: 'shimmer 2s infinite',
                    }} />
                  </div>
                </div>
                {typeof tp.quizzesPassed === 'number' && typeof tp.quizzesRequired === 'number' && (
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginTop: '12px',
                    fontSize: '13px',
                    color: '#a9ffdf',
                  }}>
                    <span>✅ {tp.quizzesPassed}/{tp.quizzesRequired} quizzes passed</span>
                    <span>{percent === 100 ? '🎉 Complete!' : `${100 - percent}% remaining`}</span>
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