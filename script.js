const AWS = require("aws-sdk");
const ec2 = new AWS.EC2();

const getPaginatedResults = async (fn) => {
	const EMPTY = Symbol("empty");
	const res = [];
	for await (const lf of (async function*() {
		let NextMarker = EMPTY;
		while (NextMarker || NextMarker === EMPTY) {
			const {marker, results} = await fn(NextMarker !== EMPTY ? NextMarker : undefined);

			yield* results;
			NextMarker = marker;
		}
	})()) {
		res.push(lf);
	}

	return res;
};

(async () => {
	const regions = (await ec2.describeRegions().promise()).Regions.map(({RegionName}) => RegionName);
	const [lambdas, logGroups] = await Promise.all([
		// get all lambdas
		Promise.all(regions.map(async (region) => {
			const lambda = new AWS.Lambda({region});
			const res = await getPaginatedResults(async (NextMarker) => {
				const functions = await lambda.listFunctions({Marker: NextMarker}).promise();
				return {
					marker: functions.NextMarker,
					results: functions.Functions.map(({FunctionName}) => FunctionName),
				};
			});

			return {region, functions: res};
		})),
		// get all log groups
		Promise.all(regions.map(async (region) => {
			const logs = new AWS.CloudWatchLogs({region});
			const res = await getPaginatedResults(async (NextMarker) => {
				const logGroups = await logs.describeLogGroups({nextToken: NextMarker, logGroupNamePrefix: "/aws/lambda/"}).promise();
				return {
					marker: logGroups.nextToken,
					results: logGroups.logGroups.map(({logGroupName, storedBytes, retentionInDays}) => ({logGroupName, storedBytes, retentionInDays})),
				};

			});

			return {region, logGroups: res};
		}))
	]);

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

