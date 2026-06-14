import { Metadata } from "next";
import AdminLoginClient from "./AdminLoginClient";

export const metadata: Metadata = { title: "Admin Login" };

export default function AdminLoginPage() {
  return <AdminLoginClient />;
}
