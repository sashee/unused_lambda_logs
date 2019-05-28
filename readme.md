#### Install dependencies:

```npm ci```
### Lambda Log groups without lambda function

#### JSON output:

```node script.js```

#### Columnar output:

```node script.js | jq -r 'to_entries | map(.key as $region | .value | map("\($region)\t\(.logGroupName)\t\(.storedBytes)\t\(.retentionInDays)")) | flatten | .[]' | column -t```

### Without retention set:

```node script.js | jq -r 'to_entries | map(.key as $region | .value | .[] | select(has("retentionInDays") | not) | "\($region)\t\(.logGroupName)") | .[]'```

### Stored bytes == 0

```node script.js | jq -r 'to_entries | map(.key as $region | .value | .[] | select(.storedBytes == 0) | "\($region)\t\(.logGroupName)") | .[]'```
