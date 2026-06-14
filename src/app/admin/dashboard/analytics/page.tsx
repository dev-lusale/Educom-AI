import { Metadata } from "next";
import AdminAnalyticsClient from "./AdminAnalyticsClient";

export const metadata: Metadata = { title: "Analytics" };

export default function AdminAnalyticsPage() {
  return <AdminAnalyticsClient />;
}
