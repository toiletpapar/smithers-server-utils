// Only checks that the string format is ISO8601 and has valid components. Does not check for invalid dates as a whole (e.g. 2022-11-31)
const isISO8601 = (date: string | null): boolean => {
  if (!date) {
    return false
  }

  const iso8601Regex = /^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):([0-5][0-9]):([0-5][0-9])(\.\d+)?(Z|[+-][01][0-9]:?[0-5][0-9])?$/

  return iso8601Regex.test(date)
}

export {
  isISO8601
}