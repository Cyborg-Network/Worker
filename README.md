## Prerequisites

Ensure you have the following prerequisites on your master and worker nodes:

- A Linux-based environment.
- Node.js and npm installed on the master node for running the deployment service.

- Node version 16 and above installed
- PM2 installed

    ```bash
    npm i -g pm2
    ```
- Make sure that the server you install the Worker on has port `3000` allowing inbound requests

## Setup Guide


You will need to setup first a master node and then a worker node.

Clone the repository into your master node machine:
```bash
git clone https://github.com/Cyborg-Network/Worker.git
```

### Master Node Setup

First, set up your master node to initiate the Kubernetes cluster and start the Node.js deployment service.

#### 1. Install Node.js Dependencies

Navigate to your project directory and install the required Node.js dependencies:

```bash
npm install
```

#### 2. Environment Setup

Take a look at `.env.example`:
- `WORKER_ADDRESS`: Account address you register this Worker with
- `RPC_ENDPOINT`: The RPC endpoint of the Cyborg Node
- `IP_ADDRESS`: This holds the IP address of your worker (public or private)
- `DOMAIN_NAME`: If your worker is set with a domain, it goes here

These values can be manually customized if you know them already. Otherwise the scripts below will automate this setup process. Keep in mind the scripts are configured for an Ubuntu Linux machine. Using the setup scripts on other machines may introduce errors.

The `RPC_ENDPOINT` is defaulted to localhost at port `9988` which is the typical zombienet RPC endpoint for a parachain. The example `WORKER_ADDRESS` is set to the Alice default test account. 

If you decide to run the worker locally within a local network, use this command:
```
npm run setup:local
``` 
If you decide to setup your worker on a remote machine, use this command:
```
npm run setup:dev
``` 

This command creates a `.env` with the neccessary variables to run the worker properly. You can already edit the `.env` manually afterwards depending on your setup preference. The last command in the setup script will install your k3s cluster master node. You can always run the MasterSetup.sh again to retrieve a worker node join token (`k3s-node-token.txt`). You will need this token to connect a k3s worker node to the k3s master.


#### 3. Run Master Setup Script (Optional)
Execute the MasterSetup.sh script:
```bash
sh MasterSetup.sh
```
This script performs the following actions:

Installs k3s on the master node.
Saves the k3s node join token to `k3s-node-token.txt`.

### Worker Node Setup
After setting up the master node, add worker nodes to the cluster using the join token. 

On a seperate machine, you will only need to copy over the `WorkerSetup.sh` script to the k3s worker node. The script sets up k3s and joins the node to the master forming a cluster.

#### Networking Considerations: 
Please ensure the master and worker nodes are in the same network (alpha), also update the IP address of the server running the parachain node in the ENV file of the cloned local Worker repository

#### 1. Execute Worker Setup Script
On each worker node, run the WorkerSetup.sh script with the worker's name, master node's private IP address, and the join token present in the `k3s-node-token.txt` file:

```
sh WorkerSetup.sh <worker-name> <master-ip> <token>
```
Replace `<worker-name>`, `<master-ip>`, and `<token>` with your specific details.

### Register Cluster On Chain

After you finish the setup for both k3s master and k3s worker nodes, continue over to the Cyborg Chain and register this Cluster on to the blockchain with the IP and port number (`<your-k3s-master-ip-address>:3000`). If you decide to register with a different account address, please update the `WORKER_ADDRESS` variable inside the `.env` file

### Run the Server

#### 1. Run server start script

After registering your cluster, go ahead and start the server with the script below.

Inside the root directory of the `/Worker` run:

```bash
npm run pm2:start
```

#### 2. Check Deployment via API

check that the logs are running using:
```bash
pm2 logs
```

verify that the worker id is not null meaning that worker was successfuly registered onchain:


<img>

With the cluster ready, you can now access them using the Node.js API.

#### 3. Check Deployment via API
Send a Get request to /cluster-status endpoint to check that it's working:

```
curl -X GET "http://<master-node-ip>:3000/cluster-status"
```

## Alternative Workflow (Minikube)

This is an alternative workflow useing minikube to simulate a Worker cluster.

### Prerequisites Setup
- [Install Minikube](https://minikube.sigs.k8s.io/docs/start/?arch=%2Fmacos%2Farm64%2Fstable%2Fbinary+download)
- Install Docker
- Install Docker-compose

### Usage

Checkout the branch
```bash
git fetch
git checkout -b minikube remotes/origin/minikube
```
Then start the docker daemon and verify that it's running

```bash
sudo systemctl start docker
sudo systemctl status docker
```

Run `docker-compose`
```bash
docker-compose up --build
```

3 Workers will spun up with respective IPs and Ports
    - 0.0.0.0:3000
    - 0.0.0.0:3001
    - 0.0.0.0:3002

You will need to register these individually to your desired amount of workers to test on a development chain that is set to port 9988.
