## Prerequisites

Ensure you have the following prerequisites on your master and worker nodes:

- A Linux-based environment.
- Node.js and npm installed on the master node for running the deployment service.

## Setup Guide

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

#### 1. Execute Worker Setup Script
On each worker node, run the WorkerSetup.sh script with the worker's name, master node's IP address, and the join token present in the `k3s-node-token.txt` file:

```
sh WorkerSetup.sh <worker-name> <master-ip> <token>
```
Replace <worker-name>, <master-ip>, and <token> with your specific details.


### Deploying Applications
With the cluster ready, you can now deploy applications using the Node.js API.

#### 1. Trigger Deployment via API
Send a POST request to /deploy endpoint with the Docker image URL:

```
curl -X POST http://<master-node-ip>:3000/deploy \
-H "Content-Type: application/json" \
-d '{"imageUrl": your_public_docker_image}'
```
This request deploys the specified Docker image as a Kubernetes deployment and creates a NodePort service to expose it.

#### 2. Accessing Deployments
The API response includes the NodePort assigned to the service. Access your deployment using master node IP address and the provided NodePort:
```
http://<node-ip>:<NodePort>
```