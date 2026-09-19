import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import {
  authenticate,
  authorize,
  AuthRequest,
} from "../middleware/auth";

const router = Router();

const rfqSchema = z
  .object({
    productName: z.string().min(2, "Product name is required"),
    description: z.string().min(5, "Description is required"),
    quantity: z.number().int().positive("Quantity must be greater than 0"),
    deliveryLocation: z.string().min(2, "Delivery location is required"),
    deadline: z.string().datetime("Invalid deadline"),
  })
  .refine(
    (data) => {
      return new Date(data.deadline) > new Date();
    },
    {
      path: ["deadline"],
      message: "Deadline must be in the future",
    }
  );

/* =========================
   CREATE RFQ
   BUYER
========================= */

router.post(
  "/",
  authenticate,
  authorize("BUYER"),
  async (req: AuthRequest, res) => {
    try {
      const result = rfqSchema.safeParse(req.body);

      if (!result.success) {
        return res.status(400).json({
          message: "Invalid RFQ data",
          errors: result.error.flatten(),
        });
      }

      if (!req.user) {
        return res.status(401).json({
          message: "Authentication required",
        });
      }

      const {
        productName,
        description,
        quantity,
        deliveryLocation,
        deadline,
      } = result.data;

      const rfq = await prisma.rFQ.create({
        data: {
          productName,
          description,
          quantity,
          deliveryLocation,
          deadline: new Date(deadline),
          buyerId: req.user.userId,
        },
      });

      return res.status(201).json({
        message: "RFQ created successfully",
        rfq,
      });
    } catch (error) {
      console.error("Create RFQ error:", error);

      return res.status(500).json({
        message: "Failed to create RFQ",
      });
    }
  }
);

/* =========================
   GET BUYER'S RFQs
   BUYER
========================= */

router.get(
  "/my",
  authenticate,
  authorize("BUYER"),
  async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          message: "Authentication required",
        });
      }

      const rfqs = await prisma.rFQ.findMany({
        where: {
          buyerId: req.user.userId,
        },
        include: {
          quotations: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return res.json({
        rfqs,
      });
    } catch (error) {
      console.error("Get RFQs error:", error);

      return res.status(500).json({
        message: "Failed to fetch RFQs",
      });
    }
  }
);

/* =========================
   GET AVAILABLE RFQs
   SUPPLIER
========================= */

