// webapp/app/api/transaction/abort/route.ts

export async function POST(req: Request) {
  return new Response(
    JSON.stringify({ message: "Node abort endpoint placeholder" }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  );
}
