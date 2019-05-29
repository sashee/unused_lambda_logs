#### Install dependencies:

```npm ci```
### Lambda Log groups without lambda function

#### JSON output:

```npx https://github.com/sashee/unused_lambda_logs```

#### Columnar output:

```npx https://github.com/sashee/unused_lambda_logs | jq -r 'to_entries | map(.key as $region | .value | map("\($region)\t\(.logGroupName)\t\(.storedBytes)\t\(.retentionInDays)")) | flatten | .[]' | column -t```

#### Without retention set:

```npx https://github.com/sashee/unused_lambda_logs | jq -r 'to_entries | map(.key as $region | .value | .[] | select(has("retentionInDays") | not) | "\($region)\t\(.logGroupName)") | .[]'```

#### Stored bytes == 0

```npx https://github.com/sashee/unused_lambda_logs | jq -r 'to_entries | map(.key as $region | .value | .[] | select(.storedBytes == 0) | "\($region)\t\(.logGroupName)") | .[]'```
