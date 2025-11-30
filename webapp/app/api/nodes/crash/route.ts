// webapp/app/api/nodes/crash/route.ts

export async function POST(req: Request) {
  return new Response(
    JSON.stringify({ message: "Node crash endpoint placeholder" }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  );
}
