export default function WordPicker({options,onChoose}: {options:string[];onChoose:(w:string)=>void}) {
 return <div className="word-picker"><div className="picker-icon">✏️</div><h2>Choose your word</h2><p>Everyone is waiting for your drawing.</p><div className="word-options">{options.map(w=><button key={w} onClick={()=>onChoose(w)}>{w}<span>Draw →</span></button>)}</div></div>;
}
