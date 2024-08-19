#!/bin/sh

# Define the environment variable names
IP_ENV_VAR="PUBLIC_IP"
DOMAIN_ENV_VAR="DOMAIN_NAME"

# Path to your .env file
ENV_FILE=".env"

# Function to check if a variable is already in the .env file
check_env_var_exists() {
  grep -q "^$1=" "$ENV_FILE"
}

# Function to add a new variable to the .env file
add_env_var() {
  # Ensure that the variable is added on a new line
  if [ -s "$ENV_FILE" ]; then
    # Add a new line before the variable if the .env file is not empty
    echo "\n$1=$2" >> "$ENV_FILE"
  else
    echo "$1=$2" >> "$ENV_FILE"
  fi
  echo "Added $1 to $ENV_FILE"
}

# Fetch the public IP
PUBLIC_IP=$(curl -s ifconfig.me)

# Only proceed if a PUBLIC_IP is found
if [ -n "$PUBLIC_IP" ]; then
  # Check if the PUBLIC_IP variable is already set in .env
  if ! check_env_var_exists "$IP_ENV_VAR"; then
    # Add PUBLIC_IP to .env if it doesn't exist
    add_env_var "$IP_ENV_VAR" "$PUBLIC_IP"
  else
    echo "$IP_ENV_VAR already exists in $ENV_FILE"
  fi

  # Fetch the domain name using nslookup
  DOMAIN_NAME=$(nslookup "$PUBLIC_IP" | grep 'name =' | awk '{print $4}' | sed 's/\.$//')

  # Only add DOMAIN_NAME if it is found and non-empty
  if [ -n "$DOMAIN_NAME" ]; then
    # Check if the DOMAIN_NAME variable is already set in .env
    if ! check_env_var_exists "$DOMAIN_ENV_VAR"; then
      add_env_var "$DOMAIN_ENV_VAR" "$DOMAIN_NAME"
    else
      echo "$DOMAIN_ENV_VAR already exists in $ENV_FILE"
    fi
  else
    echo "No domain name found for $PUBLIC_IP"
  fi
else
  echo "Failed to retrieve PUBLIC_IP"
fi

# Setup k3s master
curl -sfL https://get.k3s.io | sh -s - --disable traefik --write-kubeconfig-mode 644 --node-name k3s-master-01
SCRIPT_DIR=$(dirname "$0")
cat /var/lib/rancher/k3s/server/node-token > "${SCRIPT_DIR}/k3s-node-token.txt"
echo "The k3s node token has been saved to ${SCRIPT_DIR}/k3s-node-token.txt. Use this token to connect worker nodes to the cluster."
node KubeServiceUpdated.js