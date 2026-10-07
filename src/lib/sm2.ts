import type { Card, Rating } from '../types'

export type { Rating }

const MINUTE = 60_000
const DAY = 24 * 60 * 60_000

/** Learning steps before graduating to review (Anki-style). */
const LEARNING_STEPS_MS = [1 * MINUTE, 10 * MINUTE]
const GRADUATING_INTERVAL_DAYS = 1
const EASY_INTERVAL_DAYS = 4
const MIN_EASE = 1.3

export interface ScheduleResult {
  ease: number
  interval: number
  reps: number
  lapses: number
  state: Card['state']
  due: number
}

export function schedule(card: Card, rating: Rating, now = Date.now()): ScheduleResult {
  const next = {
    ease: card.ease,
    interval: card.interval,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state,
    due: card.due,
  }

  if (card.state === 'new' || card.state === 'learning' || card.state === 'relearning') {
    return scheduleLearning(card, rating, now, next)
  }

  return scheduleReview(card, rating, now, next)
}

function scheduleLearning(
  card: Card,
  rating: Rating,
  now: number,
  next: ScheduleResult,
): ScheduleResult {
  if (rating === 'again') {
    next.reps = 0
    next.lapses += card.state === 'relearning' || card.reps > 0 ? 1 : 0
    next.state = card.state === 'review' ? 'relearning' : 'learning'
    next.due = now + LEARNING_STEPS_MS[0]
    next.interval = 0
    return next
  }

  if (rating === 'hard') {
    const stepIndex = Math.max(0, card.reps - 1)
    const step = LEARNING_STEPS_MS[Math.min(stepIndex, LEARNING_STEPS_MS.length - 1)]
    next.state = 'learning'
    next.due = now + Math.round(step * 1.5)
    return next
  }

  if (rating === 'easy') {
    next.state = 'review'
    next.reps = card.reps + 1
    next.interval = EASY_INTERVAL_DAYS
    next.ease = Math.max(MIN_EASE, card.ease + 0.15)
    next.due = now + EASY_INTERVAL_DAYS * DAY
    return next
  }

  // good
  const nextStep = card.reps
  if (nextStep < LEARNING_STEPS_MS.length) {
    next.reps = card.reps + 1
    next.state = 'learning'
    next.due = now + LEARNING_STEPS_MS[nextStep]
    return next
  }

  next.state = 'review'
  next.reps = card.reps + 1
  next.interval = GRADUATING_INTERVAL_DAYS
  next.due = now + GRADUATING_INTERVAL_DAYS * DAY
  return next
}

function scheduleReview(
  card: Card,
  rating: Rating,
  now: number,
  next: ScheduleResult,
): ScheduleResult {
  if (rating === 'again') {
    next.lapses = card.lapses + 1
    next.reps = 0
    next.ease = Math.max(MIN_EASE, card.ease - 0.2)
    next.state = 'relearning'
    next.interval = 0
    next.due = now + LEARNING_STEPS_MS[0]
    return next
  }

  let ease = card.ease
  let interval = card.interval

  if (rating === 'hard') {
    ease = Math.max(MIN_EASE, ease - 0.15)
    interval = Math.max(1, Math.round(interval * 1.2))
  } else if (rating === 'good') {
    interval = Math.max(1, Math.round(interval * ease))
  } else {
    // easy
    ease = ease + 0.15
    interval = Math.max(1, Math.round(interval * ease * 1.3))
  }

  next.ease = ease
  next.interval = interval
  next.reps = card.reps + 1
  next.state = 'review'
  next.due = now + interval * DAY
  return next
}

export function isDue(card: Card, now = Date.now()): boolean {
  return card.due <= now
}

export function previewIntervals(card: Card, now = Date.now()): Record<Rating, string> {
  const ratings: Rating[] = ['again', 'hard', 'good', 'easy']
  const labels = {} as Record<Rating, string>

  for (const rating of ratings) {
    const result = schedule(card, rating, now)
    labels[rating] = formatDelay(result.due - now)
  }

  return labels
}

function formatDelay(ms: number): string {
  if (ms < MINUTE) return '<1m'
  if (ms < 60 * MINUTE) return `${Math.round(ms / MINUTE)}m`
  if (ms < DAY) return `${Math.round(ms / (60 * MINUTE))}h`
  const days = Math.round(ms / DAY)
  if (days < 30) return `${days}d`
  if (days < 365) return `${Math.round(days / 30)}mo`
  return `${Math.round(days / 365)}y`
}
