import { Metadata } from "next";
import AdminOverviewClient from "./AdminOverviewClient";

export const metadata: Metadata = { title: "Overview" };

export default function AdminOverviewPage() {
  return <AdminOverviewClient />;
}
