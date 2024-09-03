#!/bin/sh

# Define the environment variable names
IP_ENV_VAR="IP_ADDRESS"
DOMAIN_ENV_VAR="DOMAIN_NAME"

# Path to your .env file
ENV_FILE=".env"

# Function to fetch the public IP
fetch_public_ip() {
  curl -s ifconfig.me
}

# Function to fetch the private IP
fetch_private_ip() {
  hostname -I | awk '{print $1}'
}

# Fetch the IP based on the provided type
IP_TYPE="$1"

if [ "$IP_TYPE" = "public" ]; then
  IP_ADDRESS=$(fetch_public_ip)
elif [ "$IP_TYPE" = "private" ]; then
  IP_ADDRESS=$(fetch_private_ip)
else
  echo "Invalid IP type specified. Use 'public' or 'private'."
  exit 1
fi

# Only proceed if an IP address is found
if [ -n "$IP_ADDRESS" ]; then
  # Update IP_ADDRESS in .env file
  if grep -q "^$IP_ENV_VAR=" "$ENV_FILE"; then
    sed -i -e "s/^$IP_ENV_VAR=.*/$IP_ENV_VAR=$IP_ADDRESS/" "$ENV_FILE"
    echo "Updated $IP_ENV_VAR in $ENV_FILE"
  else
    echo "$IP_ENV_VAR=$IP_ADDRESS" >> "$ENV_FILE"
    echo "Added $IP_ENV_VAR to $ENV_FILE"
  fi

  # Fetch the domain name using nslookup
  DOMAIN_NAME=$(nslookup "$IP_ADDRESS" | grep 'name =' | awk '{print $4}' | sed 's/\.$//')

  # Only update DOMAIN_NAME if it is found and non-empty
  if [ -n "$DOMAIN_NAME" ]; then
    # Update DOMAIN_NAME in .env file
    if grep -q "^$DOMAIN_ENV_VAR=" "$ENV_FILE"; then
      sed -i -e "s/^$DOMAIN_ENV_VAR=.*/$DOMAIN_ENV_VAR=$DOMAIN_NAME/" "$ENV_FILE"
      echo "Updated $DOMAIN_ENV_VAR in $ENV_FILE"
    else
      echo "$DOMAIN_ENV_VAR=$DOMAIN_NAME" >> "$ENV_FILE"
      echo "Added $DOMAIN_ENV_VAR to $ENV_FILE"
    fi
  else
    echo "No domain name found for $IP_ADDRESS"
  fi
else
  echo "Failed to retrieve IP_ADDRESS"
fi