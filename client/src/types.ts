export type Player = { id: string; name: string; score: number; ready: boolean; isHost: boolean };
export type Settings = { maxPlayers: number; rounds: number; drawTime: number; wordCount: number; hints: number; category: string; isPrivate: boolean };
export type Stroke = { points: { x: number; y: number }[]; color: string; size: number; tool: 'brush' | 'eraser' };
export type GameState = { phase: 'lobby' | 'playing' | 'ended'; round: number; totalRounds: number; drawerId: string | null; hints: number[]; drawTime: number; roundEndsAt: number | null; strokes: Stroke[]; players: Player[]; settings: Settings };
export type ChatMessage = { playerId: string; playerName: string; text: string; system?: boolean };
