import React, { useState ,useEffect} from 'react';

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
  //getting toal session count per user
  const [totalSessions, setTotalSessions] = useState(0);
  const [totalStudyTime, setTotalStudyTime] = useState(0);

  useEffect(() => {
    const fetchTopicCount = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch("http://localhost:5000/get_topic_count", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
  
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
  
        const data = await response.json();
        console.log("Fetched topic count data:", data);
        setTotalSessions(data.topic_count); // ✅ Correct key
      } catch (error) {
        console.error("Error fetching topic count:", error);
      }
    };
  
    fetchTopicCount();
  }, []);

  useEffect(() => {
    const fetchTotalTime = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch("http://localhost:5000/get_total_time", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
  
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
  
        const data = await response.json();
        console.log("Fetched total time data:", data);
        // total_time_spent is in minutes, store it as is
        setTotalStudyTime(data.total_time_spent || 0);
      } catch (error) {
        console.error("Error fetching total time:", error);
        // Set to 0 if fetch fails
        setTotalStudyTime(0);
      }
    };
  
    fetchTotalTime();
  }, []);
  
  const averageSessionTime = totalSessions > 0 ? Math.round(totalStudyTime / totalSessions) : 0;

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


  // Calculate topic progress
  const topicProgress = topics.map((topic) => {
    const topicSessions = studySessions.filter((s) => s.topic.includes(topic)); // Use .includes() for dynamic mapping
    const totalTime = topicSessions.reduce((acc, s) => acc + s.duration, 0);
    return {
      topic,
      totalTime,
      sessions: topicSessions.length,
      targetTime: 300, // 5 hours target
    };
  });

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
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '24px', color: 'white', backgroundColor: '#0f172a' }}>
      <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ color: 'white' }}>Profile & Progress</h2>
        <button onClick={onBack} style={{ ...mockStyle.button, backgroundColor: '#334155', color: 'white', border: '1px solid #64748b' }}>
          ← Back to Dashboard
        </button>
      </div>

      {/* --- NEW PROFILE CARD BOX (White/Light Styles) --- */}
      <div style={{ 
        backgroundColor: 'white', 
        padding: '24px', 
        borderRadius: '12px', 
        marginBottom: '32px', 
        boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
        color: '#0f172a' // Dark text for light background
      }}>
          <h3 style={{ color: '#38bdf8', margin: '0 0 16px 0', fontSize: '24px' }}>{user?.name || 'User Profile'}</h3>
          <div style={{ display: 'flex', gap: '40px', fontSize: '16px' }}>
              <p style={{ color: '#64748b', margin: 0 }}>
                  Email: <span style={{ color: '#0f172a', fontWeight: 'bold' }}>{user?.email || 'N/A'}</span>
              </p>
              <p style={{ color: '#64748b', margin: 0 }}>
                  Total Projects: <span style={{ color: '#34d399', fontWeight: 'bold' }}>{totalSessions}</span>
              </p>
              <p style={{ color: '#64748b', margin: 0 }}>
                  Total Time Logged: <span style={{ color: '#a78bfa', fontWeight: 'bold' }}>{formatTime(totalStudyTime)}</span>
              </p>
          </div>
      </div>
      {/* --------------------------------------------------- */}

      {/* Statistics Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' }}>
        <div style={{...mockStyle.card, backgroundColor: '#1e293b'}}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <div style={mockStyle.iconWrapper('#38bdf8')}><Icon name="Clock" color="#38bdf8" /></div>
            <span style={{ fontSize: '14px', color: '#94a3b8' }}>Total Study Time</span>
          </div>
          <p style={{ color: 'white', marginTop: '8px' }}>{formatTime(totalStudyTime)}</p>
        </div>

        <div style={{...mockStyle.card, backgroundColor: '#1e293b'}}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <div style={mockStyle.iconWrapper('#34d399')}><Icon name="Calendar" color="#34d399" /></div>
            <span style={{ fontSize: '14px', color: '#94a3b8' }}>Study Streak</span>
          </div>
          <p style={{ color: 'white', marginTop: '8px' }}>{calculateStreak()} days</p>
        </div>

        <div style={{...mockStyle.card, backgroundColor: '#1e293b'}}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <div style={mockStyle.iconWrapper('#a78bfa')}><Icon name="Target" color="#a78bfa" /></div>
            <span style={{ fontSize: '14px', color: '#94a3b8' }}>Total Sessions</span>
          </div>
          <p style={{ color: 'white', marginTop: '8px' }}>{totalSessions}</p>
        </div>

        <div style={{...mockStyle.card, backgroundColor: '#1e293b'}}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <div style={mockStyle.iconWrapper('#fb923c')}><Icon name="TrendingUp" color="#fb923c" /></div>
            <span style={{ fontSize: '14px', color: '#94a3b8' }}>Avg Session</span>
          </div>
          <p style={{ color: 'white', marginTop: '8px' }}>{formatTime(averageSessionTime)}</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
        {/* Study Timer */}
        <div style={{...mockStyle.card, backgroundColor: '#1e293b'}}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Icon name="BarChart3" color="#f1f5f9" />
            <h3 style={{ color: 'white', margin: 0 }}>Study Timer</h3>
          </div>

          {!activeTimer ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', color: '#94a3b8', marginBottom: '8px' }}>Select Topic</label>
                <select
                  style={{ width: '100%', padding: '12px', border: '1px solid #334155', borderRadius: '8px', backgroundColor: '#0f172a', color: 'white' }}
                  value={selectedTopic}
                  onChange={(e) => setSelectedTopic(e.target.value)}
                >
                  <option value="" style={{backgroundColor: '#1e293b'}}>Choose a topic...</option>
                  {uniqueTopics.map((topic) => (
                    <option key={topic} value={topic} style={{backgroundColor: '#1e293b'}}>
                      {topic}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={startTimer}
                disabled={!selectedTopic}
                style={{ ...mockStyle.button, ...mockStyle.greenButton, opacity: !selectedTopic ? 0.6 : 1 }}
              >
                <Icon name="Play" color="white" size={16} />
                Start Study Session
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ textAlign: 'center', padding: '32px', backgroundColor: '#0f172a', borderRadius: '8px', border: '1px solid #334155' }}>
                <p style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '8px' }}>Studying: {activeTimer.topic}</p>
                <p style={{ color: 'white', fontSize: '20px', fontWeight: 'bold' }}>{formatTime(timerMinutes)}</p>
              </div>
              <button
                onClick={stopTimer}
                style={{ ...mockStyle.button, ...mockStyle.destructiveButton }}
              >
                <Icon name="Pause" color="white" size={16} />
                Stop Session
              </button>
            </div>
          )}
        </div>

        {/* Today's Progress */}
        <div style={{...mockStyle.card, backgroundColor: '#1e293b'}}>
          <h3 style={{ color: 'white', marginBottom: '16px' }}>Today's Progress</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
              <span style={{ color: '#94a3b8' }}>Study Time</span>
              <span style={{ color: 'white' }}>{formatTime(todayStudyTime)}</span>
            </div>
            <div style={mockStyle.progressContainer}>
              <div style={{ ...mockStyle.progressFill, width: `${Math.min((todayStudyTime / 180) * 100, 100)}%` }}></div>
            </div>
            <p style={{ fontSize: '12px', color: '#64748b' }}>Daily goal: 3 hours ({formatTime(180)})</p>
          </div>
        </div>
      </div>

      {/* Topic Progress */}
      <div style={{ ...mockStyle.card, marginTop: '24px', backgroundColor: '#1e293b' }}>
        <h3 style={{ color: 'white', marginBottom: '16px' }}>Progress by Topic</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {topicProgress.map((tp) => (
            <div key={tp.topic} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'white' }}>{tp.topic}</span>
                <span style={{ fontSize: '14px', color: '#94a3b8' }}>
                  {formatTime(tp.totalTime)} / {formatTime(tp.targetTime)}
                </span>
              </div>
              <div style={mockStyle.progressContainer}>
                <div style={{ ...mockStyle.progressFill, width: `${Math.min((tp.totalTime / tp.targetTime) * 100, 100)}%` }}></div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748b' }}>
                <span>{tp.sessions} sessions</span>
                <span>{Math.round((tp.totalTime / tp.targetTime) * 100)}% complete</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      
      
    </div>
  );
}