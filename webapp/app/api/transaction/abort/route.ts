// webapp/app/api/nodes/recover/route.ts

export async function POST(req: Request) {
  return new Response(
    JSON.stringify({ message: "Transaction abort placeholder" }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  );
}
