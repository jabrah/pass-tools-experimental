import fetch from 'node-fetch';

export function isValidUser(userId) {
  const ES_URL = process.env.ES_URL;
  if (!ES_URL) {
    throw new Error('No ES URL');
  }

  const url = `${ES_URL}?default_operator=OR&q=submitter:"${userId}"+pi:"${userId}"+copi:"${userId}"`;
  return fetch(url)
    .then(resp => resp.json())
    .then(data => (data.hits.total > 0));
}
