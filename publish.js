#!/usr/bin/env node
/* Publish.js, publish a new version of the npm package as found in the current directory */
require('nscript')(function(shell, npm, git) {
	var package = JSON.parse(shell.read('package.json'));

	// Bump version number
	var nrs = package.version.split(".");
	nrs[2] = 1 + parseInt(nrs[2], 10);
	var version = package.version = shell.prompt("Please specify the new package version of '" + package.name + "' (Ctrl^C to abort)", nrs.join("."));
	if (!version.match(/^\d+\.\d+\.\d+$/))
		shell.exit(1, "Invalid semantic version: " + version);

	// Check registery data
	if (npm.silent().test("info", package.name)) {
		//package is registered in npm?
		var publishedPackageInfo = JSON.parse(npm.get("info", package.name, "--json"));
		if (publishedPackageInfo.versions == version || publishedPackageInfo.versions.indexOf(version) != -1)
			shell.exit(2, "Version " + package.version + " is already published to npm");

		shell.write('package.json', JSON.stringify(package, null, 4));

		// Finally, commit and publish!
		npm("publish");
		git("commit","-am","Published version " + version);
		git("tag", version);
		//git("push");
		git("push", { tags: true });
		console.log("Published!");
	}
	else
		shell.exit(1, package.name + " is not an existing npm package");
});