const dynamo = require("../config/dynamodb");
const {
  ScanCommand,
  GetCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
} = require("@aws-sdk/lib-dynamodb");
const { v4: uuidv4 } = require("uuid");

const TABLE_NAME = "ProductsTable";

// The logic here is similar to the reference code:
// For Products CRUD:
// Reference file: products_crud_api_gateway/index.mjs
// Lines 78-136

const productController = {
  getAllProducts: async (req, res) => {
    console.log("How are you dear?");

    try {
      const result = await dynamo.send(
        new ScanCommand({ TableName: TABLE_NAME })
      );
      res.json({
        status: "success",
        data: result.Items,
      });
    } catch (error) {
      res.status(500).json({
        status: "error",
        message: error.message,
      });
    }
  },

  getProduct: async (req, res) => {
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
          message: "Product not found",
        });
      }

      res.json({
        status: "success",
        data: result.Item,
      });
    } catch (error) {
      res.status(500).json({
        status: "error",
        message: error.message,
      });
    }
  },

  createProduct: async (req, res) => {
    try {
      const item = {
        id: uuidv4(),
        createdAt: new Date().toISOString(),
        ...req.body,
      };

      await dynamo.send(
        new PutCommand({
          TableName: TABLE_NAME,
          Item: item,
        })
      );

      res.status(201).json({
        status: "success",
        data: item,
      });
    } catch (error) {
      res.status(500).json({
        status: "error",
        message: error.message,
      });
    }
  },

  // Add updateProduct and deleteProduct methods following similar pattern
  updateProduct: async (req, res) => {
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

      updateExpression = updateExpression.slice(0, -1); // Remove trailing comma

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
        message: `Updated item ${req.params.id}`,
        data: updateBody,
      });
    } catch (error) {
      res.status(400).json({
        status: "error",
        message: error.message || "Bad Request",
      });
    }
  },

  deleteProduct: async (req, res) => {
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
        data: {},
      });
    } catch (error) {
      res.status(400).json({
        status: "error",
        message: error.message || "Bad Request",
      });
    }
  },
};

module.exports = productController;
