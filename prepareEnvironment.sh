#!/bin/bash

# Function to install nvm and Node.js
install_nvm_and_node() {
    echo "Installing nvm and Node.js..."
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

    # Load nvm into the current shell session
    export NVM_DIR="$([ -z "${XDG_CONFIG_HOME-}" ] && printf %s "${HOME}/.nvm" || printf %s "${XDG_CONFIG_HOME}/nvm")"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

    # Install Node.js version 16.14
    nvm install 16.14
    nvm use 16.14
}

# Update package list and install git if not already installed
sudo apt-get update
sudo apt-get install -y git

# Check if npm is installed
if ! command -v npm &> /dev/null
then
    echo "npm not found. Installing nvm and Node.js..."
    install_nvm_and_node
else
    echo "npm is already installed."
fi

# Clone the GitHub repository
# Replace the following URL with the repository you want to clone
REPO_URL="https://github.com/Cyborg-Network/Worker.git"
TARGET_DIR="/home/azureuser/Worker"

# Check if the target directory already exists
if [ -d "$TARGET_DIR" ]; then
    echo "Directory $TARGET_DIR already exists."

    # Change to the repository directory
    cd $TARGET_DIR

    # Run npm install
    npm install
    if [ $? -eq 0 ]; then
        echo "npm install completed successfully."
        # sudo sh MasterSetup.sh
    else
        echo "npm install failed."
    fi

else
    # Clone the repository
    git clone $REPO_URL $TARGET_DIR
    if [ $? -eq 0 ]; then
        echo "Repository cloned successfully."

        # Change to the repository directory
        cd $TARGET_DIR

        # Run npm install
        npm install
        if [ $? -eq 0 ]; then
            echo "npm install completed successfully."
            # sudo sh MasterSetup.sh
        else
            echo "npm install failed."
        fi
    else
        echo "Failed to clone the repository."
    fi
fi