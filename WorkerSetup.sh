#!/bin/sh

# Check if exactly 3 parameters are provided
if [ "$#" -ne 3 ]; then
    echo "Usage: $0 <worker-name> <master-ip> <token>"
    exit 1
fi

# Assign the script parameters to variables
WORKER_NAME=$1
MASTER_IP=$2
TOKEN=$3

# Execute the command to join the worker node to the cluster
curl -sfL https://get.k3s.io | K3S_NODE_NAME=$WORKER_NAME K3S_URL=https://$MASTER_IP:6443 K3S_TOKEN=$TOKEN sh -