import fetch from 'node-fetch';

export async function isValidUser(userId) {
  const ES_URL = process.env.ES_URL;
  if (!ES_URL) {
    throw new Error('No ES URL');
  }

  const url = `${ES_URL}?default_operator=OR&q=submitter:"${user}"+pi:"${user}"+copi:"${user}"`;
  const resp = await fetch(url);
  const data = await resp.json();

  return data.hits.total > 0;
}