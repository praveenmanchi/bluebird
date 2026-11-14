// Vector geometry of Figma "UX AI Bot" (40002611:72953), 40 × 40 frame. The robot itself comes from
// BotAvatar; this file adds what is unique to UX AI. Colour never lives here (see UxaiBot.css).

/** The chest "Icon" layer. */
export const EMBLEM = { icon: 'uxai', size: 19, cy: 24.7 } as const

/** Searching and Answering: the robot steps back to .82 to make room for the bubble. */
export const ROBOT_ASIDE = 'translate(-1.33px, 7.2px) scale(0.82)' // allow-raw: artwork transform in the 40-unit robot frame, copied from Figma

export const BUBBLE = 'M26.33 1H34.33a4.33 4.33 0 0 1 4.33 4.33V8.67a4.33 4.33 0 0 1-4.33 4.33H28.67L24.67 16.67V12.87A4.33 4.33 0 0 1 22 8.67V5.33A4.33 4.33 0 0 1 26.33 1Z'
export const BUBBLE_STROKE = 1.33
/** Searching: three dots. */
export const BUBBLE_DOTS = [{ cx: 25.67, cy: 7, r: 1.33 }, { cx: 30.33, cy: 7, r: 1.33 }, { cx: 35, cy: 7, r: 1.33 }] as const
/** Answering: two lines of text. */
export const BUBBLE_LINES = 'M25.33 5H35.33M25.33 9H31.33'
export const BUBBLE_LINE_WIDTH = 1.67
/** Answering: happy eyes. */
export const SMILE = 'M14.67 9.67q1.83-2.67 3.67 0M21.67 9.67q1.83-2.67 3.67 0'
export const SMILE_WIDTH = 1.2
