import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import client from '../api/client.js';
import ActivityTimeline from '../components/activity/ActivityTimeline.jsx';
import ScreenTimeChart from '../components/activity/ScreenTimeChart.jsx';
import '../styles/activity.css';
import activityStore from '../utils/activityStore.js';
import { useNavigate } from 'react-router-dom';

export default function Activity() {
  const [filter, setFilter] = useState('all');
  const [items, setItems] = useState([]);
  const [conversationCount, setConversationCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const loadActivity = () => {
      const res = activityStore.getEvents({ filter, limit: 200, cursor: 0 });
      setItems(res.data || []);
    };

    loadActivity();
    window.addEventListener('qc:activity:updated', loadActivity);
    return () => window.removeEventListener('qc:activity:updated', loadActivity);
  }, [filter]);

  useEffect(() => {
    let active = true;
    Promise.all([
      client.get('/users', { params: { limit: 100 } }),
      client.get('/groups', { params: { limit: 100 } }),
    ]).then(([usersRes, groupsRes]) => {
      if (!active) return;
      const users = usersRes.data?.data || [];
      const groups = groupsRes.data?.data || [];
      setConversationCount(users.length + groups.length);
    }).catch(() => {
      if (active) setConversationCount(0);
    });
    return () => { active = false; };
  }, []);

  const counts = useMemo(() => ({ conversations: conversationCount }), [conversationCount]);

  return (
    <div className="activity-page">
      <header className="page-header">
        <button
          type="button"
          className="activity-back-button"
          onClick={() => navigate('/chat')}
          aria-label="Back to chat"
          title="Back to chat"
        >
          <ArrowLeft size={17} aria-hidden="true" />
          <span>Back to chat</span>
        </button>
        <h1>Chat Activity</h1>
        <p className="muted">Recent friend requests, group events, mentions and reactions.</p>
      </header>

      <div className="activity-grid">
        <main className="activity-main">
          <div className="activity-controls">
            <div className="segmented">
              {['all','friend_request','group','mention','reaction'].map((f) => (
                <button key={f} className={`seg-btn ${filter===f?'active':''}`} onClick={() => setFilter(f)}>{f==='all'?'All':f.replace('_',' ')}</button>
              ))}
            </div>
          </div>

          <div className="card activity-feed-card">
            <h3>Recent activity</h3>
            <div className="activity-feed-body">
              <ActivityTimeline items={items} onOpen={(it) => {
                // deep link behavior: navigate to chat; item may include conversationKey
                if (it.conversationKey) {
                  if (it.conversationKey.startsWith('group:')) navigate(`/chat/g/${it.targetId || ''}`);
                  else if (it.conversationKey.startsWith('dm:')) navigate(`/chat/${it.targetId || ''}`);
                }
              }} />
            </div>
          </div>
        </main>

        <aside className="activity-side">
          <div className="card">
            <h3>Conversations</h3>
            <div className="big-count">{counts.conversations}</div>
            <p className="muted">Summary of your conversations</p>
          </div>

          <div className="card">
            <h3>Screen time</h3>
            <ScreenTimeChart />
          </div>
        </aside>
      </div>
    </div>
  );
}
