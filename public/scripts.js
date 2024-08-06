document.getElementById("uploadForm").addEventListener("submit", function (e) {
  e.preventDefault();

  const fileInput = document.getElementById("fileInput");
  const file = fileInput.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append("file", file);

  const xhr = new XMLHttpRequest();
  xhr.open("POST", "/upload", true);

  xhr.upload.onprogress = function (event) {
    if (event.lengthComputable) {
      const percentComplete = (event.loaded / event.total) * 100;
      const progressBar = document.getElementById("progressBar");
      const progressPercent = document.getElementById("progressPercent");

      progressBar.value = percentComplete;
      progressPercent.textContent = `${Math.round(percentComplete)}%`;
    }
  };

  xhr.onloadstart = function () {
    const uploadProgress = document.getElementById("uploadProgress");
    uploadProgress.style.display = "block";
  };

  xhr.onloadend = function () {
    const uploadProgress = document.getElementById("uploadProgress");
    uploadProgress.style.display = "none";
  };

  xhr.onload = function () {
    if (xhr.status === 200) {
      const data = JSON.parse(xhr.responseText);
      const uploadResult = document.getElementById("uploadResult");
      uploadResult.innerHTML = `
        <p>File uploaded successfully:</p>
        <p>File URL: <a href="${data.fileUrl}" target="_blank">${data.fileUrl}</a></p>
        <p>S3 Endpoint URL: <a href="${data.s3EndpointUrl}" target="_blank">${data.s3EndpointUrl}</a></p>
      `;
    } else {
      alert("File upload failed");
    }
  };

  xhr.send(formData);
});
