const express = require('express');
const { exec, execSync } = require('child_process');
const app = express();
const fs = require('fs');
app.use(express.json());

function cleanUpFiles(files) {
  // Function to clean up specified files
  files.forEach((file) => {
    if (fs.existsSync(file)) {
      fs.unlinkSync(file);
    }
  });
}

app.post('/deploy', (req, res) => {
  const { imageUrl } = req.body;
  if (!imageUrl) {
    return res.status(400).send({ error: 'No image URL provided' });
  }

  const deploymentName = `dynamic-deployment-${Math.random().toString(36).substring(7)}`;
  const deploymentFile = `${deploymentName}.yaml`;
  const serviceFile = `${deploymentName}-service.yaml`;

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

  fs.writeFileSync(deploymentFile, deploymentYaml);
  fs.writeFileSync(serviceFile, serviceYaml);

  exec(
    `kubectl apply -f ${deploymentFile} && kubectl apply -f ${serviceFile}`,
    (error, stdout, stderr) => {
      if (error) {
        console.error(`exec error: ${error}`);
        cleanUpFiles([deploymentFile, serviceFile]); // Clean up files on error
        return res.status(500).send({ error: 'Deployment or Service creation failed' });
      }

      let nodePort;
      try {
        const getServiceCommand = `kubectl get svc ${deploymentName}-service -o=jsonpath='{.spec.ports[0].nodePort}'`;
        nodePort = execSync(getServiceCommand).toString().trim();
      } catch (err) {
        console.error('Error fetching NodePort:', err);
        cleanUpFiles([deploymentFile, serviceFile]); // Clean up files if NodePort retrieval fails
        return res.status(500).send({ error: 'Failed to fetch NodePort' });
      }

      console.log(`stdout: ${stdout}`);
      console.error(`stderr: ${stderr}`);

      // Clean up files after successful deployment
      cleanUpFiles([deploymentFile, serviceFile]);

      res.send({ message: `Deployment ${deploymentName} and Service created`, nodePort });
    }
  );
});

const port = 3000;
app.listen(port, () => {
  console.log(`Updated Server listening on port ${port}`);
});
