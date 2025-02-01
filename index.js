const express = require("express");
const multer = require("multer");
const Minio = require("minio");
require("dotenv").config();
const path = require("path");
const { v4: uuidv4 } = require("uuid"); // Import uuid

const app = express();

// Set EJS as the templating engine
app.set("view engine", "ejs");

const storage = multer.memoryStorage(); // Use memory storage

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

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.post("/upload", upload.single("file"), (req, res) => {
  const file = req.file;
  if (!file) {
    return res.status(400).send("No file uploaded.");
  }

  // if file not image return error
  // const fileExtension = file.originalname.split(".").pop().toLowerCase();
  // if (!["jpg", "jpeg", "png", "gif"].includes(fileExtension)) {
  //   return res.status(400).send("Only image files are allowed.");
  // }

  const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`; // Generate unique filename
  const metaData = {
    "Content-Type": file.mimetype,
  };
  console.log(`File uploaded: ${file.originalname}`);

  minioClient.putObject(
    bucketName,
    uniqueName, // Use the unique filename
    file.buffer,
    metaData,
    (err, etag) => {
      if (err) {
        return res.status(500).send(err);
      }

      const fileUrl = `${req.protocol}://${req.get(
        "host"
      )}/files/${uniqueName}`;
      const s3EndpointUrl = `http://${process.env.MINIO_ENDPOINT}/${bucketName}/${uniqueName}`;
      res.json({ fileUrl, s3EndpointUrl });
    }
  );
});

app.get("/files/:filename", (req, res) => {
  const filename = req.params.filename;
  const fileExtension = filename.split(".").pop().toLowerCase();

  minioClient.presignedGetObject(bucketName, filename, (err, presignedUrl) => {
    if (err) {
      return res.status(500).send(err);
    }

    const fileUrl = `${req.protocol}://${req.get("host")}/files/${filename}`;
    const s3EndpointUrl = `http://${process.env.MINIO_ENDPOINT}/${bucketName}/${filename}`;

    res.render("preview", {
      fileUrl,
      s3EndpointUrl,
      fileExtension,
      presignedUrl,
    });
  });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
