#!/bin/bash
APP_DIR="/var/s3-nodejs-app"
SERVICE_FILE="/etc/systemd/system/s3-nodejs-app.service"
ENV_FILE="/etc/app.env"

# Load variables from the file Terraform created
if [ -f "$ENV_FILE" ]; then
    source "$ENV_FILE"
else
    echo "Error: $ENV_FILE not found. Infrastructure setup may be incomplete."
    exit 1
fi

# 1. Create the service file if it doesn't exist
cat > $SERVICE_FILE <<EOF
[Unit]
Description=Node.js S3 App
After=network.target

[Service]
User=ec2-user
Group=ec2-user
WorkingDirectory=$APP_DIR
ExecStart=/usr/bin/node $APP_DIR/app.js
Restart=always

Environment=NODE_ENV=production
Environment=AWS_REGION=$AWS_REGION
Environment=S3_BUCKET_NAME=$S3_BUCKET_NAME

StandardOutput=append:/var/log/s3-nodejs-app.log
StandardError=append:/var/log/s3-nodejs-app.log

[Install]
WantedBy=multi-user.target
EOF

# 2. Reload and Restart
systemctl daemon-reload
systemctl enable s3-nodejs-app
systemctl restart s3-nodejs-app
