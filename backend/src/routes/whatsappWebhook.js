/**
 * WhatsApp Webhook Routes
 * 
 * This module handles WhatsApp webhook events for the Gupshup WhatsApp API.
 * It provides a conversational AI-powered chatbot for customers to:
 * - Browse product catalogs
 * - Track orders
 * - Get product recommendations
 * - Place orders (future)
 * 
 * Usage in server.js:
 * - Imported as whatsappRoutes
 * - Mounted at '/webhook/whatsapp' endpoint
 * - Receives POST requests from Gupshup webhook
 * 
 * Environment Variables Required:
 * - GUPSHUP_API: Gupshup API endpoint URL
 * - GUPSHUP_API_KEY: Gupshup API authentication key
 * 
 * Features:
 * - AI-powered message analysis (via ai.js)
 * - State-based conversation flow
 * - Party lookup by phone number
 * - Product search and catalog browsing
 * - Order tracking
 * - Image and text message sending
 */

import express from "express";
//import axios from "axios";
//import { analyzeMessage } from "../utils/ai.js";
//import { supabase } from "../config.js";
const router = express.Router();

/* ================================
   CONVERSATION STATE MANAGEMENT
   - userState: Tracks current conversation state for each user
   - userTemp: Stores temporary data during conversations
================================ */
/*const userState = new Map();
const userTemp = new Map();

/* ================================
   GUPSHUP API CONFIGURATION
   - GUPSHUP_API: WhatsApp API endpoint for sending messages
   - API_KEY: Authentication for Gupshup API
================================ */
/*const GUPSHUP_API = process.env.GUPSHUP_API;
const API_KEY = process.env.GUPSHUP_API_KEY;

/* ================================
   UTILITY FUNCTIONS
================================ */

/**
 * Send text message via WhatsApp API
 * @param {string} user - Phone number of recipient
 * @param {string} text - Message content
 */
/*async function sendMessage(user, text) {
  await axios.post(
    GUPSHUP_API,
    {
      channel: "whatsapp",
      destination: user,
      message: { text }
    },
    {
      headers: { apikey: API_KEY }
    }
  );
}

/**
 * Normalize Indian phone numbers to +91 format
 * @param {string} phone - Raw phone number
 * @returns {string|null} - Normalized phone number or null
 */
/*function normalizePhone(phone) {
  if (!phone) return null;

  phone = phone.replace(/\D/g, "");

  if (phone.startsWith("91")) {
    return "+" + phone;
  }

  return "+91" + phone;
}

/**
 * Find party by phone number and return party name
 * @param {string} phone - Normalized phone number
 * @returns {string|null} - Party name or null if not found
 */
/*async function findPartyByPhone(phone) {
  const { data, error } = await supabase
    .from("parties")
    .select("*")
    .eq("phone_number", phone)
    .single();

  return data?.name || null;
}

/**
 * Send image message via WhatsApp API
 * @param {string} user - Phone number of recipient
 * @param {string} url - Image URL
 */
/*async function sendImage(user, url) {
  await axios.post(
    GUPSHUP_API,
    {
      channel: "whatsapp",
      destination: user,
      message: {
        type: "image",
        originalUrl: url,
        previewUrl: url
      }
    },
    {
      headers: { apikey: API_KEY }
    }
  );
}

/* ================================
   MOCK DATABASE FUNCTIONS
   TODO: Replace with actual Supabase queries
================================ */

/**
 * Mock product search - replace with actual database query
 * @param {Object} filters - Search filters (category, color, fabric)
 * @returns {Array} - Array of mock products
 */
/*async function searchProducts(filters) {
  // TODO: Replace with Supabase query
  return [
    {
      name: "White Cotton Kurta",
      price: 999,
      code: "K101",
      image: "https://via.placeholder.com/300"
    }
  ];
}

/**
 * Mock order lookup - replace with actual database query
 * @param {string} orderId - Order ID
 * @returns {Object} - Mock order status
 */
/*async function findOrder(orderId) {
  return { status: "Shipped 🚚" };
}

/* ================================
   CONVERSATION HANDLERS
================================ */

/**
 * Send main menu to user
 * @param {string} user - Phone number of user
 */
/*async function sendMenu(user) {
  userState.set(user, "menu");

  return sendMessage(
    user,
    `Welcome ${user}👋

1. View Catalog
2. Track Order

Or type what you need 🙂`
  );
}

/**
 * Handle menu selection
 * @param {string} message - User message
 * @param {string} user - Phone number of user
 */
/*async function handleMenu(message, user) {
  if (message === "1") {
    userState.set(user, "awaiting_category");
    return sendMessage(user, "Select category:\n1. Kurta\n2. Pajama");
  }

  if (message === "2") {
    userState.set(user, "awaiting_order_id");
    return sendMessage(user, "Enter your Order ID");
  }

  return sendMenu(user);
}

/* -------- Catalog Flow Handlers -------- */

/**
 * Handle category selection (1: Kurta, 2: Pajama)
 * @param {string} message - User message
 * @param {string} user - Phone number of user
 */
