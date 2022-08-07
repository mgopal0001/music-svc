class Response {
  static processing = ({ message, data }) => {
    return {
      success: true,
      message: message || "PROCESSING",
      statusCode: 102,
      data,
      err: null,
    };
  };

  static ok = ({ message, data }) => {
    return {
      success: true,
      message: message || "SUCCESS",
      statusCode: 200,
      data,
      err: null,
    };
  };

  static created = ({ message, data }) => {
    return {
      success: true,
      message: message || "CREATED",
      statusCode: 201,
      data,
      err: null,
    };
  };

  static partial = ({ message, data }) => {
    return {
      success: true,
      message: message || "PARTIAL",
      statusCode: 206,
      data,
      err: null,
    };
  };

  static notFound = ({ message, data, err }) => {
    return {
      success: false,
      message: message || "NOT_FOUND",
      statusCode: 404,
      data,
      err,
    };
  };

  static forbidden = ({ message, data, err }) => {
    return {
      success: false,
      message: message || "FORBIDDEN",
      statusCode: 403,
      data,
      err,
    };
  };

  static unauthorized = ({ message, data, err }) => {
    return {
      success: false,
      message: message || "UNAUTHORIZED",
      statusCode: 401,
      data,
      err,
    };
  };

  static gone = ({ message, data, err }) => {
    return {
      success: false,
      message: message || "GONE",
      statusCode: 410,
      data,
      err,
    };
  };

  static internalServerError = ({ message, data, err }) => {
    return {
      success: false,
      message: message || "INTERNAL_SERVER_ERROR",
      statusCode: 500,
      data,
      err,
    };
  };
}

module.exports = Response;
