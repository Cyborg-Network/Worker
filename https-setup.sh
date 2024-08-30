#!/bin/bash
#exit the script if any errors occurred
set -e

#error message when script exits
trap 'echo "An error occurred. Please check the logs for further information. Exiting..."; exit 1' ERR

#check if a domain name was provided
if [ $# -ne 3 ]; then
    echo "Please provide: 1. The domain name, 2. The email address for the ssl certificate, 3. The port to route the https traffic to as parameters."
    echo "Usage: $0 <domain> <email> <port>"
    exit 1
fi

DOMAIN=$1
EMAIL=$2
PORT=$3

read -p "Is this the correct input? Domain: $DOMAIN Email: $EMAIL Port: $PORT (y/n): " confirm
if [[ $confirm != [yY] && $confirm != [yY][eE][sS] ]]; then
    echo "Aborting setup."
    exit 1
fi
echo "Confirmed."

sudo apt update

sudo apt install -y nginx

sudo apt install -y certbot python3-certbot-nginx

#obtain SSL certificate
sudo certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email $EMAIL

#create Nginx configuration file
sudo tee /etc/nginx/sites-available/$DOMAIN > /dev/null <<EOF
server {
    listen 80;
    server_name $DOMAIN;
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl;
    server_name $DOMAIN www.$DOMAIN;

    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;

    location / {
        proxy_pass http://localhost:$PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

#check if default nginx config exists
if [ -e /etc/nginx/sites-available/default ]; then
    sudo rm /etc/nginx/sites-enabled/default
fi

if [ -e /etc/nginx/sites-available/default ]; then
    sudo rm /etc/nginx/sites-available/default
fi

#enable the site
sudo ln -s /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/

#test Nginx configuration
sudo nginx -t

#reload Nginx to apply changes
sudo systemctl reload nginx

echo "Setup complete. Nginx is now configured to serve $DOMAIN over HTTPS and route traffic to port $PORT."
