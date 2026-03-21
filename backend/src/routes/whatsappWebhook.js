import express from "express";
const router = express.Router();

// GET (for validation)
router.get("/", (req, res) => {
  res.status(200).send("Webhook working");
});

// POST (main logic)
router.post("/", (req, res) => {
  console.log("Webhook hit:", JSON.stringify(req.body, null, 2));
  res.sendStatus(200);
});

export default router;