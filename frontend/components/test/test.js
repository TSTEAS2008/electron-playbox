// Playbox Control Panel - Renderer

// Clear entire playbox
document.getElementById('btnClearPlaybox').addEventListener('click', async () => {
	const result = await window.api.clearPlaybox('all');
	if (result.success) {
		console.log('Playbox cleared:', result.data.message);
	} else {
		console.error('Clear failed:', result.message);
	}
});

// Clear specific playbox folder
document.getElementById('btnClearPlayboxFolder').addEventListener('click', async () => {
	const result = await window.api.clearPlaybox('controls/stuff');
	if (result.success) {
		console.log('Folder cleared:', result.data.message);
	} else {
		console.error('Clear failed:', result.message);
	}
});

// Prepare playbox from config
document.getElementById('btnPreparePlaybox').addEventListener('click', async () => {
	const result = await window.api.preparePlaybox('test.json');
	if (result.success) {
		console.log('Playbox prepared:', result.data.prepared);
	} else {
		console.error('Prepare failed:', result.message);
	}
});

// Assemble playbox
document.getElementById('btnAssemblePlaybox').addEventListener('click', async () => {
	const result = await window.api.assemblePlaybox('test.json');
	if (result.success) {
		console.log('Playbox assembled:', result.data.message);
	} else {
		console.error('Assemble failed:', result.message);
	}
});

// Launch test app
document.getElementById('btnLaunch').addEventListener('click', async () => {
	const result = await window.api.startApp('components/test/script.js'); //change to playbox/controls/stuff/thing.js if you want the one that gets copied to be ran
	if (result.success) {
		console.log(`Launched ${result.data.launched} (PID: ${result.data.pid})`);
	} else {
		console.error('Launch failed:', result.message);
	}
});

// Navigate back to menu
document.getElementById('btnNavigate').addEventListener('click', async () => {
	const result = await window.api.navigate('launcher/menu.html', 'static');
	if (result.success) {
		console.log('Navigated to:', result.data);
	} else {
		console.error('Navigation failed:', result.message);
	}
});
