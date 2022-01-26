export const PassType = {
  USER: 'User',
  FUNDER: 'Funder',
  SUBMISSION: 'Submission',
  GRANT: 'Grant'
};

export function parseType(str) {
  if (PassType.hasOwnProperty(str)) {
    return PassType[str];
  } else {
    throw new Error(`Invalid PassType: "${str}"`);
  }
}
