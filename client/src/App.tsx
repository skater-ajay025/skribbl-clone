import { useEffect, useMemo, useRef, useState } from 'react';
import { socket } from './socket';
import type { ChatMessage, GameState, Settings, Stroke } from './types';
import Home from './components/Home';
import Canvas from './components/Canvas';
import Chat from './components/Chat';
import Leaderboard from './components/Leaderboard';
import WordPicker from './components/WordPicker';

const emptyState: GameState = { phase:'lobby', round:0,totalRounds:4,drawerId:null,hints:[],drawTime:60,roundEndsAt:null,strokes:[],players:[],settings:{maxPlayers:8,rounds:4,drawTime:60,wordCount:3,hints:2,category:'all',isPrivate:true} };

export default function App(){
 const [state,setState]=useState<GameState>(emptyState); const [screen,setScreen]=useState<'home'|'room'>('home'); const [roomId,setRoomId]=useState(''); const [me,setMe]=useState('');
 const [messages,setMessages]=useState<ChatMessage[]>([]); const [options,setOptions]=useState<string[]>([]); const [word,setWord]=useState(''); const [masked,setMasked]=useState<string[]>([]); const [timeLeft,setTimeLeft]=useState(0); const [error,setError]=useState(''); const [publicRooms,setPublicRooms]=useState<any[]>([]);
 const [color,setColor]=useState('#151a2d'); const [size,setSize]=useState(8); const [tool,setTool]=useState<'brush'|'eraser'>('brush');
 const [copied,setCopied]=useState(false);
 const pendingStroke=useRef<Stroke|null>(null);
 const player=state.players.find(p=>p.id===me); const drawer=state.drawerId===me;
 useEffect(()=>{
  const onState=(s:GameState)=>{setState(s);setMasked(s.hints?.length && word ? word.split('').map((c,i)=>c===' ' ? ' ' : s.hints.includes(i)?c:'_') : masked);};
  const onRound=(p:any)=>{setOptions(p.wordOptions||[]);setWord('');setMessages([]);setMasked([]);};
  const onPrivate=(p:any)=>setWord(p.word);
  const onHint=(p:any)=>{setMasked(p.maskedWord||[]);};
  const onPublicWord=(p:any)=>setMasked(p.hints || []);
  const onChat=(m:ChatMessage)=>setMessages(x=>[...x,m]);
  const onError=(e:any)=>{setError(e.message||'Something went wrong');setTimeout(()=>setError(''),3500);};
  const onOver=()=>setOptions([]);
  socket.on('game_state',onState); socket.on('round_start',onRound); socket.on('word_chosen_private',onPrivate); socket.on('word_chosen_public',onPublicWord); socket.on('hint_update',onHint); socket.on('chat_message',onChat); socket.on('error_message',onError); socket.on('game_over',onOver);
  return ()=>{socket.off('game_state',onState);socket.off('round_start',onRound);socket.off('word_chosen_private',onPrivate);socket.off('word_chosen_public',onPublicWord);socket.off('hint_update',onHint);socket.off('chat_message',onChat);socket.off('error_message',onError);socket.off('game_over',onOver);};
 },[word]);
 useEffect(()=>{const onDraw=(p:any)=>{if(p.action==='start'){setState(s=>({...s,strokes:[...s.strokes,p.stroke]}));}else if(p.action==='move'){setState(s=>{const strokes=s.strokes.map(x=>({...x,points:[...x.points]})); if(strokes[p.strokeIndex]) strokes[p.strokeIndex].points.push(p.point); return {...s,strokes};});}}; const onClear=()=>setState(s=>({...s,strokes:[]})); const onUndo=()=>setState(s=>({...s,strokes:s.strokes.slice(0,-1)})); socket.on('draw_data',onDraw);socket.on('canvas_clear',onClear);socket.on('draw_undo',onUndo);return()=>{socket.off('draw_data',onDraw);socket.off('canvas_clear',onClear);socket.off('draw_undo',onUndo)};},[]);
 useEffect(()=>{if(!state.roundEndsAt){setTimeLeft(0);return;} const tick=()=>setTimeLeft(Math.max(0,Math.ceil((state.roundEndsAt!-Date.now())/1000))); tick(); const id=setInterval(tick,250); return()=>clearInterval(id);},[state.roundEndsAt]);
 useEffect(()=>{fetch((import.meta.env.VITE_SERVER_URL || (import.meta.env.DEV ? 'http://localhost:3001' : window.location.origin))+'/api/rooms').then(r=>r.json()).then(setPublicRooms).catch(()=>{});},[screen,state.phase]);
 const create=(name:string,s:Settings)=>{setError('');socket.emit('create_room',{hostName:name,settings:s}); const on=(p:any)=>{setRoomId(p.roomId);setMe(p.playerId);setScreen('room');socket.off('room_created',on)};socket.on('room_created',on);};
 const join=(name:string,id:string)=>{if(!id)return setError('Enter a room code.');socket.emit('join_room',{roomId:id,playerName:name}); const on=(p:any)=>{setRoomId(p.roomId);setMe(p.playerId);setScreen('room');socket.off('room_joined',on)};socket.on('room_joined',on);};
 const sendDrawStart=(p:{x:number;y:number})=>{pendingStroke.current={points:[p],color,size,tool};socket.emit('draw_start',{...p,color,size,tool});};
 const sendDrawMove=(p:{x:number;y:number})=>socket.emit('draw_move',p); const sendDrawEnd=()=>{pendingStroke.current=null;socket.emit('draw_end');};
 const displayWord=drawer && word ? word.split('') : (word ? (masked.length?masked:word.split('').map(c=>c===' '?' ':'_')) : []);
 const copy=async()=>{
  const value=roomId;
  try{
   if(navigator.clipboard && window.isSecureContext){ await navigator.clipboard.writeText(value); }
   else {
    const area=document.createElement('textarea'); area.value=value; area.setAttribute('readonly',''); area.style.position='fixed'; area.style.opacity='0'; document.body.appendChild(area); area.select(); document.execCommand('copy'); area.remove();
   }
   setCopied(true); window.setTimeout(()=>setCopied(false),1800);
  }catch{ setError('Copy failed. Please select the room code manually.'); }
 };
 const copyInvite=async()=>{
  const value=`${window.location.origin}/room/${roomId}`;
  try{
   if(navigator.clipboard && window.isSecureContext){ await navigator.clipboard.writeText(value); }
   else { const area=document.createElement('textarea'); area.value=value; area.setAttribute('readonly',''); area.style.position='fixed'; area.style.opacity='0'; document.body.appendChild(area); area.select(); document.execCommand('copy'); area.remove(); }
   setCopied(true); window.setTimeout(()=>setCopied(false),1800);
  }catch{ setError('Copy failed. Please copy the invite link manually.'); }
 };
 const reset=()=>{socket.disconnect();socket.connect();setScreen('home');setRoomId('');setMe('');setMessages([]);setWord('');setOptions([]);setState(emptyState);};
 if(screen==='home') return <><Home onCreate={create} onJoin={join} publicRooms={publicRooms}/>{error&&<div className="toast error">{error}</div>}</>;
 const gameOver=state.phase==='ended';
 return <div className="game-shell">
  <header className="topbar"><div className="logo" onClick={reset}><span className="logo-icon"><b>✦</b><i>•</i></span><span>skribbl<span>-clone</span></span></div><div className="room-badge"><span className="room-label">ROOM CODE</span><b>{roomId}</b><button className={copied?'copied':''} onClick={copy}>{copied?'✓ Copied':'Copy code'}</button></div><div className="top-actions"><span className="round-pill">Round {state.round || 0}/{state.totalRounds}</span><button className="leave" onClick={reset}>Leave room</button></div></header>
  <div className="game-layout">
   <section className="main-game">
    {state.phase==='lobby' && <div className="lobby-card lobby-modern">
      <div className="lobby-orb"><span>🎨</span></div>
      <div className="lobby-kicker"><span className="pulse-dot"/> PRIVATE LOBBY</div>
      <h1>Ready when you are.</h1>
      <p className="lobby-subtitle">Invite your friends and start a fast drawing battle. Everyone sees the canvas live.</p>
      <div className="code-panel">
        <div><span>ROOM CODE</span><strong>{roomId}</strong></div>
        <button className={copied?'copy-btn copied':'copy-btn'} onClick={copy}>{copied?'✓ Copied':'Copy code'}</button>
      </div>
      <div className="invite invite-modern"><div><span className="invite-label">INVITE LINK</span><span className="invite-url">{window.location.origin}/room/{roomId}</span></div><button onClick={copyInvite}>{copied?'✓':'↗'}</button></div>
      <div className="lobby-heading"><span>Players</span><b>{state.players.length}/{state.settings.maxPlayers}</b></div>
      <div className="lobby-players lobby-players-modern">{state.players.map(p=><div className="lobby-player lobby-player-modern" key={p.id}><span className="avatar">{p.name[0]?.toUpperCase()}</span><div><b>{p.name}{p.id===me?' (you)':''}</b><small>{p.isHost?'HOST':p.ready?'READY':'WAITING'}</small></div>{p.isHost&&<em>♛</em>}</div>)}</div>
      <div className="lobby-actions">{player&&!player.isHost&&<button className="secondary" onClick={()=>socket.emit('toggle_ready')}>{player.ready?'✓ You are ready':'Ready up'}</button>}{player?.isHost&&<button className="primary lobby-start" onClick={()=>socket.emit('start_game')}>Start game <span>→</span></button>}</div>
      <div className="lobby-foot"><span>🔒 No account required</span><span>⚡ Real-time multiplayer</span><span>👥 {state.players.length < 2 ? 'Waiting for 1 more player' : 'Ready to start'}</span></div>
    </div>}
    {state.phase==='playing' && <>
      <div className="game-info"><div className="turn"><span className="live-dot"/> {drawer?'YOUR TURN':'WATCH & GUESS'}</div><div className="timer">⏱ {timeLeft}s</div><div className="hint-word">{displayWord.length?displayWord.map((c,i)=><span key={i} className="letter">{c}</span>):'Choose a word'}</div></div>
      <div className="canvas-wrap"><Canvas strokes={state.strokes} drawing={drawer&&!!word} color={color} size={size} tool={tool} onStart={sendDrawStart} onMove={sendDrawMove} onEnd={sendDrawEnd}/>{drawer&&<div className="toolbar"><button className={tool==='brush'?'selected':''} onClick={()=>setTool('brush')}>🖊</button><button className={tool==='eraser'?'selected':''} onClick={()=>setTool('eraser')}>⌫</button><div className="colors">{['#151a2d','#e74c3c','#f39c12','#f1c40f','#2ecc71','#3498db','#9b59b6','#e84393'].map(c=><button key={c} style={{background:c}} className={color===c?'chosen':''} onClick={()=>{setColor(c);setTool('brush')}}/> )}</div><select value={size} onChange={e=>setSize(+e.target.value)}><option value="4">Thin</option><option value="8">Medium</option><option value="14">Thick</option><option value="24">Huge</option></select><button onClick={()=>socket.emit('draw_undo')}>↶</button><button onClick={()=>socket.emit('canvas_clear')}>🗑</button></div>}</div>
      {drawer&&!word&&options.length>0&&<WordPicker options={options} onChoose={w=>socket.emit('choose_word',{word:w})}/>} 
    </>}
    {gameOver && <div className="gameover-card"><div className="trophy">🏆</div><h1>Game complete!</h1><p>{state.players.slice().sort((a,b)=>b.score-a.score)[0]?.name} finished on top.</p><div className="final-table">{state.players.slice().sort((a,b)=>b.score-a.score).map((p,i)=><div key={p.id}><span>{i+1}</span><b>{p.name}</b><strong>{p.score} pts</strong></div>)}</div><button className="primary" onClick={reset}>Play again</button></div>}
   </section>
   <div className="sidebars"><Leaderboard players={state.players} me={me}/><Chat messages={messages} disabled={state.phase!=='playing'||drawer} onSend={text=>socket.emit('guess',{text})}/></div>
  </div>
  {error&&<div className="toast error">{error}</div>}
 </div>;
}
