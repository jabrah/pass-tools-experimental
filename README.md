Simple tools to help check duplicate entity references in PASS

# pass-duplicate-checker

Running this will report duplicate entities in the database with a given (PASS) type. For each entity that is reported, you will also see a list of other entities that reference the duplicate entity, as well as a list of other entities that are refereced by the duplicate entity. The tool is meant to aid data checking by filtering the data from the Dupe Checker and showing associated references, as found in Elasticsearch.

## Requirements

This node tool tries to clean up the the data captured by this tool: https://github.com/emetsger/dupe-checker. See 
[PASS Duplicates error checking](https://github.com/jabrah/pass-tools-experimental/wiki/PASS-Duplicates-error-checking) for some notes on running that tool.

Like the Dupe Checker, this tool assumes that Elasticsearch is "correct" and in sync with Fedora.

## Installing

``` bash
npm install
npm link
```

The linking step should create the `check-pass-duplicates` symlink in `node_modules/bin`, so it should be available on the command line.

## Running

Before you run, you'll need to have successfully run the Dupe Checker. See [PASS Duplicates error checking](https://github.com/jabrah/pass-tools-experimental/wiki/PASS-Duplicates-error-checking) for details on running that tool.

``` bash
DATA=../duplicates.db check-pass-duplicates --type Funder
```

### Options

* DATA : filepath pointing to the DB produced by the Dupe Checker
* ES_URL : Elasticsearch search endpoint (*default: `http://localhost:9200/pass/_search`*)
* --type <User|Funder|Grant> : the PassType to check (_default: User_)

### Sample output

``` js
Using environment:
{
  ES_URL: undefined,
  CSV_MODE: false,
  SQL_MODE: true,
  DATA_PATH: '../pass_test_duplicates_1-21-2022.db',
  TYPE: 'Funder'
}

Using database: "../pass_test_duplicates_1-21-2022.db"
{
  "http://localhost:8080/fcrepo/rest/funders/4d/cf/86/63/4dcf8563-26f2-40cd-b7f1-06310e91c14f": {
    "references": [
      []
    ],
    "referencedBy": [
      "http://localhost:8080/fcrepo/rest/grants/f6/d3/31/7c/f6d3317c-2d97-4acd-9db9-da12470608cf"
    ]
  },
  "http://localhost:8080/fcrepo/rest/funders/05/69/30/5b/0569305b-f1ba-4bf1-b196-8a70ae5b7b85": {
    "references": [
      []
    ],
    "referencedBy": [
      "http://localhost:8080/fcrepo/rest/grants/aa/66/57/ad/aa6657ad-a04f-4fed-b081-4be58901dd59"
    ]
  }
}
```

# delete-duplicates.sh

This script is intended to aid the deletion of individual entities in Fedora **(in it's current state, only in TEST)**. The script will display the JSON representation of an entity, given its ID (URI), as well as any other entities that reference the specified entity. It will then ask for confirmation to delete and if given a positive confirmation, will issue a DELETE request to Fedora.

As with the above tool, this also assumes an SSH tunnel to various services in PASS TEST.

### Options

* -u=<username> : Fedora username (would be useful to change to ENV var)
* -p=<password> : password (would be useful to change to ENV var)
* -h=<fcrepo_local_host> : the tool will try a naive translation from the private URI to localhost
* --es_url=<url> : Elasticsearch endpoint (*default: http://localhost:9200/pass/_search*)
* -t|--type=<User|Funder|Grant> : PassType of the entity in question
* -n|--dry-run : dry run, will run everything except for the deletion. Will instead print out the deletion command

### Running

``` bash
./delete-duplicate.sh --dry-run -t=<PassType> -u=<username> -p=<password> <ENTITY_URI>

Example:

./delete-duplicate.sh --dry-run -t=Grant -u=user -p=password -h=localhost http://localhost:8080/fcrepo/rest/grants/14/01/84/ae/140184ae-5bd3-4f50-a3fa-08ac68d6962c
```

# Resources
* [Dupe Checker](https://github.com/emetsger/dupe-checker)
* [PASS Duplicates error checking](https://github.com/jabrah/pass-tools-experimental/wiki/PASS-Duplicates-error-checking)