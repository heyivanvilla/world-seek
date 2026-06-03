"use client";

import { useParams } from "next/navigation";
import GameRoom from "@/components/GameRoom";

export default function GamePage() {
  const params = useParams();
  const code = decodeURIComponent(String(params.code ?? ""));
  return <GameRoom code={code} />;
}
