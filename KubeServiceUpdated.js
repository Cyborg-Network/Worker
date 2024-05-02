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

app.post("/deploy", (req, res) => {
  const { imageUrl } = req.body;
  if (!imageUrl) {
    return res.status(400).send({ error: "No image URL provided" });
  }

  const deploymentName = `dynamic-deployment-${Math.random()
    .toString(36)
    .substring(7)}`;
  const filenameBase = deploymentName.replace(/[^a-zA-Z0-9-]/g, "");
  deploymentMap[imageUrl] = deploymentName;

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
        return res
          .status(500)
          .send({ error: "Deployment or Service creation failed" });
      }
      let nodePort;
      try {
        const getServiceCommand = `kubectl get svc ${deploymentName}-service -o=jsonpath='{.spec.ports[0].nodePort}'`;
        nodePort = execSync(getServiceCommand).toString().trim();
      } catch (error) {
        console.error("Error fetching NodePort:", error);
        return res.status(500).send({ error: "Failed to fetch NodePort" });
      }

      console.log(`stdout: ${stdout}`);
      console.error(`stderr: ${stderr}`);
      res.send({
        message: `Deployment ${deploymentName} and Service created`,
        nodePort: nodePort,
      });
    }
  );
});

app.get("/nodes", async (req, res) => {
  try {
    const nodes = await k8sApi.listNode();
    const nodeData = nodes.body.items.map((node) => ({
      name: node.metadata.name,
      labels: node.metadata.labels,
      taints: node.spec.taints || [],
      status:
        node.status.conditions.find((cond) => cond.type === "Ready")?.status ||
        "Unknown",
    }));
    res.json(nodeData);
  } catch (error) {
    console.error("Error fetching nodes:", error);
    res.status(500).send({ error: "Failed to fetch node data" });
  }
});

app.get("/nodes2", async (req, res) => {
  try {
    const nodes = await k8sApi.listNode();
    const nodeData = nodes.body.items.map((node) => {
      // Function to convert Ki to GB
      const convertKiToGB = (ki) => {
        const kib = parseInt(ki.replace("Ki", ""), 10);
        return kib / 1024 ** 2;
      };

      return {
        name: node.metadata.name,
        labels: node.metadata.labels,
        taints: node.spec.taints || [],
        status:
          node.status.conditions.find((cond) => cond.type === "Ready")
            ?.status || "Unknown",
        cpu: node.status.capacity.cpu,
        memory: convertKiToGB(node.status.capacity.memory).toFixed(2) + "GB",
        allocatableCpu: node.status.allocatable.cpu,
        allocatableMemory:
          convertKiToGB(node.status.allocatable.memory).toFixed(2) + "GB",
      };
    });

    res.json(nodeData);
  } catch (error) {
    console.error("Error fetching nodes:", error);
    res.status(500).send({ error: "Failed to fetch node data" });
  }
});

app.get("/deployment-status", async (req, res) => {
  const { imageName } = req.body;
  if (!imageName) {
    return res.status(400).send({ error: "No image name provided" });
  }

  try {
    const deploymentName = deploymentMap[imageName];
    if (!deploymentName) {
      return res
        .status(404)
        .send({ error: "Deployment not found for provided image" });
    }

    // Get the deployment from Kubernetes
    const deployment = await k8sAppsV1Api.readNamespacedDeployment(
      deploymentName,
      "default"
    );
    const status = deployment.body.status;

    const response = {
      conditions: status.conditions,
    };

    res.json(response);
  } catch (error) {
    if (error.response && error.response.statusCode === 404) {
      res.status(404).send({ error: "Deployment not found" });
    } else {
      console.error("Error fetching deployment status:", error);
      res.status(500).send({ error: "Failed to fetch deployment status" });
    }
  }
});

app.get("/logs", async (req, res) => {
  const { imageName } = req.body;
  if (!imageName) {
    return res.status(400).send({ error: "No image name provided" });
  }

  try {
    const deploymentName = deploymentMap[imageName];
    if (!deploymentName) {
      return res
        .status(404)
        .send({ error: "Deployment not found for provided image" });
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
  const wsProvider = new WsProvider("wss://73.114.168.51:9944");
  const api = await ApiPromise.create({ provider: wsProvider });

  api.query.system
    .events((events) => {
      events.forEach((record) => {
        const { event } = record;
        if (event.section === "" && event.method === "TaskScheduled") {
          const { worker, owner, task_id, task } = event.data.toJSON();
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
