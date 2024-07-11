const express = require("express");
const { exec } = require("child_process");
const fs = require("fs");
const k8s = require("@kubernetes/client-node");
const app = express();
const cors = require('cors');
const path = require('path');
const https = require('https');
require('dotenv').config();

const WORKER_ADDRESS = process.env.WORKER_ADDRESS || '';
const NODE_RPC = process.env.RPC_ENDPOINT || '';

const { ApiPromise, WsProvider } = require("@polkadot/api");
const { formatOutput, formatMemOutput, formatDiskOutput, formatCpuOutput } = require("./utils/formatter")

app.use(express.json());

app.use(cors({
  origin: ['http://127.0.0.1:8000', 'http://localhost:8000', 'http://127.0.0.1:8000/cyborg-connect', 'http://localhost:8000/cyborg-connect', 'https://cyborg-network.github.io', 'https://cyborg-network.github.io/cyborg-connect']
}));

const deploymentMap = {};

// Kubernetes Client setup
const kc = new k8s.KubeConfig();
const kubeconfigPath = "/etc/rancher/k3s/k3s.yaml";
kc.loadFromFile(kubeconfigPath);
const k8sApi = kc.makeApiClient(k8s.CoreV1Api);
const k8sAppsV1Api = kc.makeApiClient(k8s.AppsV1Api);

function deploy(taskId, imageUrl) {
  console.log("taskId:", taskId);
  console.log("imageUrl:", imageUrl);
  const deploymentName = `dynamic-deployment-${Math.random()
    .toString(36)
    .substring(7)}`;
  deploymentMap[taskId] = deploymentName;

  const filenameBase = deploymentName.replace(/[^a-zA-Z0-9-]/g, "");

  const serviceYaml = `
    apiVersion: v1
    kind: Service
    metadata:
      name: ${deploymentName}-service
    spec:
      type: NodePort
      selector:
        app: ${deploymentName}
      ports:
        - protocol: TCP
          port: 8080
          targetPort: 8080
    `;

  const deploymentYaml = `
    apiVersion: apps/v1
    kind: Deployment
    metadata:
      name: ${deploymentName}
    spec:
      replicas: 1
      selector:
        matchLabels:
          app: ${deploymentName}
      template:
        metadata:
          labels:
            app: ${deploymentName}
        spec:
          containers:
          - name: ${deploymentName}-container
            image: ${imageUrl}
    `;

  fs.writeFileSync(`${filenameBase}.yaml`, deploymentYaml);
  fs.writeFileSync(`${filenameBase}-service.yaml`, serviceYaml);

  exec(
    `kubectl apply -f ${filenameBase}.yaml && kubectl apply -f ${filenameBase}-service.yaml`,
    (error, stdout, stderr) => {
      if (error) {
        console.error(`exec error: ${error}`);
      } else {
        console.log(`stdout: ${stdout}`);
        console.error(`stderr: ${stderr}`);
      }
    }
  );
}

app.get("/cluster-status", (req, res) => {
  console.log("check k3s status: ", req.params);

  res.json({
    deployment_status: true,
  });
});

// app.get("/deployment-status/:taskId", async (req, res) => {
//   console.log("taskId: ", req.params)
//   const { taskId } = req.params;
//   console.log("taskId1: ", taskId)

app.get("/deployment-status/:taskId", async (req, res) => {
  const { taskId } = req.params;
  console.log("taskId1: ", taskId);
  if (!taskId) {
    return res.status(400).send({ error: "No task ID provided" });
  }

  try {
    const deploymentName = deploymentMap[taskId];
    if (!deploymentName) {
      return res
        .status(404)
        .send({ error: "Deployment not found for provided task ID" });
    }

    const deployment = await k8sAppsV1Api.readNamespacedDeployment(
      deploymentName,
      "default"
    );
    const status = deployment.body.status;

    res.json({ conditions: status.conditions });
  } catch (error) {
    console.error("Error fetching deployment status:", error);
    res.status(500).send({ error: "Failed to fetch deployment status" });
  }
});

