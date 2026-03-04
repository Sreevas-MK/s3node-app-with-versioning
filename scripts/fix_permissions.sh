#!/bin/bash

APP_DIR="/var/s3-nodejs-app"

echo "Setting ownership to ec2-user..."
chown -R ec2-user:ec2-user $APP_DIR

echo "Installing npm dependencies..."
cd $APP_DIR
# Run as ec2-user to avoid permission issues with node_modules
sudo -u ec2-user npm install
