import { useMemo, useState } from 'react';
import type { Settings } from '../types';

const defaults: Settings = {
  maxPlayers: 8,
  rounds: 4,
  drawTime: 60,
  wordCount: 3,
  hints: 2,
  category: 'all',
  isPrivate: true,
};

const avatars = ['😀', '😎', '🤠', '😈', '🤖', '👽', '🐼', '🦊', '🐸', '🦄'];

export default function Home({
  onCreate,
  onJoin,
  publicRooms,
}: {
  onCreate: (name: string, s: Settings) => void;
  onJoin: (name: string, id: string) => void;
  publicRooms: { id: string; players: number; maxPlayers: number; rounds: number }[];
}) {
  const [name, setName] = useState('');
  const [room, setRoom] = useState('');
  const [language, setLanguage] = useState('English');
  const [avatar, setAvatar] = useState(0);
  const [showJoin, setShowJoin] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const [settings, setSettings] = useState(defaults);
  const [notice, setNotice] = useState('');

  const readyName = name.trim() || 'Player';
  const hasPublicRoom = publicRooms.length > 0;
  const selectedRoom = useMemo(
    () => publicRooms.find((r) => r.players < r.maxPlayers),
    [publicRooms],
  );

  const play = () => {
    if (selectedRoom) {
      onJoin(readyName, selectedRoom.id);
      return;
    }
    onCreate(readyName, { ...settings, isPrivate: false });
  };

  const createPrivate = () => onCreate(readyName, { ...settings, isPrivate: true });

  const join = () => {
    const code = room.trim().toUpperCase();
    if (!code) {
      setNotice('Enter a room code first.');
      return;
    }
    onJoin(readyName, code);
  };

  return (
    <main className="classic-home">
      <div className="classic-sky" aria-hidden="true">
        <span className="doodle doodle-1">✦</span>
        <span className="doodle doodle-2">☁</span>
        <span className="doodle doodle-3">✎</span>
        <span className="doodle doodle-4">★</span>
        <span className="doodle doodle-5">○</span>
      </div>

      <header className="classic-brand" aria-label="skribbl clone home">
        <div className="scribble-logo">
          <span className="scribble-word">skribbl</span><span className="scribble-dot">.</span><span className="scribble-word io">io</span><span className="scribble-pencil">✎</span>
        </div>
        <div className="mini-players" aria-hidden="true">
          {['👹', '🟠', '👑', '🟢', '🔵', '🟣', '🩷'].map((x, i) => <span key={i}>{x}</span>)}
        </div>
        <div className="brand-subtitle">MULTIPLAYER DRAWING & GUESSING</div>
      </header>

      <section className="classic-panel" aria-label="Start game">
        <div className="classic-top-row">
          <label className="classic-name-field">
            <span className="sr-only">Your name</span>
            <input value={name} onChange={(e) => setName(e.target.value.slice(0, 18))} placeholder="Enter your name" maxLength={18} />
          </label>
          <label className="classic-language">
            <span className="sr-only">Language</span>
            <select value={language} onChange={(e) => setLanguage(e.target.value)}>
              <option>English</option>
              <option>Hindi</option>
              <option>Spanish</option>
              <option>French</option>
            </select>
          </label>
        </div>

        <div className="avatar-picker">
          <button type="button" className="avatar-arrow" onClick={() => setAvatar((avatar - 1 + avatars.length) % avatars.length)} aria-label="Previous avatar">‹</button>
          <div className="avatar-stage">
            <span className="avatar-glow" />
            <span className="main-avatar">{avatars[avatar]}</span>
            <button type="button" className="dice-button" onClick={() => setAvatar(Math.floor(Math.random() * avatars.length))} aria-label="Random avatar">⚄</button>
          </div>
          <button type="button" className="avatar-arrow" onClick={() => setAvatar((avatar + 1) % avatars.length)} aria-label="Next avatar">›</button>
        </div>

        <button type="button" className="classic-play" onClick={play}>
          <span>Play!</span><b>➜</b>
        </button>
        <button type="button" className="classic-private" onClick={createPrivate}>
          <span>🔒</span> Create Private Room
        </button>

        <div className="classic-links">
          <button type="button" onClick={() => setShowJoin((v) => !v)}>{showJoin ? 'Close join' : 'Join a room by code'}</button>
          <button type="button" onClick={() => setShowCustomize((v) => !v)}>{showCustomize ? 'Hide settings' : 'Game settings'}</button>
        </div>

        {showJoin && (
          <div className="classic-expand join-expand">
            <input value={room} onChange={(e) => setRoom(e.target.value.toUpperCase())} placeholder="Room code (e.g. 3D51C0)" maxLength={6} />
            <button type="button" onClick={join}>Join</button>
          </div>
        )}

        {showCustomize && (
          <div className="classic-settings">
            <label>Players<select value={settings.maxPlayers} onChange={(e) => setSettings({ ...settings, maxPlayers: +e.target.value })}>{[2,4,6,8,10,12,16,20].map((x) => <option key={x}>{x}</option>)}</select></label>
            <label>Rounds<select value={settings.rounds} onChange={(e) => setSettings({ ...settings, rounds: +e.target.value })}>{[2,3,4,5,6,8,10].map((x) => <option key={x}>{x}</option>)}</select></label>
            <label>Draw time<select value={settings.drawTime} onChange={(e) => setSettings({ ...settings, drawTime: +e.target.value })}>{[15,30,45,60,90,120,180,240].map((x) => <option key={x}>{x}s</option>)}</select></label>
            <label>Word choices<select value={settings.wordCount} onChange={(e) => setSettings({ ...settings, wordCount: +e.target.value })}>{[1,2,3,4,5].map((x) => <option key={x}>{x}</option>)}</select></label>
            <label>Hints<select value={settings.hints} onChange={(e) => setSettings({ ...settings, hints: +e.target.value })}>{[0,1,2,3,4,5].map((x) => <option key={x}>{x}</option>)}</select></label>
            <label>Category<select value={settings.category} onChange={(e) => setSettings({ ...settings, category: e.target.value })}><option value="all">All words</option><option value="animals">Animals</option><option value="objects">Objects</option><option value="actions">Actions</option></select></label>
          </div>
        )}
        {notice && <div className="classic-notice">{notice}</div>}
        <div className="classic-status"><span className="online-dot" /> {hasPublicRoom ? `${publicRooms.length} public room${publicRooms.length > 1 ? 's' : ''} available` : 'Online · create a room and invite your friends'}</div>
      </section>

      <section className="classic-info-grid">
        <article>
          <div className="info-icon">?</div>
          <h2>About</h2>
          <p><strong>skribbl-clone</strong> is a free online multiplayer drawing and guessing game. Create a room, invite friends, draw a word and race to guess it.</p>
          <span className="info-tag">⚡ Real-time WebSockets</span>
        </article>
        <article>
          <div className="info-icon news">▤</div>
          <h2>Fresh paint</h2>
          <div className="news-row"><b>Live rooms</b><span>Now</span></div>
          <div className="news-row"><b>Live canvas sync</b><span>Online</span></div>
          <div className="news-row"><b>Hints + leaderboard</b><span>Ready</span></div>
          <p className="tiny">Built for the internship assignment with multiplayer rooms, drawing, guessing, scoring and chat.</p>
        </article>
        <article>
          <div className="info-icon pencil">✎</div>
          <h2>How to play</h2>
          <ol>
            <li>Create or join a room.</li>
            <li>One player chooses a word and draws.</li>
            <li>Everyone else guesses in chat.</li>
            <li>Earn points and top the leaderboard.</li>
          </ol>
          <div className="how-pill">🎨 Draw · 💬 Guess · 🏆 Win</div>
        </article>
      </section>

      <footer className="classic-footer">
        <span>skribbl-clone</span><span>•</span><span>Made for multiplayer fun</span><span>•</span><span>No account required</span>
      </footer>
    </main>
  );
}
