#!/usr/bin/env bash

# Given an entity ID, display the entity from the repository and any known references
# then delete the object
#
# Example:
#   delete-duplicate.sh --dry-run -t=User -u=username -password=password -h=localhost http://repo.example.com/user/1
# 
# OPTIONS:
#   * -u|--username : repository username
#   * -p|--password : repository password
#   * -t|--type     : 
#   * -h|--fcrepo-local-host : local hostname for the repository
#   * --es_url      : URL for search index
#   * -n|--dry-run  : dry run of the command. Fetch and show data, but do not execute the deletion
#   * -f            : do not prompt the user to confirm the deletion

# Some defaults for optional args
FCREPO_LOCAL_HOST=localhost
ES_PREFIX=http://localhost:9200/pass/_search
TYPE="User"

for i in "$@"; do
  case $i in
    -u=*|--username=*)
      FCREPO_USER="${i#*=}"
      shift
      ;;
    -p=*|--password=*)
      FCREPO_PASS="${i#*=}"
      shift
      ;;
    -h=*|--fcrepo-local-host=*)
      FCREPO_LOCAL_HOST="${i#*=}"
      shift
      ;;
    --es_url=*)
      ES_PREFIX="${i#*=}"
      shift
      ;;
    -n|--dry-run)
      DRY_RUN=TRUE
      shift
      ;;
    -f)
      FORCE=TRUE
      shift
      ;;
    -t=*|--type=*)
      TYPE="${i#*=}"
      shift
      ;;
    -*|--*)
      echo "Unknown option $i"
      exit 1
      ;;
    *)
      ID=$i
      ;;
  esac
done

echo "ID: $ID"
echo "USER: $FCREPO_USER"
echo "PASS: $FCREPO_PASS"
echo "Localized: $FCREPO_LOCAL_HOST"
echo "Elasticsearch: $ES_PREFIX"
echo "Dry run: $DRY_RUN"
echo "Force: $FORCE"
echo "Type: $TYPE"

if [[ -z "$FCREPO_USER" || -z "$FCREPO_PASS" ]]; then
  echo "Please set --username and --password arguments";
  exit 1;
fi

case $TYPE in
  "User")
    ES_QUERY="submitter:\"$ID\"+pi:\"$ID\"+copi:\"$ID\"+user:\"$ID\"+performedBy:\"$ID\""
    ;;
  "Funder")
    ES_QUERY="primaryFunder:\"$ID\"+directFunder:\"$ID\""
    ;;
  "Grant")
    ES_QUERY="grants:\"$ID\""
    ;;
  *)
    echo "Unknown type: $TYPE"
    exit 1
    ;;
esac

LOCALIZED_URL=${ID/fcrepo-test.pass.local/"$FCREPO_LOCAL_HOST"}

echo "Showing entity at the given URL ($LOCALIZED_URL):"
curl -s -u ${FCREPO_USER}:${FCREPO_PASS} -H "Accept: application/ld+json" "$LOCALIZED_URL" | jq

echo "References to this entity (from Elasticsearch):"
echo "$ES_PREFIX?default_operator=OR&q=${ES_QUERY}"
curl -s "$ES_PREFIX?default_operator=OR&q=${ES_QUERY}" | jq .hits

if [[ $DRY_RUN == TRUE ]]; then
  echo "Dry-run. Would execute:"
  echo "curl -u $FCREPO_USER:$FCREPO_PASS -X DELETE \"$LOCALIZED_URL\""
else
  if [[ $FORCE != TRUE ]]; then
    read -p "Confirm delete? ($LOCALIZED_URL) [Yn]" confirm
    confirm=${confirm:-Y}

    if [[ $confirm != [Yy] ]]; then
      echo "Aborting"
      exit 1
    fi
  fi

  curl -u $FCREPO_USER:$FCREPO_PASS -X DELETE "$LOCALIZED_URL"
  # Optionally check FCREPO and/or ES for this object?
fi

echo ""
