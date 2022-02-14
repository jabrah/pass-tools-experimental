import fetch from 'node-fetch';

export function checkUri(uri) {
  const fcrepo = new URL(process.env.FCREPO);
  const username = process.env.username;
  const password = process.env.password;

  // Need to mutate the URI, so let's use the URL API
  const url = new URL(uri);
  url.host = fcrepo.host;
  
  console.log(`> Fetching: ${url.toString()}`);
  return fetch(url.toString(), {
    headers: {
      'Authorization': `Basic ${Buffer.from(`${username}:${password}`, 'utf-8').toString('base64')}`
    }
  })
    .then(resp => resp.text())
    .then(text => ({
        target: uri,
        created: getProp('fedora:created', text),
        createdBy: getProp('fedora:createdBy', text),
        lastModified: getProp('fedora:lastModified', text),
        lastModifiedBy: getProp('fedora:lastModifiedBy', text)
      }))
    .catch(err => console.log(err));
}

function getProp(prop, textData) {
  const regex = `(${prop})\\s+`;
  const match = textData.search(regex);

  if (match < 0) { // Property not found
    return;
  }

  const valueStart = textData.indexOf('"', match) + 1;
  const valueEnd = textData.indexOf('"', valueStart);

  if (valueEnd <= valueStart) {
    // Non-string value, likely not what we're looking for
    return;
  }

  return textData.slice(valueStart, valueEnd);
}

export async function fetchTimestamps(targets) {

  const pending = targets
    .map(async (target) => {
      return checkUri(target);
    });

  return Promise.all(pending)
    .catch((error) => {
      console.log(error);
      process.exit(2);
    });
}
