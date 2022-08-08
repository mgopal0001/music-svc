const AWS = require("aws-sdk");
const config = require("../config");

const s3 = new AWS.S3({
  accessKeyId: config.aws.accessKeyId,
  secretAccessKey: config.aws.secretAccessKey,
  region: "ap-south-1",
});

class S3 {
  static async getFile(key, bucketName) {
    return new Promise((resolve, reject) => {
      const params = {
        Bucket: bucketName,
        Key: key,
      };

      s3.getObject(params, function (err, data) {
        if (err) {
          reject(err);
        }

        return resolve(data?.body?.toString("utf-8"));
      });
    });
  }

  static async putFile(key, buffer, bucketName) {
    return new Promise((resolve, reject) => {
      const params = {
        Bucket: bucketName,
        Key: key,
        Body: buffer,
      };

      s3.upload(params, function (err, data) {
        if (err) {
          return reject(err);
        }

        return resolve(data);
      });
    });
  }
}

module.exports = S3;
