import fetch from 'node-fetch';

/**
 * Get search query to look for entities that reference the given object
 * 
 * @param {string} id URI
 * @param {string} type passType
 * @returns {Promise}
 */
function getRefQuery(id, type) {
  switch (type) {
    case 'User':
      return `submitter:"${id}"+pi:"${id}"+copi:"${id}"+user:"${id}"+performedBy:"${id}"`;
    case 'Funder':
      return `primaryFunder:"${id}"+directFunder:"${id}"`;
    case 'Submission':
      return `submission:"${id}"`;
    case 'Grant':
      return `grants:"${id}"`;
    default:
      throw new Error('Invalid passType. Can\'t generate search query.');
  }
}

function expandProperties(object, props = []) {
  const res = [];
  props
  .filter(prop => object.hasOwnProperty(prop))
  .forEach((prop) => {
    const value = object[prop];
    if (Array.isArray(value)) {
      res.push(...value);
    } else {
      res.push(value);
    }
  });
  return res;
}

/**
 * Get a list of IDs of entities that that point to the specified entity. If we
 * were to delete the specified entity, doing so would break the relationships found
 * here. These references suggest (but doesn't guarantee) that the specified entity 
 * is likely "valid" and should not be deleted
 * 
 * @param {string} id entity ID
 * @returns {Promise} list of IDs of entities that reference the specified entity
 *  (incoming references)
 */
function getReferences(id) {
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

/**
 * Get a list of entities that the specified entity points to
 * 
 * @param {string} id entity ID
 * @returns {Promise} list of entity IDs that the specified entity references
 *  (outgoing references)
 */
function findReferencedEntities(id) {
  const ES_URL = process.env.ES_URL;
  const TYPE = process.env.TYPE;

  if (TYPE == 'User') {
    return Promise.resolve([]);
  }

  const url = `${ES_URL}?q=@id:"${id}"`;
  return fetch(url)
    .then(resp => resp.json())
    .then((data) => {
      const docs = data.hits.hits
        .map((hit) => {
          const doc = hit._source;
          const res = [];

          switch (TYPE) {
            case 'Funder':
              res.push(...expandProperties(doc, ['policy']));
              break;
            case 'Submission':
              res.push(...expandProperties(doc, ['grants', 'repositories', 'publication', 'submitter']));
              break;
            case 'Grant':
              res.push(...expandProperties(doc, ['primaryFunder', 'directFunder', 'pi', 'coPis']));
              break;
            }

            return res.filter(item => !!item);
        });
        console.log('###############');
        console.log(data.hits.hits);
        // console.log(expandProperties(data.hits.hits[0], ['primaryFunder']));
        console.log(docs);
        console.log('###############');
        return Promise.resolve(docs);
    })
    .catch(err => console.error(err));
}

export function reportRefs(ids = []) {
  if (!Array.isArray(ids)) {
    ids = [ids];
  }

  const results = {};
  ids.forEach(id => results[id] = {});

  const refByResolvers = new Map();
  const referenceFinders = new Map();

  ids.forEach((id) => {
    refByResolvers.set(
      id,
      getReferences(id).then((refs) => results[id].referencedBy = refs)
    );
    referenceFinders.set(
      id,
      findReferencedEntities(id).then(refs => results[id].references = refs)
    );
  });

  const promises = [
    ...Array.from(refByResolvers.values()),
    ...Array.from(referenceFinders.values())
  ];

  return Promise.all(promises)
    .then(() => Promise.resolve(results));
}
