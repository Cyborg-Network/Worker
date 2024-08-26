# Use a suitable Node.js base image
FROM node:18-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json (if you have one)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of your application code
COPY . .

# Expose the port your app listens on (3000 in your case)
EXPOSE 3000

# Set environment variables (adjust as needed)
# You might need to set PUBLIC_IP and DOMAIN_NAME here if they're essential
ENV WORKER_ADDRESS=5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY 
ENV NODE_RPC=wss://fraa-flashbox-3239-rpc.a.stagenet.tanssi.network

# Command to run your app
CMD ["node", "KubeServiceUpdated.js"]