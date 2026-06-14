import { Metadata } from "next";
import AdminTransactionsClient from "./AdminTransactionsClient";

export const metadata: Metadata = { title: "Transactions" };

export default function AdminTransactionsPage() {
  return <AdminTransactionsClient />;
}
