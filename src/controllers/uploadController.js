const AWS = require("aws-sdk");
const formidable = require("formidable");
const fs = require("fs");

const s3 = new AWS.S3();
const bucketName = process.env.BUCKET_NAME; // Ensure this is set in your environment variables

const uploadFile = async (req, res) => {
  const form = new formidable.IncomingForm();

  form.parse(req, async (err, fields, files) => {
    if (err) {
      return res
        .status(400)
        .json({ status: "error", message: "Error parsing the files" });
    }
    console.log("files", files.file);

    const file = files.file; // Assuming the input field name is 'file'
    const fileContent = fs.readFileSync(file.filepath);
    // const params = {
    //   Bucket: bucketName,
    //   Key: file.name,
    //   Body: fileContent,
    //   ContentType: file.type,
    // };

    // try {
    //   await s3.upload(params).promise();
    //   const fileUrl = `https://${bucketName}.s3.amazonaws.com/${file.name}`;
    //   return res.status(200).json({
    //     status: "success",
    //     message: `File ${file.name} uploaded successfully`,
    //     url: fileUrl,
    //   });
    // } catch (uploadError) {
    //   console.error("Error uploading file:", uploadError);
    //   return res
    //     .status(500)
    //     .json({ status: "error", message: "Error uploading file" });
    // }
  });
};

module.exports = {
  uploadFile,
};
