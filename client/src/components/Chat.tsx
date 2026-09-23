import { useEffect, useRef, useState } from 'react';
import type { ChatMessage } from '../types';

export default function Chat({ messages, onSend, disabled }: { messages: ChatMessage[]; onSend:(text:string)=>void; disabled?:boolean }) {
  const [text,setText]=useState(''); const end=useRef<HTMLDivElement>(null);
  useEffect(()=>{end.current?.scrollIntoView({behavior:'smooth'});},[messages]);
  const send=()=>{if(text.trim()){onSend(text.trim());setText('');}};
  return <aside className="chat-panel"><div className="panel-title">Chat <span>{messages.length}</span></div><div className="messages">{messages.map((m,i)=><div className={m.system?'message system':'message'} key={i}><b>{m.playerName}</b><span>{m.text}</span></div>)}<div ref={end}/></div><div className="chat-input"><input disabled={disabled} value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()} placeholder={disabled?'Choose a word first':'Type a guess...'} /><button disabled={disabled} onClick={send}>↑</button></div></aside>;
}
