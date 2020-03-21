'use strict';
const fs = require('fs');
const path = require('path');
const test = require('ava');
const pify = require('pify');
const { Application } = require('spectron');

test.serial.beforeEach(async t => {
	t.context.spectron = new Application({
		path: 'node_modules/.bin/electron',
		args: ['run.js', '--files=3']
	});

	await t.context.spectron.start();
});

test.serial.beforeEach(async t => {
	const files = await pify(fs.readdir)(
		path.join(__dirname, '../mock/fixtures')
	);
	t.context.files = files.filter(file => file !== 'electron-master.zip');
});

test.serial.afterEach.always(async t => {
	await t.context.spectron.stop();
});

test('download a single file', async t => {
	const { client } = t.context.spectron;
	await client.waitUntilWindowLoaded();
	await client.url(
		`http://localhost:8080/index.html?files=${JSON.stringify(t.context.files)}`
	);
	await client.waitForExist(`[data-unique-filename="${t.context.files[0]}"]`);
	await client.click(`[data-unique-filename="${t.context.files[0]}"]`);

	// This seems to only work on Mac and Linux/Unity
	// Otherwise badgeCount is always zero "0"
	const badgeCount = await t.context.spectron.electron.remote.app.badgeCount();
	if (['darwin'].includes(process.platform)) {
		t.is(badgeCount, 1);
	} else {
		t.is(badgeCount, 0);
	}
});

test('download a couple files', async t => {
	const { client } = t.context.spectron;
	await client.waitUntilWindowLoaded();
	await client.url(
		`http://localhost:8080/index.html?files=${JSON.stringify(t.context.files)}`
	);
	await client.waitForExist(`[data-unique-filename="${t.context.files[1]}"]`);
	await client.waitForExist(`[data-unique-filename="${t.context.files[2]}"]`);
	await client.click(`[data-unique-filename="${t.context.files[1]}"]`);
	await client.click(`[data-unique-filename="${t.context.files[2]}"]`);

	// This seems to only work on Mac and Linux/Unity
	// Otherwise badgeCount is always zero "0"
	const badgeCount = await t.context.spectron.electron.remote.app.badgeCount();
	if (['darwin'].includes(process.platform)) {
		// The first download appears to finish before the second is added sometimes
		t.true(badgeCount === 1 || badgeCount === 2);
	} else {
		t.is(badgeCount, 0);
	}
});
