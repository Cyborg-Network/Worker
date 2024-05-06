const express = require("express");
const { exec, execSync } = require("child_process");
const fs = require("fs");
const k8s = require("@kubernetes/client-node");
const app = express();
const { ApiPromise, WsProvider } = require("@polkadot/api");

app.use(express.json());

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

    const command = `kubectl logs -l app=${deploymentName} --all-containers=true`;
    const logStream = exec(command);

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

async function listenToSubstrateEvents() {
  console.log("Calling this now");
  const wsProvider = new WsProvider("ws://65.108.229.2:9944");
  //const api = await ApiPromise.create();
  const api = await ApiPromise.create({ provider: wsProvider });
  api.query.system
    .events((events) => {
      events.forEach((record) => {
        const { event } = record;
        console.log("event.record: ", event.section);
        console.log("extrinsic", event.method);
        if (
          event.section === "workerRegistration" &&
          event.method === "TaskScheduled"
        ) {
          const [worker, owner, task_id, task, assigned_ip] = event.data.map(
            (e) => e.toString()
          );

          deploy(task_id, task);
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