app.get("/logs/:taskId", async (req, res) => {
  const { taskId } = req.params;
  if (!taskId) {
    return res.status(400).send({ error: "No task ID provided" });
  }

  try {
    const deploymentName = deploymentMap[taskId];
    if (!deploymentName) {
      return res
        .status(404)
        .send({ error: "Deployment not found for provided task ID" });
    }

    const command = `kubectl logs -l app=${deploymentName} --all-containers=true --tail=100`;
    const logStream = exec(command, (error, stdout, stderr) => {
      console.log(`stdout: ${stdout}`);
      if (error) {
        console.error(`exec error: ${error}`);
      } else {
        console.log(`stdout: ${stdout}`);
        console.error(`stderr: ${stderr}`);
      }
    });

    const test = await executeCommand(command)
    console.log("testing:: ", test)

    logStream.stdout.pipe(res);
    logStream.on("error", (error) => {
      console.error("Error streaming logs:", error);
      res.status(500).send({ error: "Failed to stream logs" });
    });
  } catch (error) {
    console.error("Error fetching deployment:", error);
    res.status(500).send({ error: "Failed to fetch deployment" });
  }
});

const executeCommand = (command) => {
  return new Promise((resolve, reject) => {
      exec(command, (error, stdout, stderr) => {
          if (error) {
              console.error(`${command} error: `, error);
              reject(error);
          } else {
              resolve(stdout.trim());
          }
      });
  });
};

app.get('/system-specs', async (req, res) => {
  try {
    const specs = {};
    specs.hostname = await executeCommand('hostname');
    specs.kernelVersion = await executeCommand('uname -r');

    const osInfo = await executeCommand('lsb_release -a 2>/dev/null || cat /etc/os-release');
    specs.operatingSystem = formatOutput(osInfo)

    const cpuInfo = await executeCommand('lscpu');
    specs.cpuInformation = formatOutput(cpuInfo.trim())

    const localeInfo = await executeCommand('curl -s ipinfo.io');
    specs.localeInformation = JSON.parse(localeInfo)

    res.json(specs);
  } catch (error) {
      console.error('Error:', error);
      res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/consumption-metrics', async (req, res) => {
  try {
    const specs = {};
    
    const cpuUse = await executeCommand('top -bn1 | grep "Cpu(s)"');
    const memUse = await executeCommand('free -m');
    const diskUse = await executeCommand('df -h');

    specs.cpuUsage = formatCpuOutput(cpuUse.trim())
    specs.memoryUsage = formatMemOutput(memUse.trim())
    specs.diskUsage = formatDiskOutput(diskUse.trim())

    res.json(specs);
  } catch (error) {
      console.error('Error:', error);
      res.status(500).json({ error: 'Internal Server Error' });
  }
});

async function listenToSubstrateEvents() {
  console.log("Calling this now");
  // const wsProvider = new WsProvider("wss://fraa-flashbox-3239-rpc.a.stagenet.tanssi.network");
  console.log('node: ',NODE_RPC)
  const wsProvider = new WsProvider(NODE_RPC);
  //const api = await ApiPromise.create();
  const api = await ApiPromise.create({ provider: wsProvider });
  api.query.system
    .events((events) => {
      events.forEach((record) => {
        const { event } = record;
        console.log("event.record: ", event.section);
        console.log("extrinsic", event.method);
        if (
          event.section === "taskManagement" &&
          event.method === "TaskScheduled"
        ) {
          const [assigned_worker, task_owner, task_id, task] = event.data.map(
            (e) => e.toHuman()
          );
          const worker_addr = assigned_worker[0];
          console.log({worker_addr, task_owner, task_id, task})
          console.log("Matches account check: ", worker_addr === WORKER_ADDRESS, worker_addr, WORKER_ADDRESS)
          if (worker_addr == WORKER_ADDRESS) {
            console.log("Matches account!")
            deploy(task_id, task);
          }
          // deploy(task_id, task);
        }
      });
    })
    .catch(console.error);
}

listenToSubstrateEvents().catch((error) => {
  console.error("Failed to listen to Substrate events:", error);
});

const port = 3000;

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});

// const sslServer = https.createServer({
//     key: fs.readFileSync(path.join(__dirname, 'cert', 'key.pem')),
//     cert: fs.readFileSync(path.join(__dirname, 'cert', 'cert.pem')),
//   },
//   app
// );

// sslServer.listen(port, ()=> console.log(`Server listening on port ${port}`))