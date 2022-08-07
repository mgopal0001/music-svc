const AWS = require("aws-sdk");
const config = require("../config");

const SES_CONFIG = {
  accessKeyId: config.aws.accessKeyId,
  secretAccessKey: config.aws.secretAccessKey,
  region: "ap-south-1",
};

const ses = new AWS.SES(SES_CONFIG);

class SES {
  static sendEmail = ({ to, from, body, subject }) => {
    let params = {
      Source: from,
      Destination: {
        ToAddresses: [to],
      },
      ReplyToAddresses: [],
      Message: {
        Body: {
          Html: {
            Charset: "UTF-8",
            Data: body,
          },
        },
        Subject: {
          Charset: "UTF-8",
          Data: subject,
        },
      },
    };

    return ses.sendEmail(params).promise();
  };
}

module.exports = SES;
