import { Metadata } from "next";
import AdminLogsClient from "./AdminLogsClient";

export const metadata: Metadata = { title: "Audit Logs" };

export default function AdminLogsPage() {
  return <AdminLogsClient />;
}
