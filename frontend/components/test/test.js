// Sandbox Control Panel - Renderer

// Clear entire sandbox
document.getElementById('btnClearSandbox').addEventListener('click', async () => {
	const result = await window.api.clearSandbox('all');
	if (result.success) {
		console.log('Sandbox cleared:', result.data.message);
	} else {
		console.error('Clear failed:', result.message);
	}
});

// Clear specific sandbox folder
document.getElementById('btnClearSandboxFolder').addEventListener('click', async () => {
	const result = await window.api.clearSandbox('controls/stuff');
	if (result.success) {
		console.log('Folder cleared:', result.data.message);
	} else {
		console.error('Clear failed:', result.message);
	}
});

// Prepare sandbox from config
document.getElementById('btnPrepareSandbox').addEventListener('click', async () => {
	const result = await window.api.prepareSandbox('test.json');
	if (result.success) {
		console.log('Sandbox prepared:', result.data.prepared);
	} else {
		console.error('Prepare failed:', result.message);
	}
});

// Assemble sandbox
document.getElementById('btnAssembleSandbox').addEventListener('click', async () => {
	const result = await window.api.assembleSandbox('test.json');
	if (result.success) {
		console.log('Sandbox assembled:', result.data.message);
	} else {
		console.error('Assemble failed:', result.message);
	}
});

// Launch test app
document.getElementById('btnLaunch').addEventListener('click', async () => {
	const result = await window.api.startApp('components/test/script.js'); //change to sandbox/controls/stuff/thing.js if you want the one that gets copied to be ran
	if (result.success) {
		console.log(`Launched ${result.data.launched} (PID: ${result.data.pid})`);
	} else {
		console.error('Launch failed:', result.message);
	}
});

// Navigate back to menu
document.getElementById('btnNavigate').addEventListener('click', async () => {
	const result = await window.api.navigate('launcher/menu.html');
	if (result.success) {
		console.log('Navigated to:', result.data);
	} else {
		console.error('Navigation failed:', result.message);
	}
});
