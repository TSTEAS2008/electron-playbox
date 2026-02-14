// process-manager.js

const processList = document.getElementById('process-list');
const btnRefresh = document.getElementById('btnRefresh');
const btnKillAll = document.getElementById('btnKillAll');

console.log("Type window.api.startApp(\"components/runner.js\") in order to start an app you can try to kill.");
console.log("Refresh the list, read the pid's number N and type foo=await window.api.readApp(N), then type console.log(atob(foo.data.stdout)) to see some output.");

async function refreshList() {
    const result = await window.api.listApps();

    if (result.success) {
        const { pids, count } = result.data;

        if (count === 0) {
            processList.innerHTML = '<p>No running processes</p>';
        } else {
            processList.innerHTML = `<p>Running processes: ${count}</p>`;
            const list = document.createElement('ul');
            pids.forEach(pid => {
                const item = document.createElement('li');
                item.textContent = `PID: ${pid}`;

                const killBtn = document.createElement('button');
                killBtn.textContent = 'Kill';
                killBtn.onclick = async () => {
                    const killResult = await window.api.killApp(pid);
                    if (killResult.success) {
                        console.log(`Killed PID ${pid}`);
                        refreshList();
                    } else {
                        console.error(`Failed to kill PID ${pid}`);
                    }
                };

                item.appendChild(killBtn);
                list.appendChild(item);
            });
            processList.appendChild(list);
        }
    } else {
        processList.innerHTML = '<p>Failed to list processes</p>';
        console.error('List failed:', result.message);
    }
}

async function killAll() {
    const result = await window.api.listApps();

    if (result.success) {
        const { pids } = result.data;

        for (const pid of pids) {
            await window.api.killApp(pid);
        }

        console.log('All processes killed');
        refreshList();
    }
}

btnRefresh.addEventListener('click', refreshList);
btnKillAll.addEventListener('click', killAll);

// Auto-refresh on load
refreshList();
