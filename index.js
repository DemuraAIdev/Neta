const express = require("express");
const multer = require("multer");
const Minio = require("minio");
require("dotenv").config();
const path = require("path");

const app = express();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});

const upload = multer({ storage });

const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT,
  port: parseInt(process.env.MINIO_PORT, 10),
  useSSL: false,
  accessKey: process.env.MINIO_ACCESS_KEY,
  secretKey: process.env.MINIO_SECRET_KEY,
});

const bucketName = process.env.MINIO_BUCKET_NAME;

minioClient.bucketExists(bucketName, (err) => {
  if (err && err.code === "NoSuchBucket") {
    minioClient.makeBucket(bucketName, "", (err) => {
      if (err) {
        return console.log("Error creating bucket.", err);
      }
      console.log("Bucket created successfully.");
    });
  } else if (err) {
    console.log("Error checking bucket.", err);
  } else {
    console.log("Bucket exists.");
  }
});

app.use(express.static(path.join(__dirname, "public")));

app.post("/upload", upload.single("file"), (req, res) => {
  const file = req.file;
  if (!file) {
    return res.status(400).send("No file uploaded.");
  }

  const metaData = {
    "Content-Type": file.mimetype,
  };

  minioClient.fPutObject(
    bucketName,
    file.originalname,
    file.path,
    metaData,
    (err, etag) => {
      if (err) {
        return res.status(500).send(err);
      }

      const fileUrl = `${req.protocol}://${req.get("host")}/files/${
        file.originalname
      }`;
      const s3EndpointUrl = `http://${process.env.MINIO_ENDPOINT}/${bucketName}/${file.originalname}`;
      res.json({ fileUrl, s3EndpointUrl });
    }
  );
});

app.get("/files/:filename", (req, res) => {
  const filename = req.params.filename;

  minioClient.presignedGetObject(bucketName, filename, (err, presignedUrl) => {
    if (err) {
      return res.status(500).send(err);
    }
    res.redirect(presignedUrl);
  });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
