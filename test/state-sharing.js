"use strict"
const test = require('tape');
const child_process = require("child_process")

function testOutput(t, cmd, expected) {
	test("Global state sharing: " + cmd, t => {
		const output = child_process.exec(
			'node -e \'' + cmd + '\'',
			{ cwd: __dirname },
			(e, stdout, stderr) => {
				if (e)
					t.fail(e)
				else {
					t.equal(stdout.toString(), '')
					t.equal(stderr.toString(), expected)
					t.end()
				}
			}
		);
	})
}

test("it should handle multiple instances with the correct warnings", t => {
	testOutput(t,
		'require("..");require("../lib/mobx.umd.js")',
		'[mobx] Warning: there are multiple mobx instances active. This might lead to unexpected results. See https://github.com/mobxjs/mobx/issues/1082 for details.\n'
	);
	testOutput(t,
		'require("..").extras.shareGlobalState();require("../lib/mobx.umd.js")',
		'[mobx] Deprecated: Using `shareGlobalState` is not recommended, use peer dependencies instead. See https://github.com/mobxjs/mobx/issues/1082 for details.' +
		'\n[mobx] Warning: there are multiple mobx instances active. This might lead to unexpected results. See https://github.com/mobxjs/mobx/issues/1082 for details.\n'
	);
	testOutput(t,
		'require("..").extras.shareGlobalState();require("../lib/mobx.umd.js").extras.shareGlobalState()',
		'[mobx] Deprecated: Using `shareGlobalState` is not recommended, use peer dependencies instead. See https://github.com/mobxjs/mobx/issues/1082 for details.'+
		'\n[mobx] Deprecated: Using `shareGlobalState` is not recommended, use peer dependencies instead. See https://github.com/mobxjs/mobx/issues/1082 for details.\n'
	);
	testOutput(t, 'require("..").extras.isolateGlobalState();require("../lib/mobx.umd.js").extras.isolateGlobalState()', '');
	testOutput(t, 'require("..");require("../lib/mobx.umd.js").extras.isolateGlobalState()', '');
	testOutput(t, 'require("..").extras.isolateGlobalState();require("../lib/mobx.umd.js")', '');
	t.end();
})
