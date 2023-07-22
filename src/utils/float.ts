// Rounds a number to the closest precision. Useful for floats.
const scaleRound = (x: number, scale: number): number => {
  return Math.round(x * Math.pow(10, scale)) / Math.pow(10, scale)
}

// Compares to floats to the nearest precision
const scaleEquals = (x: number, y: number, scale: number): boolean => {
  return scaleRound(x, scale) === scaleRound(y, scale)
}

export {
  scaleEquals,
  scaleRound
}