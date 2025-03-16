require('dotenv').config();
const express = require('express');
const AWS = require('aws-sdk');
const multer = require('multer');
const path = require('path');

// Ensure environment variables are loaded
if (!process.env.S3_BUCKET_NAME || !process.env.AWS_REGION) {
  console.error("Missing required environment variables.");
  process.exit(1);
}

// Configure AWS SDK
AWS.config.update({ region: process.env.AWS_REGION });
const s3 = new AWS.S3();

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

// Serve static files
app.use(express.static('public'));

// Set up views
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Home route
app.get('/', (req, res) => {
  res.render('index');
});

// Upload route
app.get('/upload', (req, res) => {
  res.render('upload');
});

app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).send('No file uploaded.');

    const params = {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: req.file.originalname,
      Body: req.file.buffer,
    };

    await s3.upload(params).promise();
    console.log(`Uploaded: ${req.file.originalname}`);
    res.redirect('/list');
  } catch (error) {
    console.error("Upload Error:", error);
    res.status(500).send('Error uploading file.');
  }
});

// List files & versions
app.get('/list', async (req, res) => {
  try {
    const params = { Bucket: process.env.S3_BUCKET_NAME };
    const data = await s3.listObjectsV2(params).promise();

    const files = await Promise.all(data.Contents.map(async (file) => {
      const versions = await s3.listObjectVersions({ 
        Bucket: process.env.S3_BUCKET_NAME, Prefix: file.Key 
      }).promise();

      return { 
        fileName: file.Key, 
        versions: versions.Versions || [] 
      };
    }));

    res.render('list', { files });
  } catch (error) {
    console.error("List Error:", error);
    res.status(500).send('Error listing files.');
  }
});

// Download route (supports specific versions)
app.get('/download', async (req, res) => {
  try {
    const { key, version } = req.query;

    if (!key) return res.status(400).send('Missing file key.');

    const params = {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: key,
      VersionId: version || undefined, // If version is provided, use it
      Expires: 3600, // URL expires in 1 hour
    };

    const url = await s3.getSignedUrlPromise('getObject', params);
    console.log(`Download URL: ${url}`);
    res.redirect(url);
  } catch (error) {
    console.error("Download Error:", error);
    res.status(500).send('Error generating download link.');
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

