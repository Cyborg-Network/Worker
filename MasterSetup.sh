#!/bin/sh
curl -sfL https://get.k3s.io | sh -s - --disable traefik --write-kubeconfig-mode 644 --node-name k3s-master-01
SCRIPT_DIR=$(dirname "$0")
cat /var/lib/rancher/k3s/server/node-token > "${SCRIPT_DIR}/k3s-node-token.txt"
echo "The k3s node token has been saved to ${SCRIPT_DIR}/k3s-node-token.txt. Use this token to connect worker nodes to the cluster."
node KubeServiceNodePort.js