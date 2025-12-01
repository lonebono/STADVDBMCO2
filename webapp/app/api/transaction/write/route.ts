// webapp/app/api/transaction/start/route.ts

export async function POST(req: Request) {
  return new Response(
    JSON.stringify({ message: "Node write endpoint placeholder" }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  );
}
