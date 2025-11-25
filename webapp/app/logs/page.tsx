import Sidebar from "@/components/Sidebar";

export default function Logs() {
  return (
    <>
      <Sidebar />
      <main className="flex-1 p-6">
        <h1 className="text-3xl font-bold">System Logs</h1>
        <p className="mt-4 text-gray-600">
          Logs from all nodes will be displayed here.
        </p>
      </main>
    </>
  );
}
