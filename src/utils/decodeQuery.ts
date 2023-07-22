/**
 * We don't override the default express query processor because
 * query params that should have string types shouldn't automatically
 * convert "true" to a boolean
 */
const decodeBoolean = (param: string | undefined) => {
  return param !== undefined ? param === "true" : undefined
}

export {
  decodeBoolean
}