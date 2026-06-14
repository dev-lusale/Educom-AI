import { Metadata } from "next";
import AdminUsersClient from "./AdminUsersClient";

export const metadata: Metadata = { title: "Users" };

export default function AdminUsersPage() {
  return <AdminUsersClient />;
}
