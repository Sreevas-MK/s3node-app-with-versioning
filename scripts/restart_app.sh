#!/bin/bash
SERVICE_NAME="s3-nodejs-app"

echo "Restarting service..."

systemctl daemon-reload
systemctl restart $SERVICE_NAME || systemctl start $SERVICE_NAME
systemctl enable $SERVICE_NAME
