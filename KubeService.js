const express = require('express');
const { exec } = require('child_process');
const app = express();
app.use(express.json());

app.post('/deploy', (req, res) => {
  const { imageUrl } = req.body;
  if (!imageUrl) {
    return res.status(400).send({ error: 'No image URL provided' });
  }

  const deploymentName = `dynamic-deployment-${Math.random().toString(36).substring(7)}`;
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

  const fileName = `${deploymentName}.yaml`;
  require('fs').writeFileSync(fileName, deploymentYaml);

  exec(`kubectl apply -f ${fileName}`, (error, stdout, stderr) => {
    if (error) {
      console.error(`exec error: ${error}`);
      return res.status(500).send({ error: 'Deployment failed' });
    }
    console.log(`stdout: ${stdout}`);
    console.error(`stderr: ${stderr}`);
    res.send({ message: `Deployment ${deploymentName} created` });
  });
});

const port = 8000;
app.listen(port, () => {
  console.log(`Old Server listening on port ${port}`);
});