router.get(
  "/",
  authenticate,
  authorize("SUPPLIER"),
  async (_req: AuthRequest, res) => {
    try {
      const rfqs = await prisma.rFQ.findMany({
        include: {
          buyer: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return res.json({
        rfqs,
      });
    } catch (error) {
      console.error("Get available RFQs error:", error);

      return res.status(500).json({
        message: "Failed to fetch available RFQs",
      });
    }
  }
);

/* =========================
   GET SUPPLIER'S PREVIOUS SUBMISSIONS
   SUPPLIER
========================= */

router.get(
  "/quotations/my",
  authenticate,
  authorize("SUPPLIER"),
  async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          message: "Authentication required",
        });
      }

      const quotations = await prisma.quotation.findMany({
        where: {
          supplierId: req.user.userId,
        },
        include: {
          rfq: {
            select: {
              id: true,
              productName: true,
              description: true,
              quantity: true,
              deliveryLocation: true,
              deadline: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return res.json({
        quotations,
      });
    } catch (error) {
      console.error(
        "Get supplier previous submissions error:",
        error
      );

      return res.status(500).json({
        message: "Failed to fetch previous submissions",
      });
    }
  }
);

/* =========================
   SUBMIT QUOTATION
   SUPPLIER
========================= */

router.post(
  "/:rfqId/quotations",
  authenticate,
  authorize("SUPPLIER"),
  async (req: AuthRequest, res) => {
    try {
      const rfqId = Number(req.params.rfqId);

      if (!Number.isInteger(rfqId) || rfqId <= 0) {
        return res.status(400).json({
          message: "Invalid RFQ ID",
        });
      }

      if (!req.user) {
        return res.status(401).json({
          message: "Authentication required",
        });
      }

      const quotationSchema = z.object({
        quotedPrice: z.number().positive(),
        deliveryTime: z.string().min(1),
        message: z.string().optional(),
      });

      const result = quotationSchema.safeParse(req.body);

      if (!result.success) {
        return res.status(400).json({
          message: "Invalid quotation data",
          errors: result.error.flatten(),
        });
      }

      const rfq = await prisma.rFQ.findUnique({
        where: {
          id: rfqId,
        },
      });

      if (!rfq) {
        return res.status(404).json({
          message: "RFQ not found",
        });
      }

      // Prevent duplicate quotation submissions
      const existingQuotation = await prisma.quotation.findFirst({
        where: {
          rfqId,
          supplierId: req.user.userId,
        },
      });

      if (existingQuotation) {
        return res.status(409).json({
          message:
            "You have already submitted a quotation for this RFQ",
        });
      }

      const quotation = await prisma.quotation.create({
        data: {
          quotedPrice: result.data.quotedPrice,
          deliveryTime: result.data.deliveryTime,
          message: result.data.message,
          rfqId,
          supplierId: req.user.userId,
        },
      });

      return res.status(201).json({
        message: "Quotation submitted successfully",
        quotation,
      });
    } catch (error) {
      console.error("Submit quotation error:", error);

      return res.status(500).json({
        message: "Failed to submit quotation",
      });
    }
  }
);

/* =========================
   GET QUOTATIONS FOR RFQ
   BUYER
========================= */

router.get(
  "/:rfqId/quotations",
  authenticate,
  authorize("BUYER"),
  async (req: AuthRequest, res) => {
    try {
      const rfqId = Number(req.params.rfqId);

      if (!Number.isInteger(rfqId) || rfqId <= 0) {
        return res.status(400).json({
          message: "Invalid RFQ ID",
        });
      }

      if (!req.user) {
        return res.status(401).json({
          message: "Authentication required",
        });
      }

      const rfq = await prisma.rFQ.findUnique({
        where: {
          id: rfqId,
        },
      });

      if (!rfq) {
        return res.status(404).json({
          message: "RFQ not found",
        });
      }

      if (rfq.buyerId !== req.user.userId) {
        return res.status(403).json({
          message: "You can only view quotations for your own RFQs",
        });
      }

      const quotations = await prisma.quotation.findMany({
        where: {
          rfqId,
        },
        include: {
          supplier: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return res.json({
        quotations,
      });
    } catch (error) {
      console.error("Get quotations error:", error);

      return res.status(500).json({
        message: "Failed to fetch quotations",
      });
    }
  }
);

/* =========================
   UPDATE RFQ
   BUYER
========================= */

router.put(
  "/:rfqId",
  authenticate,
  authorize("BUYER"),
  async (req: AuthRequest, res) => {
    try {
      const rfqId = Number(req.params.rfqId);

      if (!Number.isInteger(rfqId) || rfqId <= 0) {
        return res.status(400).json({
          message: "Invalid RFQ ID",
        });
      }

      if (!req.user) {
        return res.status(401).json({
          message: "Authentication required",
        });
      }

      const result = rfqSchema.safeParse(req.body);

      if (!result.success) {
        return res.status(400).json({
          message: "Invalid RFQ data",
          errors: result.error.flatten(),
        });
      }

      const existingRfq = await prisma.rFQ.findUnique({
        where: {
          id: rfqId,
        },
      });

      if (!existingRfq) {
        return res.status(404).json({
          message: "RFQ not found",
        });
      }

      if (existingRfq.buyerId !== req.user.userId) {
        return res.status(403).json({
          message: "You can only edit your own RFQs",
        });
      }

      const updatedRfq = await prisma.rFQ.update({
        where: {
          id: rfqId,
        },
        data: {
          productName: result.data.productName,
          description: result.data.description,
          quantity: result.data.quantity,
          deliveryLocation: result.data.deliveryLocation,
          deadline: new Date(result.data.deadline),
        },
      });

      return res.json({
        message: "RFQ updated successfully",
        rfq: updatedRfq,
      });
    } catch (error) {
      console.error("Update RFQ error:", error);

      return res.status(500).json({
        message: "Failed to update RFQ",
      });
    }
  }
);

/* =========================
   DELETE RFQ
   BUYER
========================= */

router.delete(
  "/:rfqId",
  authenticate,
  authorize("BUYER"),
  async (req: AuthRequest, res) => {
    try {
      const rfqId = Number(req.params.rfqId);

      if (!Number.isInteger(rfqId) || rfqId <= 0) {
        return res.status(400).json({
          message: "Invalid RFQ ID",
        });
      }

      if (!req.user) {
        return res.status(401).json({
          message: "Authentication required",
        });
      }

      const rfq = await prisma.rFQ.findUnique({
        where: {
          id: rfqId,
        },
      });

      if (!rfq) {
        return res.status(404).json({
          message: "RFQ not found",
        });
      }

      if (rfq.buyerId !== req.user.userId) {
        return res.status(403).json({
          message: "You can only delete your own RFQs",
        });
      }

      // Delete quotations first because they reference the RFQ
      await prisma.quotation.deleteMany({
        where: {
          rfqId,
        },
      });

      // Delete the RFQ
      await prisma.rFQ.delete({
        where: {
          id: rfqId,
        },
      });

      return res.json({
        message: "RFQ deleted successfully",
      });
    } catch (error) {
      console.error("Delete RFQ error:", error);

      return res.status(500).json({
        message: "Failed to delete RFQ",
      });
    }
  }
);

export default router;