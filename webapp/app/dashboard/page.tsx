import Sidebar from "@/components/Sidebar";
import TransactionForm from "@/components/TransactionForm";
import LogConsole from "@/components/LogConsole";

export default function Dashboard() {
  return (
    <>
      <Sidebar />

      <main className="flex-1 p-6 flex flex-col gap-6">
        <h1 className="text-3xl font-bold">Transaction Dashboard</h1>

        <TransactionForm />

        <div className="flex-1">
          <LogConsole />
        </div>
      </main>
    </>
  );
}
