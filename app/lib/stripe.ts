import Stripe from "stripe";
import { loadStripe } from "@stripe/stripe-js";

// Initialize Stripe server-side
export const stripe = new Stripe(
  process.env.STRIPE_SECRET_KEY! ||
    "sk_test_51QunOZKD7xVMZWERM9NHtzmqQk3YON65xUmWdX0jNVKwjth7i3f6owyZOdTxZ13wbM6kYaFwML3SG746cMfCt2kv001zKM6gX4",
  {
    apiVersion: "2025-02-24.acacia",
  }
);

// Initialize Stripe client-side
export const getStripe = () => {
  return loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
};

// Helper to format price
export const formatPrice = (price: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(price / 100);
};

// Stripe product IDs for each plan
export const STRIPE_PLANS = {
  BASIC: process.env.STRIPE_BASIC_PLAN_ID!,
  PRO: process.env.STRIPE_PRO_PLAN_ID!,
  ENTERPRISE: process.env.STRIPE_ENTERPRISE_PLAN_ID!,
};

// Trial period in days
export const TRIAL_PERIOD_DAYS = 7;
