#!/bin/bash
APP_DIR="/var/s3-nodejs-app"
APP_USER="ec2-user"

echo "Installing dependencies..."
cd $APP_DIR
sudo -u $APP_USER npm install
