import { NextResponse } from "next/server";
import { getStockDashboard } from "@/lib/dashboard";
import { StockNotFoundError } from "@/lib/resolve-stock";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ ticker: string }> }
) {
  try {
    const { ticker } = await params;
    const { searchParams } = new URL(request.url);
    const forceRefresh = searchParams.get("refresh") === "true";
    const payload = await getStockDashboard(ticker, { forceRefresh });

    return NextResponse.json(payload);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Something went wrong while loading this stock.";
    const status = error instanceof StockNotFoundError ? 404 : message.includes("valid US stock ticker") ? 400 : 500;

    return NextResponse.json(
      {
        error: message
      },
      { status }
    );
  }
}
