const AWS = require("aws-sdk");
const ec2 = new AWS.EC2();

const EMPTY = Symbol("empty");

(async () => {
	const regions = (await ec2.describeRegions().promise()).Regions.map(({RegionName}) => RegionName).filter((region) => region === "eu-west-1" || region === "us-east-1" || true);
	const lambdas = await Promise.all(regions.map(async (region) => {
		const lambda = new AWS.Lambda({region});
		async function* fetchLambdas() {
			let NextMarker = EMPTY;
			while (NextMarker || NextMarker === EMPTY) {
				const functions = await lambda.listFunctions({Marker: NextMarker !== EMPTY ? NextMarker : undefined}).promise();
				yield* functions.Functions.map(({FunctionName}) => FunctionName);
				NextMarker = functions.NextMarker;
			}
		}

		const res = [];
		for await (const lf of fetchLambdas()) {
			res.push(lf);
		}
		return {region, functions: res};
	}));

	const logGroups = await Promise.all(regions.map(async (region) => {
		const logs = new AWS.CloudWatchLogs({region});
		async function* fetchLogGroups() {
			let nextToken = EMPTY;
			while (nextToken || nextToken === EMPTY) {
				const logGroups = await logs.describeLogGroups({nextToken: nextToken !== EMPTY ? nextToken : undefined, logGroupNamePrefix: "/aws/lambda/"}).promise();
				yield* logGroups.logGroups.map(({logGroupName, storedBytes, retentionInDays}) => ({logGroupName, storedBytes, retentionInDays}));
				nextToken = logGroups.nextToken;
			}
		}
		const res = [];
		for await (const lg of fetchLogGroups()) {
			res.push(lg);
		}

		return {region, logGroups: res};
	}));

	const unusedLogGroups = logGroups.map(({region, logGroups}) => {
		const unusedLogGroups = logGroups.filter(({logGroupName}) => {
			return ![
				...lambdas.find(({region: r}) => r === region).functions,
				...lambdas.map(({region, functions}) => functions.map((fn) => `${region}.${fn}`)).flat(),
			].map((lambda) => `/aws/lambda/${lambda}`).includes(logGroupName);
		});
		return {region, unusedLogGroups};
	});

	const result = Object.assign({}, ...unusedLogGroups.filter(({unusedLogGroups}) => unusedLogGroups.length > 0).map(({region, unusedLogGroups}) => ({[region]: unusedLogGroups})));

	console.log(JSON.stringify(result));
})();

