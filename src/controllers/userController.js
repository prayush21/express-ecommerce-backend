const dynamo = require("../config/dynamodb");
const {
  ScanCommand,
  GetCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
} = require("@aws-sdk/lib-dynamodb");
const { v4: uuidv4 } = require("uuid");
const {
  SNSClient,
  CreateTopicCommand,
  SubscribeCommand,
  ListTopicsCommand,
} = require("@aws-sdk/client-sns");
const { SQSClient, SendMessageCommand } = require("@aws-sdk/client-sqs");

const TABLE_NAME = "UsersTable";
const snsClient = new SNSClient({});
const sqsClient = new SQSClient({});

const userController = {
  getAllUsers: async (req, res) => {
    try {
      const result = await dynamo.send(
        new ScanCommand({ TableName: TABLE_NAME })
      );
      res.json({
        status: "success",
        message: "All Users",
        data: result.Items,
      });
    } catch (error) {
      res.status(400).json({
        status: "error",
        message: error.message,
      });
    }
  },

  getUser: async (req, res) => {
    try {
      const result = await dynamo.send(
        new GetCommand({
          TableName: TABLE_NAME,
          Key: { id: req.params.id },
        })
      );
      if ("Item" in result) {
        res.json({
          status: "success",
          message: `Data for ${req.params.id}`,
          data: result.Item,
        });
      } else {
        res.json({
          status: "success",
          message: `No Data for ${req.params.id}`,
        });
      }
    } catch (error) {
      res.status(400).json({
        status: "error",
        message: error.message,
      });
    }
  },

  createUser: async (req, res) => {
    try {
      const user = {
        id: uuidv4(),
        createdAt: new Date().toISOString(),
        ...req.body,
      };

      if (!user.password) {
        throw new Error("Password is required");
      }

      await dynamo.send(
        new PutCommand({
          TableName: TABLE_NAME,
          Item: user,
        })
      );

      // Handle notification for signup
      await handleNotification("Signup", user.email, user.firstName);

      res.status(201).json({
        status: "success",
        message: "New User Created",
        data: user,
      });
    } catch (error) {
      res.status(400).json({
        status: "error",
        message: error.message,
      });
    }
  },

  updateUser: async (req, res) => {
    try {
      const updateBody = req.body;
      let updateExpression = "set";
      let ExpressionAttributeNames = {};
      let ExpressionAttributeValues = {};

      for (let [key, value] of Object.entries(updateBody)) {
        updateExpression += ` #${key} = :${key},`;
        ExpressionAttributeNames[`#${key}`] = key;
        ExpressionAttributeValues[`:${key}`] = value;
      }

      updateExpression = updateExpression.slice(0, -1);

      await dynamo.send(
        new UpdateCommand({
          TableName: TABLE_NAME,
          Key: { id: req.params.id },
          UpdateExpression: updateExpression,
          ExpressionAttributeNames,
          ExpressionAttributeValues,
          ReturnValues: "ALL_NEW",
        })
      );

      res.json({
        status: "success",
        message: `Updated User ${req.params.id}`,
        data: updateBody,
      });
    } catch (error) {
      res.status(400).json({
        status: "error",
        message: error.message,
      });
    }
  },

  deleteUser: async (req, res) => {
    try {
      await dynamo.send(
        new DeleteCommand({
          TableName: TABLE_NAME,
          Key: { id: req.params.id },
        })
      );
      res.status(204).json({
        status: "success",
        message: `Deleted item ${req.params.id}`,
      });
    } catch (error) {
      res.status(400).json({
        status: "error",
        message: error.message,
      });
    }
  },

  login: async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        throw new Error("Email and Password are required");
      }

      const result = await dynamo.send(
        new QueryCommand({
          TableName: TABLE_NAME,
          IndexName: "email-index",
          KeyConditionExpression: "email = :email",
          ExpressionAttributeValues: {
            ":email": email,
          },
        })
      );
      console.log("result", result);
      if (result.Items.length === 0) {
        throw new Error("Invalid email or password");
      }

      const user = result.Items[0];

      if (password !== user.password) {
        throw new Error("Invalid email or password");
      }

      // Handle notification for login
      await handleNotification("Login", user.email, user.firstName);

      res.json({
        status: "success",
        message: "User logged in",
        data: {
          id: user.id,
          email: user.email,
          address: user.address,
          firstName: user.firstName,
          type: user.type || "customer",
        },
      });
    } catch (error) {
      res.status(400).json({
        status: "error",
        message: error.message,
      });
    }
  },
};

// TODO: Move these notification-related functions to a separate service file
const handleNotification = async (
  NotificationType,
  CustomerEmail,
  CustomerFirstName
) => {
  // Copy the handleNotification function from index.mjs
  // Reference lines 221-255
};

const createSnsTopic = async (topicName) => {
  // Copy the createSnsTopic function from index.mjs
  // Reference lines 257-270
};

const subscribeEmailToSnsTopic = async (topicArn, email) => {
  // Copy the subscribeEmailToSnsTopic function from index.mjs
  // Reference lines 272-281
};

const getTopicArn = async (topicName) => {
  // Copy the getTopicArn function from index.mjs
  // Reference lines 283-293
};

const sendToSqsQueue = async (
  CustomerFirstName,
  CustomerEmail,
  NotificationType,
  topicArn
) => {
  // Copy the sendToSqsQueue function from index.mjs
  // Reference lines 295-326
};

module.exports = userController;
