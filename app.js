const express = require('express');
const {
  S3Client,
  ListObjectsV2Command,
  ListObjectVersionsCommand,
  PutObjectCommand,
  GetObjectCommand
} = require('@aws-sdk/client-s3');

const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const multer = require('multer');
const path = require('path');
const os = require('os');

if (!process.env.S3_BUCKET_NAME || !process.env.AWS_REGION) {
  console.error("Missing required environment variables.");
  process.exit(1);
}

/* -----------------------------
   AWS CLIENT CONFIGURATION
--------------------------------*/

// Use explicit credentials ONLY if provided
let s3Client;

if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {

  console.log("Using AWS credentials from environment variables");

  s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
  });

} else {

  console.log("Using IAM Role / Default Credential Provider");

  s3Client = new S3Client({
    region: process.env.AWS_REGION
  });

}

/* -----------------------------
   EXPRESS SETUP
--------------------------------*/

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(express.static('public'));

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

const hostname = os.hostname();

/* -----------------------------
   HEALTH CHECK
--------------------------------*/

app.get('/health', (req, res) => {
  console.log("Health check requested");
  res.status(200).send('OK');
});

/* -----------------------------
   HOME
--------------------------------*/

app.get('/', (req, res) => {
  res.render('index', { hostname });
});

/* -----------------------------
   UPLOAD PAGE
--------------------------------*/

app.get('/upload', (req, res) => {
  res.render('upload', { hostname });
});

/* -----------------------------
   FILE UPLOAD
--------------------------------*/

app.post('/upload', upload.single('file'), async (req, res) => {

  try {

    if (!req.file) {
      return res.status(400).send('No file uploaded.');
    }

    const command = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: req.file.originalname,
      Body: req.file.buffer
    });

    await s3Client.send(command);

    console.log(`Uploaded: ${req.file.originalname}`);

    res.redirect('/list');

  } catch (error) {

    console.error("Upload Error:", error);
    res.status(500).send('Error uploading file.');

  }

});

/* -----------------------------
   LIST FILES + VERSIONS
--------------------------------*/

app.get('/list', async (req, res) => {

  try {

    const listCommand = new ListObjectsV2Command({
      Bucket: process.env.S3_BUCKET_NAME
    });

    const data = await s3Client.send(listCommand);

    if (!data.Contents) {
      return res.render('list', { files: [], hostname });
    }

    const files = await Promise.all(

      data.Contents.map(async (file) => {

        const versionsCommand = new ListObjectVersionsCommand({
          Bucket: process.env.S3_BUCKET_NAME,
          Prefix: file.Key
        });

        const versions = await s3Client.send(versionsCommand);

        return {
          fileName: file.Key,
          versions: versions.Versions || []
        };

      })

    );

    res.render('list', { files, hostname });

  } catch (error) {

    console.error("List Error:", error);
    res.status(500).send('Error listing files.');

  }

});

/* -----------------------------
   DOWNLOAD FILE (SIGNED URL)
--------------------------------*/

app.get('/download', async (req, res) => {

  try {

    const { key, version } = req.query;

    if (!key) {
      return res.status(400).send('Missing file key.');
    }

    const command = new GetObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: key,
      ...(version && { VersionId: version })
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

    console.log(`Download URL generated for: ${key}`);

    res.redirect(url);

  } catch (error) {

    console.error("Download Error:", error);
    res.status(500).send('Error generating download link.');

  }

});

/* -----------------------------
   SERVER START
--------------------------------*/

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
