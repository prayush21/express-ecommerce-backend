const dynamo = require("../config/dynamodb");
const {
  ScanCommand,
  GetCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
} = require("@aws-sdk/lib-dynamodb");
const { v4: uuidv4 } = require("uuid");

const TABLE_NAME = "OrdersTable";

const orderController = {
  getAllOrders: async (req, res) => {
    try {
      let filterExpression = null;
      let expressionAttributeValues = {};

      if (req.query.orderStatus) {
        filterExpression = "#orderStatus = :orderStatus";
        expressionAttributeValues = { ":orderStatus": req.query.orderStatus };
      }

      const result = await dynamo.send(
        new ScanCommand({
          TableName: TABLE_NAME,
          FilterExpression: filterExpression,
          ExpressionAttributeNames: filterExpression
            ? { "#orderStatus": "orderStatus" }
            : undefined,
          ExpressionAttributeValues: filterExpression
            ? expressionAttributeValues
            : undefined,
        })
      );

      res.json({
        status: "success",
        message: "All Orders",
        data: result.Items,
      });
    } catch (error) {
      res.status(400).json({
        status: "error",
        message: error.message,
      });
    }
  },

  getOrder: async (req, res) => {
    try {
      const result = await dynamo.send(
        new GetCommand({
          TableName: TABLE_NAME,
          Key: { id: req.params.id },
        })
      );

      if (!result.Item) {
        return res.status(404).json({
          status: "error",
          message: `Order with id ${req.params.id} not found`,
        });
      }

      res.json({
        status: "success",
        message: `Data for ${req.params.id}`,
        data: result.Item,
      });
    } catch (error) {
      res.status(400).json({
        status: "error",
        message: error.message,
      });
    }
  },

  createOrder: async (req, res) => {
    try {
      const order = {
        id: uuidv4(),
        orderStatus: "pending",
        createdAt: new Date().toISOString(),
        ...req.body,
      };

      await dynamo.send(
        new PutCommand({
          TableName: TABLE_NAME,
          Item: order,
        })
      );

      res.status(201).json({
        status: "success",
        message: "Created new order",
        data: order,
      });
    } catch (error) {
      res.status(400).json({
        status: "error",
        message: error.message,
      });
    }
  },

  updateOrder: async (req, res) => {
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
        message: `Updated order ${req.params.id}`,
        data: updateBody,
      });
    } catch (error) {
      res.status(400).json({
        status: "error",
        message: error.message,
      });
    }
  },

  deleteOrder: async (req, res) => {
    try {
      await dynamo.send(
        new DeleteCommand({
          TableName: TABLE_NAME,
          Key: { id: req.params.id },
        })
      );

      res.status(204).json({
        status: "success",
        message: `Deleted order ${req.params.id}`,
      });
    } catch (error) {
      res.status(400).json({
        status: "error",
        message: error.message,
      });
    }
  },
};

module.exports = orderController;
