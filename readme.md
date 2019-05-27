* npm ci
* node script.js

* node script.js | jq -r 'to_entries | map(.key as $region | .value | map("\($region)\t\(.logGroupName)\t\(.storedBytes)\t\(.retentionInDays)")) | flatten | .[]' | column -t