/*async function handleCategory(message, user) {
  const category = message === "1" ? "kurta" : "pajama";

  userTemp.set(user, { category });
  userState.set(user, "awaiting_color");

  return sendMessage(user, "Select color:\n1. White\n2. Black\n3. Blue");
}

/**
 * Handle color selection (1: White, 2: Black, 3: Blue)
 * @param {string} message - User message
 * @param {string} user - Phone number of user
 */
/*async function handleColor(message, user) {
  const colors = ["white", "black", "blue"];
  const color = colors[parseInt(message) - 1];

  const temp = userTemp.get(user) || {};
  temp.color = color;

  userTemp.set(user, temp);
  userState.set(user, "awaiting_fabric");

  return sendMessage(user, "Select fabric:\n1. Cotton\n2. Silk");
}

/**
 * Handle fabric selection and display products
 * @param {string} message - User message
 * @param {string} user - Phone number of user
 */
/*async function handleFabric(message, user) {
  const fabric = message === "1" ? "cotton" : "silk";

  const filters = userTemp.get(user) || {};
  filters.fabric = fabric;

  const products = await searchProducts(filters);

  for (const p of products) {
    await sendMessage(
      user,
      `${p.name}\n₹${p.price}\nCode: ${p.code}`
    );
    await sendImage(user, p.image);
  }

  await sendMessage(user, "Reply with product code + quantity (e.g. K101 5 pcs)");

  userState.delete(user);
  userTemp.delete(user);
}

/* -------- Order Tracking Handler -------- */

/**
 * Handle order tracking by order ID
 * @param {string} message - User message (order ID)
 * @param {string} user - Phone number of user
 */
/*async function handleOrderTracking(message, user) {
  const order = await findOrder(message);

  if (!order) {
    return sendMessage(user, "Order not found");
  }

  await sendMessage(user, `Status: ${order.status}`);

  userState.delete(user);
}

/* -------- AI-Powered Handlers -------- */

/**
 * Handle AI-based product search
 * @param {string} user - Phone number of user
 * @param {Object} filters - AI-extracted search filters
 */
/*async function handleAISearch(user, filters) {
  const products = await searchProducts(filters);

  for (const p of products) {
    await sendMessage(
      user,
      `${p.name}\n₹${p.price}\nCode: ${p.code}`
    );
    await sendImage(user, p.image);
  }

  await sendMessage(user, "Reply with product code + quantity");
}

/**
 * Handle AI-based order creation
 * @param {string} user - Phone number of user
 * @param {Object} data - AI-extracted order data
 */
/*async function handleAIOrder(user, data) {
  // TODO: validate product + stock

  return sendMessage(
    user,
    `Order placed: ${data.product_code} x ${data.quantity}`
  );
}

/* ================================
   MAIN MESSAGE HANDLER (HYBRID AI + STATE)
================================ */

/**
 * Main message handler with hybrid AI + state-based logic
 * @param {string} message - User message
 * @param {string} user - Phone number of user
 * @param {string} party - Party name (optional)
 */
/*async function handleMessage(message, user, party) {
  const msg = message.toLowerCase();
 
 
  if (msg === "hi" || msg === "menu" || msg === "hello") {
    return sendMenu(user);
  }

 
  if (msg === "1" || msg === "2") {
    return handleMenu(msg, user);
  }

 
  const ai = await analyzeMessage(message);

  if (ai.intent === "search_products") {
    return handleAISearch(user, ai.data);
  }

  if (ai.intent === "create_order") {
    return handleAIOrder(user, ai.data);
  }


  const state = userState.get(user);

  switch (state) {
    case "menu":
      return handleMenu(msg, user);

    case "awaiting_category":
      return handleCategory(msg, user);

    case "awaiting_color":
      return handleColor(msg, user);

    case "awaiting_fabric":
      return handleFabric(msg, user);

    case "awaiting_order_id":
      return handleOrderTracking(message, user);

    default:
      return sendMenu(user);
  }
}

/* ================================
   WEBHOOK ENDPOINTS
================================ */

/**
 * POST /webhook/whatsapp - Main webhook endpoint
 * Receives WhatsApp messages from Gupshup API
 */
router.post("/", async (req, res) => {
/*  try {
    // Extract message and user from various Gupshup payload formats
    const message =
      req.body?.payload?.payload?.text ||
      req.body?.message?.text ||
      "";

    const user =
      req.body?.payload?.sender?.phone ||
      req.body?.sender?.phone;

    if (!message || !user) return res.sendStatus(200);
    
    // Normalize phone number and find party
    user = normalizePhone(user);
    const party = await findPartyByPhone(user);
    
    // Handle message with party context
    await handleMessage(message, user, party);

    res.sendStatus(200);
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }*/
});

/**
 * GET /webhook/whatsapp - Health check endpoint
 * Used to verify webhook is running
 */
router.get("/", (req, res) => {
  res.send("Webhook running");
});

export default router;