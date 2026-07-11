import { useState, useEffect, useRef } from 'react';
import { articleAPI, authAPI, filterAPI, commentAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { 
  FiCpu, FiDatabase, FiActivity, FiDownload, FiSettings, 
  FiShield, FiTerminal, FiSliders, FiZap, FiHardDrive 
} from 'react-icons/fi';

const AdminSystemCenter = () => {
  const [activeTab, setActiveTab] = useState('playground');

  // AI Safety Simulator
  const [toxicityThreshold, setToxicityThreshold] = useState(75);
  const [profanityThreshold, setProfanityThreshold] = useState(80);
  const [testText, setTestText] = useState('');
  const [simResult, setSimResult] = useState(null);

  // Database Archival
  const [exporting, setExporting] = useState(null);

  // Live Diagnostics (Simulated)
  const [metrics, setMetrics] = useState({
    cpu: 24,
    memory: 42,
    latency: 18,
    websockets: 54,
  });
  const [logs, setLogs] = useState([
    { id: 1, time: new Date().toLocaleTimeString(), text: 'System diagnostics engine initialized.', type: 'info' },
    { id: 2, time: new Date().toLocaleTimeString(), text: 'AI Safety Model v2.4 active with baseline rules.', type: 'security' },
    { id: 3, time: new Date().toLocaleTimeString(), text: 'Websocket Gateway listening on port 5000.', type: 'info' }
  ]);

  const logIdRef = useRef(3);

  // Simulated metrics and log updates
  useEffect(() => {
    const metricsInterval = setInterval(() => {
      setMetrics(prev => ({
        cpu: Math.max(5, Math.min(95, prev.cpu + Math.floor(Math.random() * 15) - 7)),
        memory: Math.max(20, Math.min(90, prev.memory + Math.floor(Math.random() * 5) - 2)),
        latency: Math.max(8, Math.min(80, prev.latency + Math.floor(Math.random() * 9) - 4)),
        websockets: Math.max(10, prev.websockets + Math.floor(Math.random() * 5) - 2)
      }));
    }, 3000);

    const logTemplates = [
      { text: 'API Request resolved: GET /api/articles - status 200', type: 'info' },
      { text: 'Database query optimizer executed: vacuum tables articles_index', type: 'info' },
      { text: 'AI Safety Agent checked submission title: No alerts matched.', type: 'security' },
      { text: 'Websocket client authenticated: student_session_u78a', type: 'info' },
      { text: 'Security log triggered: block duration updated for user_9302', type: 'warning' },
      { text: 'Memory allocation cleanup completed (garbage collection)', type: 'info' },
      { text: 'Alert: automated check flagged potential spam comments from IP 192.168.1.92', type: 'warning' }
    ];

    const logInterval = setInterval(() => {
      const template = logTemplates[Math.floor(Math.random() * logTemplates.length)];
      logIdRef.current += 1;
      setLogs(prev => [
        { id: logIdRef.current, time: new Date().toLocaleTimeString(), text: template.text, type: template.type },
        ...prev.slice(0, 49) // Keep last 50 logs
      ]);
    }, 4500);

    return () => {
      clearInterval(metricsInterval);
      clearInterval(logInterval);
    };
  }, []);

  // AI Moderation Simulator Logic
  const handleSimulateText = (text) => {
    setTestText(text);
    if (!text.trim()) {
      setSimResult(null);
      return;
    }

    // Mock AI calculation logic
    let score = 0;
    let matchedCategory = 'None';
    const lowerText = text.toLowerCase();

    // Mock profanity matches
    const profanities = ['fuck', 'shit', 'asshole', 'bitch', 'bastard', 'crap', 'idiot'];
    const hateWords = ['hate', 'kill', 'threat', 'racist', 'die', 'abuse'];

    const hasProfanity = profanities.some(w => lowerText.includes(w));
    const hasHate = hateWords.some(w => lowerText.includes(w));

    if (hasHate) {
      score = Math.floor(Math.random() * 20) + 80; // 80-99%
      matchedCategory = 'Hate Speech / Toxicity';
    } else if (hasProfanity) {
      score = Math.floor(Math.random() * 25) + 70; // 70-94%
      matchedCategory = 'Profanity';
    } else {
      score = Math.floor(Math.random() * 30) + 5; // 5-34%
    }

    const toxicityScore = score;
    const profanityScore = hasProfanity ? score - 5 : Math.floor(Math.random() * 15);

    const isFlagged = toxicityScore >= toxicityThreshold || profanityScore >= profanityThreshold;

    let action = 'Approve & Publish';
    if (isFlagged) {
      action = toxicityScore > 90 ? 'Auto-Block / Reject' : 'Send to Moderation Queue';
    }

    setSimResult({
      toxicityScore,
      profanityScore,
      matchedCategory,
      isFlagged,
      action
    });
  };

  // CSV/JSON Export logic
  const handleExportData = async (type, format) => {
    setExporting(type);
    try {
      let data = [];
      let filename = `${type}_export_${Date.now()}`;

      if (type === 'articles') {
        const res = await articleAPI.getAll({ limit: 200 });
        data = res.data.data.map(a => ({
          id: a._id,
          title: a.title,
          category: a.category,
          status: a.status,
          views: a.views,
          author: a.author?.name || 'Anonymous',
          authorEmail: a.author?.email || '',
          createdAt: a.createdAt
        }));
      } else if (type === 'comments') {
        const res = await commentAPI.getPending();
        data = res.data.data.map(c => ({
          id: c._id,
          text: c.text,
          authorName: c.author?.name || 'Anonymous',
          authorEmail: c.author?.email || '',
          articleTitle: c.article?.title || '',
          createdAt: c.createdAt
        }));
      } else if (type === 'users') {
        const res = await authAPI.getAllUsers();
        data = res.data.data.map(u => ({
          id: u._id,
          name: u.name,
          email: u.email,
          role: u.role,
          isBlocked: u.isBlocked,
          createdAt: u.createdAt
        }));
      } else if (type === 'filters') {
        const res = await filterAPI.getWords();
        data = res.data.data.map(w => ({
          id: w._id,
          word: w.word,
          category: w.category,
          severity: w.severity,
          isActive: w.isActive,
          createdAt: w.createdAt
        }));
      }

      if (data.length === 0) {
        toast.error(`No records found to export for ${type}`);
        return;
      }

      let content = '';
      let mimeType = 'application/json';

      if (format === 'json') {
        content = JSON.stringify(data, null, 2);
        filename += '.json';
      } else {
        mimeType = 'text/csv';
        const headers = Object.keys(data[0]).join(',');
        const rows = data.map(row => 
          Object.values(row)
            .map(val => `"${String(val).replace(/"/g, '""')}"`)
            .join(',')
        );
        content = [headers, ...rows].join('\n');
        filename += '.csv';
      }

      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success(`Data exported: ${filename}`);
    } catch (err) {
      console.error(err);
      toast.error(`Export failed for ${type}`);
    } finally {
      setExporting(null);
    }
  };

  return (
    <>
      <div className="admin-header" style={{ marginBottom: '24px' }}>
        <div>
          <h1 className="admin-title">System Operations</h1>
          <p className="admin-subtitle">Advanced enterprise utilities, AI policy tuning, and live system monitoring.</p>
        </div>
      </div>

      {/* Operations Nav Tabs */}
      <div style={{ display: 'flex', gap: 12, borderBottom: '1px solid var(--admin-border)', marginBottom: 24 }}>
        {[
          { id: 'playground', label: 'AI Safety Playground', icon: <FiShield size={14} /> },
          { id: 'backups', label: 'Database Backup & Archival', icon: <FiDatabase size={14} /> },
          { id: 'diagnostics', label: 'Telemetry & Logs', icon: <FiActivity size={14} /> }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '12px 16px', fontSize: 13, fontWeight: 700,
              display: 'flex', alignItems: 'center', gap: 8,
              border: 'none', background: 'none', cursor: 'pointer',
              borderBottom: `2px solid ${activeTab === tab.id ? 'var(--accent-color)' : 'transparent'}`,
              color: activeTab === tab.id ? 'var(--accent-color)' : 'var(--admin-text-muted)',
              transition: 'all 0.2s',
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1: AI Safety Playground */}
      {activeTab === 'playground' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '32px', alignItems: 'start' }}>
          
          {/* Sliders Configuration */}
          <div className="admin-card" style={{ padding: '24px' }}>
            <h2 className="admin-card-title" style={{ marginBottom: '20px', borderBottom: '1px solid var(--admin-border)', paddingBottom: '12px' }}>
              <FiSliders style={{ color: 'var(--accent-color)' }} /> Automated Policies Tuning
            </h2>

            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '13px', marginBottom: '8px' }}>
                <span style={{ color: 'var(--admin-text-main)' }}>AI Toxicity Sensitivity</span>
                <span style={{ color: 'var(--accent-color)' }}>{toxicityThreshold}%</span>
              </div>
              <input 
                type="range" 
                min="10" 
                max="95" 
                value={toxicityThreshold} 
                onChange={(e) => {
                  setToxicityThreshold(Number(e.target.value));
                  handleSimulateText(testText);
                }}
                style={{ width: '100%', accentColor: 'var(--accent-color)', cursor: 'pointer' }}
              />
              <p style={{ fontSize: '11.5px', color: 'var(--admin-text-muted)', marginTop: '6px' }}>
                Flags submissions or comments that display threatening, hateful, or cyberbullying characteristics.
              </p>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '13px', marginBottom: '8px' }}>
                <span style={{ color: 'var(--admin-text-main)' }}>Profanity Restriction Limit</span>
                <span style={{ color: 'var(--accent-color)' }}>{profanityThreshold}%</span>
              </div>
              <input 
                type="range" 
                min="10" 
                max="95" 
                value={profanityThreshold} 
                onChange={(e) => {
                  setProfanityThreshold(Number(e.target.value));
                  handleSimulateText(testText);
                }}
                style={{ width: '100%', accentColor: 'var(--accent-color)', cursor: 'pointer' }}
              />
              <p style={{ fontSize: '11.5px', color: 'var(--admin-text-muted)', marginTop: '6px' }}>
                Automatically restricts vulgarity and matching words within custom and default list indices.
              </p>
            </div>

            <div style={{ marginTop: '32px' }}>
              <label style={{ display: 'block', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', marginBottom: '8px', color: 'var(--admin-text-main)' }}>
                Test Input Playground
              </label>
              <textarea
                placeholder="Type test text here (e.g. hate speech or regular article draft) to evaluate AI flagging logic..."
                value={testText}
                onChange={(e) => handleSimulateText(e.target.value)}
                className="admin-input"
                rows={5}
                style={{ resize: 'vertical' }}
              />
            </div>
          </div>

          {/* Real-time Simulator Output */}
          <div className="admin-card" style={{ padding: '24px', background: 'var(--admin-hover-bg)' }}>
            <h2 className="admin-card-title" style={{ marginBottom: '20px', borderBottom: '1px solid var(--admin-border)', paddingBottom: '12px' }}>
              <FiZap style={{ color: '#f59e0b' }} /> AI Classifier Verdict
            </h2>

            {simResult ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600 }}>Toxicity Score:</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 800, color: simResult.toxicityScore >= toxicityThreshold ? '#ef4444' : '#16a34a' }}>{simResult.toxicityScore}%</span>
                    <span style={{ fontSize: '11px', color: 'var(--admin-text-muted)' }}>(Threshold: {toxicityThreshold}%)</span>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600 }}>Profanity Score:</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 800, color: simResult.profanityScore >= profanityThreshold ? '#ef4444' : '#16a34a' }}>{simResult.profanityScore}%</span>
                    <span style={{ fontSize: '11px', color: 'var(--admin-text-muted)' }}>(Threshold: {profanityThreshold}%)</span>
                  </div>
                </div>

                {simResult.matchedCategory !== 'None' && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600 }}>Flagged Target Category:</span>
                    <span className="admin-badge badge-danger">{simResult.matchedCategory}</span>
                  </div>
                )}

                <div style={{ borderTop: '1px solid var(--admin-border)', paddingTop: '16px', marginTop: '8px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--admin-text-muted)', marginBottom: '8px' }}>Policy Decision</div>
                  <div style={{ 
                    padding: '16px', 
                    borderRadius: '8px', 
                    background: simResult.isFlagged ? 'rgba(239, 68, 68, 0.08)' : 'rgba(22, 163, 74, 0.08)',
                    border: `1px solid ${simResult.isFlagged ? '#ef4444' : '#16a34a'}`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}>
                    <span style={{ fontSize: '15px', fontWeight: 800, color: simResult.isFlagged ? '#dc2626' : '#16a34a' }}>
                      {simResult.isFlagged ? '❌ CONTENT FLAGGED' : '✅ CONTENT APPROVED'}
                    </span>
                    <span style={{ fontSize: '13px', color: 'var(--admin-text-main)', fontWeight: 600 }}>
                      Action: {simResult.action}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--admin-text-muted)' }}>
                Please write sample input in the test playground to generate live classification stats.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Database Backup & Archival */}
      {activeTab === 'backups' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="admin-card">
            <h2 className="admin-card-title" style={{ marginBottom: '12px' }}>
              <FiHardDrive style={{ color: 'var(--accent-color)' }} /> Data Backup Center
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--admin-text-muted)', marginBottom: '24px', lineHeight: 1.5 }}>
              Export system collections into CSV format for legacy spreadsheet analysis or JSON backups for database archival.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
              {[
                { type: 'articles', title: 'Articles Collection', count: 'All articles & metadata' },
                { type: 'comments', title: 'Pending Comments Collection', count: 'Active comment queues' },
                { type: 'users', title: 'Users & Roles Collection', count: 'Student profiles & permissions' },
                { type: 'filters', title: 'Content Security Filter Rules', count: 'Banned words & severity settings' }
              ].map(item => (
                <div key={item.type} className="admin-card" style={{ background: 'var(--admin-hover-bg)', borderStyle: 'dashed' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 4px', color: 'var(--admin-text-main)' }}>{item.title}</h3>
                  <p style={{ fontSize: '12px', color: 'var(--admin-text-muted)', margin: '0 0 16px' }}>{item.count}</p>
                  
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      disabled={exporting !== null}
                      onClick={() => handleExportData(item.type, 'json')}
                      className="btn-admin-primary" 
                      style={{ flex: 1, fontSize: '11px', padding: '8px 12px' }}
                    >
                      <FiDownload size={12} /> JSON
                    </button>
                    <button 
                      disabled={exporting !== null}
                      onClick={() => handleExportData(item.type, 'csv')}
                      className="btn-admin-secondary" 
                      style={{ flex: 1, fontSize: '11px', padding: '8px 12px' }}
                    >
                      <FiDownload size={12} /> CSV
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Telemetry & Logs */}
      {activeTab === 'diagnostics' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Telemetry metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px' }}>
            {[
              { label: 'CPU Usage', value: `${metrics.cpu}%`, icon: <FiCpu />, color: metrics.cpu > 75 ? '#ef4444' : 'var(--accent-color)' },
              { label: 'Memory Allocation', value: `${metrics.memory}%`, icon: <FiHardDrive />, color: metrics.memory > 80 ? '#ef4444' : '#10b981' },
              { label: 'Average Latency', value: `${metrics.latency} ms`, icon: <FiActivity />, color: '#f59e0b' },
              { label: 'Active WebSockets', value: `${metrics.websockets} clients`, icon: <FiZap />, color: '#a78bfa' }
            ].map((stat) => (
              <div key={stat.label} className="admin-card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{
                  padding: '12px',
                  borderRadius: '10px',
                  background: 'var(--admin-hover-bg)',
                  fontSize: '20px',
                  color: stat.color,
                  display: 'flex'
                }}>
                  {stat.icon}
                </div>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--admin-text-muted)' }}>{stat.label}</div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--admin-text-main)', marginTop: '4px' }}>{stat.value}</div>
                </div>
              </div>
            ))}
          </div>

          {/* System Terminal log feed */}
          <div className="admin-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--admin-border)', paddingBottom: '12px', marginBottom: '16px' }}>
              <h2 className="admin-card-title" style={{ margin: 0 }}>
                <FiTerminal style={{ color: 'var(--admin-text-main)' }} /> Real-time Operations Log Feed
              </h2>
              <span className="admin-badge badge-success" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#16a34a', display: 'inline-block' }} /> Live Diagnostics
              </span>
            </div>

            <div style={{ 
              background: '#0d0d0d', 
              borderRadius: '8px', 
              padding: '20px', 
              fontFamily: 'Courier New, Courier, monospace', 
              maxHeight: '320px', 
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              border: '1px solid var(--admin-border)'
            }}>
              {logs.map(log => (
                <div key={log.id} style={{ fontSize: '12.5px', color: '#a3a3a3', lineHeight: 1.45 }}>
                  <span style={{ color: '#16a34a' }}>[{log.time}]</span>{' '}
                  <span style={{ 
                    color: log.type === 'warning' ? '#f59e0b' : log.type === 'security' ? '#ef4444' : '#60a5fa', 
                    fontWeight: 700 
                  }}>
                    [{log.type.toUpperCase()}]
                  </span>{' '}
                  <span style={{ color: '#ffffff' }}>{log.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AdminSystemCenter;
