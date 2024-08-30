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

### Environment

Make sure to copy the `.env.example` and replace the contents `WORKER_ADDRESS` to the address you register this worker on the Cyborg Network chain and `RPC_ENDPOINT` to the correct rpc endpoint of the chain you are testing on. The example WORKER_ADDRESS is set to the Alice default test account. 

```
cp .env.example .env

``` 

### Master Node Setup

First, set up your master node to initiate the Kubernetes cluster and start the Node.js deployment service.

#### 1. Install Node.js Dependencies

Navigate to your project directory and install the required Node.js dependencies:

```bash
npm install
```
#### 2. Run Master Setup Script
Execute the MasterSetup.sh script:
```bash
sh MasterSetup.sh
```
This script performs the following actions:

Installs k3s on the master node.
Saves the k3s node join token to k3s-node-token.txt
Starts the Node.js application that listens for deployment requests on port 3000.

### Worker Node Setup
After setting up the master node, add worker nodes to the cluster using the join token.

#### Networking Considerations: 
Please ensure the master and worker nodes are in the same network (alpha), also update the IP address of the server running the parachain node in the ENV file of the cloned local Worker repository

#### 1. Execute Worker Setup Script
On each worker node, run the WorkerSetup.sh script with the worker's name, master node's private IP address, and the join token present in the `k3s-node-token.txt` file:

```
sh WorkerSetup.sh <worker-name> <master-ip> <token>
```
Replace <worker-name>, <master-ip>, and <token> with your specific details.


### Run the Server

#### 1. Run server start script

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

## Dev Workflow

The developemnt workflow uses minikube to simular a Worker cluster.

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
