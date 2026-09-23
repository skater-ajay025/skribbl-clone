import type { Player } from '../types';
export default function Leaderboard({players, me}: {players:Player[];me:string}) {
  const sorted=[...players].sort((a,b)=>b.score-a.score);
  return <aside className="leader-panel"><div className="panel-title">Players <span>{players.length}</span></div>{sorted.map((p,i)=><div className="player-row" key={p.id}><span className="rank">{i===0?'👑':i+1}</span><span className="avatar">{p.name[0]?.toUpperCase()}</span><div className="player-name"><b>{p.name}{p.id===me?' (you)':''}</b>{p.isHost&&<small>HOST</small>}</div><strong>{p.score}</strong></div>)}</aside>;
}
