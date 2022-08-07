const otpGenerator = require("otp-generator");
const { SES } = require("../libs");

class OTP {
  static sendOtp = async ({ otp, to, from }) => {
    const template = OTP.emailTemplate(otp);
    await SES.sendEmail({
      to,
      from,
      body: template.body,
      subject: template.subject,
    });
  };

  static emailTemplate = (otp) => {
    return {
      subject: "MUSICCY: Login OTP",
      body:
        `<h1>Dear User,</h1>` +
        "<h4>OTP for Login is :</h4>" +
        `<h1><strong>${otp}</strong></h1>` +
        "<h4>This is a auto-generated email. Please do not reply to this email.</h4>" +
        "<h4>Regards</h4>" +
        "<h4>Madan Gopal</h4>",
    };
  };

  static getOtp = () => {
    return otpGenerator.generate(6, {
      upperCaseAlphabets: false,
      lowerCaseAlphabets: false,
      specialChars: false,
      digits: true,
    });
  };
}

module.exports = OTP;
