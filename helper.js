import fetch from 'node-fetch';

/**
 * Get search query to look for entities that reference the given object
 * 
 * @param {string} id URI
 * @param {string} type passType
 */
function getRefQuery(id, type) {
  switch (type) {
    case 'User':
      return `submitter:"${id}"+pi:"${id}"+copi:"${id}"+user:"${id}"+performedBy:"${id}"`;
    case 'Funder':
      return `primaryFunder:"${id}"+directFunder:"${id}"`;
    default:
      throw new Error('Invalid passType. Can\'t generate search query.');
  }
}

export function isValidUser(id) {
  const ES_URL = process.env.ES_URL;
  const TYPE = process.env.TYPE;
  if (!ES_URL) {
    throw new Error('No ES URL');
  }

  const url = `${ES_URL}?default_operator=OR&q=${getRefQuery(id, TYPE)}`;
  return fetch(url)
    .then(resp => resp.json())
    .then(data => data.hits.hits.map(hit => hit._source['@id']))
    .catch(err => console.error(err));
}

export function findReferencedEntities(id) {
  const ES_URL = process.env.ES_URL;
  const TYPE = process.env.TYPE;

  if (TYPE == 'User') {
    return Promise.resolve([]);
  }

  const url = `${ES_URL}?q=@id:"${id}"`;
  return fetch(url)
    .then(resp => resp.json())
    .then((data) => {
      const docs = data.hits.hits.map(hit => hit._source);
      switch (TYPE) {
        case 'Funder':
          return docs.map(funder => funder.policy);
        default:
          return Promise.resolve([]);
      }
    })
    .catch(err => console.error(err));
}
