export type Rating = 'again' | 'hard' | 'good' | 'easy'

export type CardState = 'new' | 'learning' | 'review' | 'relearning'

export interface Deck {
  id: string
  name: string
  description: string
  createdAt: number
  color: string
}

export interface Card {
  id: string
  deckId: string
  front: string
  back: string
  /** SM-2 ease factor, starts at 2.5 */
  ease: number
  /** Current interval in days */
  interval: number
  /** Times answered correctly in a row (for learning steps) */
  reps: number
  /** Times failed */
  lapses: number
  state: CardState
  /** Unix ms when card is due */
  due: number
  createdAt: number
  updatedAt: number
}

export type View =
  | { name: 'home' }
  | { name: 'deck'; deckId: string }
  | { name: 'study'; deckId: string }
  | { name: 'edit'; deckId: string; cardId?: string }
